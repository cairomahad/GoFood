/**
 * GoFoods — основной сервер
 * 
 * Объединяет:
 * - Telegram бот (покупатели)
 * - Telegram бот (повара)
 * - Uber Direct webhook
 * - API эндпоинты
 */

require('dotenv').config()
const express = require('express')
const TelegramBot = require('node-telegram-bot-api')
const { supabase } = require('./config/supabase')
const { createDelivery, handleUberWebhook } = require('./deliveryFlow')
const { sendOrderUpdate } = require('./sendTelegramMessage')

const app = express()
app.use(express.json())

// ─── Telegram боты ───────────────────────────────────────────────────────────

// Бот для покупателей
const customerBot = new TelegramBot(process.env.BOT_TOKEN, { polling: true })

// Бот для поваров
const cookBot = new TelegramBot(process.env.COOK_BOT_TOKEN, { polling: true })

// ─── БОТ ПОКУПАТЕЛЕЙ ─────────────────────────────────────────────────────────

customerBot.onText(/\/start/, (msg) => {
  customerBot.sendMessage(msg.chat.id, 
    '🍕 <b>Добро пожаловать в GoFoods!</b>\n\n' +
    'Здесь ты можешь заказать домашнюю еду от соседей.\n\n' +
    'Нажми кнопку ниже чтобы открыть меню 👇',
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { 
            text: '🍽️ Открыть GoFoods', 
            web_app: { url: process.env.MINI_APP_URL } 
          }
        ]]
      }
    }
  )
})

// Получить данные заказа из Mini App
customerBot.on('web_app_data', async (msg) => {
  try {
    const orderData = JSON.parse(msg.web_app_data.data)
    
    // Создать заказ в Supabase
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        ...orderData,
        telegram_id: String(msg.from.id),
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    // Подтверждение покупателю
    customerBot.sendMessage(
      msg.chat.id,
      `✅ <b>Заказ #${order.id.slice(0, 8)} оформлен!</b>\n\n` +
      `Ожидаем подтверждения повара...`,
      { parse_mode: 'HTML' }
    )

    // Уведомление повару
    await notifyCook(order)

  } catch (err) {
    console.error('[CustomerBot] Ошибка создания заказа:', err)
    customerBot.sendMessage(msg.chat.id, '❌ Не удалось создать заказ. Попробуй позже.')
  }
})

// ─── БОТ ДЛЯ ПОВАРОВ ─────────────────────────────────────────────────────────

cookBot.onText(/\/start/, (msg) => {
  cookBot.sendMessage(msg.chat.id,
    '👨‍🍳 <b>GoFoods — Панель повара</b>\n\n' +
    'Тебе будут приходить уведомления о новых заказах.\n\n' +
    'Привяжи свой аккаунт к Telegram ID:\n' +
    `/link ${msg.from.id}`,
    { parse_mode: 'HTML' }
  )
})

// Отправка заказа повару
async function notifyCook(order) {
  const { data: cook } = await supabase
    .from('users')
    .select('*')
    .eq('id', order.cook_id)
    .single()
  
  if (!cook || !cook.telegram_id) {
    console.warn(`[Cook] У повара ${cook?.display_name || order.cook_id} нет Telegram ID`)
    return
  }

  const itemsList = order.items.map(item => 
    `  • ${item.quantity}x ${item.name} ($${item.price})`
  ).join('\n')

  cookBot.sendMessage(
    cook.telegram_id,
    `🔔 <b>НОВЫЙ ЗАКАЗ #${order.id.slice(0, 8)}</b>\n\n` +
    `<b>Заказ:</b>\n${itemsList}\n\n` +
    `<b>Покупатель:</b> ${order.customer_name || 'Аноним'}\n` +
    `<b>Адрес доставки:</b> ${order.delivery_address}\n\n` +
    `💰 <b>Твой заработок:</b> $${order.cook_earnings || order.total_price * 0.8}`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Принять', callback_data: `accept:${order.id}` },
          { text: '❌ Отказать', callback_data: `reject:${order.id}` }
        ]]
      }
    }
  )
}

// Обработка кнопок повара
cookBot.on('callback_query', async (query) => {
  const [action, orderId] = query.data.split(':')

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (error) throw error

    if (action === 'accept') {
      // Повар принял
      await supabase
        .from('orders')
        .update({
          status: 'cooking',
          accepted_at: new Date().toISOString()
        })
        .eq('id', orderId)

      cookBot.answerCallbackQuery(query.id, { text: '✅ Заказ принят!' })
      cookBot.editMessageReplyMarkup(
        { inline_keyboard: [[{ text: '🍳 Готовится...', callback_data: 'noop' }]] },
        { chat_id: query.message.chat.id, message_id: query.message.message_id }
      )

      // Уведомить покупателя
      await sendOrderUpdate(order.telegram_id, { ...order, status: 'cooking' })

      // Создать доставку в Uber
      const delivery = await createDelivery(order)
      
      // Отправить ссылку на отслеживание
      customerBot.sendMessage(
        order.telegram_id,
        `🏍️ <b>Курьер назначен!</b>\n\nОтслеживай доставку в реальном времени:`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { text: '🗺️ Открыть карту', url: delivery.trackingUrl }
            ]]
          }
        }
      )

    } else if (action === 'reject') {
      // Повар отказался
      await supabase
        .from('orders')
        .update({ status: 'rejected' })
        .eq('id', orderId)

      cookBot.answerCallbackQuery(query.id, { text: '❌ Заказ отклонён' })

      // Попытаться найти другого повара
      // TODO: findAlternativeCook()

      // Пока что просто уведомляем покупателя
      customerBot.sendMessage(
        order.telegram_id,
        '😔 К сожалению, повар не может принять заказ.\n\n' +
        'Деньги вернутся в течение 3-5 дней.'
      )
    }

  } catch (err) {
    console.error('[CookBot] Ошибка обработки:', err)
    cookBot.answerCallbackQuery(query.id, { text: '⚠️ Произошла ошибка' })
  }
})

// ─── UBER WEBHOOK ────────────────────────────────────────────────────────────

app.post('/webhook/uber', handleUberWebhook)

// Проверка что webhook работает (для настройки в Uber Dashboard)
app.get('/webhook/uber', (req, res) => {
  res.send('GoFoods Uber Webhook is running ✅')
})

// ─── API ЭНДПОИНТЫ (опционально) ─────────────────────────────────────────────

// Получить статус заказа
app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', req.params.orderId)
      .single()

    if (error) throw error
    res.json(order)
  } catch (err) {
    res.status(404).json({ error: 'Заказ не найден' })
  }
})

// ─── ЗАПУСК ──────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`✅ GoFoods сервер запущен на порту ${PORT}`)
  console.log(`📱 Customer Bot: @${customerBot.options.username || 'активен'}`)
  console.log(`👨‍🍳 Cook Bot: @${cookBot.options.username || 'активен'}`)
  console.log(`🚗 Uber Webhook: http://localhost:${PORT}/webhook/uber`)
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Остановка сервера...')
  customerBot.stopPolling()
  cookBot.stopPolling()
  process.exit(0)
})
