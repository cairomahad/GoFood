/**
 * GoFoods — утилита для отправки сообщений пользователям через Telegram
 *
 * Использование:
 *   const { sendToUser, sendToAll, sendOrderUpdate } = require('./sendTelegramMessage')
 */

const axios = require('axios')

const BOT_TOKEN = process.env.BOT_TOKEN
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`

// ─── Базовая отправка ────────────────────────────────────────────────────────

/**
 * Отправить сообщение одному пользователю по его Telegram ID
 * @param {string|number} telegramId  - chat_id пользователя
 * @param {string}        text        - текст сообщения (поддерживает HTML)
 * @param {object}        extra       - доп. параметры (кнопки, фото и т.д.)
 */
async function sendToUser(telegramId, text, extra = {}) {
  try {
    const res = await axios.post(`${TG_API}/sendMessage`, {
      chat_id: telegramId,
      text,
      parse_mode: 'HTML',
      ...extra
    })
    return res.data
  } catch (err) {
    const code = err.response?.data?.error_code
    // 403 = пользователь заблокировал бота
    if (code === 403) {
      console.warn(`[TG] Пользователь ${telegramId} заблокировал бота`)
      return null
    }
    console.error(`[TG] Ошибка отправки пользователю ${telegramId}:`, err.response?.data)
    throw err
  }
}

// ─── Шаблоны уведомлений ─────────────────────────────────────────────────────

/**
 * Уведомление о статусе заказа
 * @param {string|number} telegramId
 * @param {object} order  - { id, items, totalPrice, status }
 */
async function sendOrderUpdate(telegramId, order) {
  const statusMessages = {
    confirmed: `✅ <b>Заказ #${order.id} подтверждён!</b>\n\nПовар начинает готовить 👨‍🍳`,
    cooking:   `🍳 <b>Заказ #${order.id} готовится</b>\n\nСкоро будет готово!`,
    courier_assigned: `🏍️ <b>Курьер едет к повару</b>\n\nПримерное время доставки: 30 мин`,
    food_picked_up:   `📦 <b>Курьер забрал заказ</b>\n\nЕдет к тебе!`,
    delivered: `🎉 <b>Заказ доставлен!</b>\n\nПриятного аппетита! Оставь отзыв 👇`,
    cancelled: `❌ <b>Заказ #${order.id} отменён</b>\n\nПричина: ${order.cancelReason || 'не указана'}`
  }

  const text = statusMessages[order.status] || `📋 Статус заказа #${order.id}: ${order.status}`
  return sendToUser(telegramId, text)
}

/**
 * Отправить ссылку на отслеживание Uber
 */
async function sendTrackingLink(telegramId, trackingUrl) {
  return sendToUser(
    telegramId,
    `📍 <b>Отслеживай доставку в реальном времени:</b>`,
    {
      reply_markup: {
        inline_keyboard: [[
          { text: '🗺️ Открыть карту доставки', url: trackingUrl }
        ]]
      }
    }
  )
}

/**
 * Маркетинговое / промо сообщение
 */
async function sendPromo(telegramId, promoText, appUrl) {
  return sendToUser(
    telegramId,
    promoText,
    {
      reply_markup: {
        inline_keyboard: [[
          { text: '🍕 Открыть GoFoods', web_app: { url: appUrl } }
        ]]
      }
    }
  )
}

// ─── Массовая рассылка ────────────────────────────────────────────────────────

/**
 * Отправить сообщение списку пользователей
 *
 * @param {Array<string|number>} telegramIds - массив Telegram ID
 * @param {string}               text
 * @param {object}               extra
 * @param {number}               delayMs - задержка между сообщениями (мс),
 *                                         чтобы не получить flood-limit
 */
async function sendToMany(telegramIds, text, extra = {}, delayMs = 50) {
  const results = { sent: 0, failed: 0, blocked: 0 }

  for (const id of telegramIds) {
    try {
      const result = await sendToUser(id, text, extra)
      if (result === null) {
        results.blocked++
      } else {
        results.sent++
      }
    } catch {
      results.failed++
    }

    // Telegram разрешает ~30 сообщений/сек
    if (delayMs > 0) await sleep(delayMs)
  }

  console.log(`[TG] Рассылка завершена:`, results)
  return results
}

// ─── Пример: достать все TG ID из Supabase и разослать ──────────────────────
// Этот код запускается как скрипт: node sendTelegramMessage.js

async function broadcastToAllUsers(text) {
  const { supabase } = require('./config/supabase')

  // Получаем всех пользователей у которых есть telegram_id и они согласны на уведомления
  let offset = 0
  const limit = 100
  const allIds = []

  while (true) {
    const { data: users, error } = await supabase
      .from('users')
      .select('telegram_id')
      .not('telegram_id', 'is', null)
      .eq('telegram_notify', true)
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[Supabase] Ошибка получения пользователей:', error)
      break
    }

    const ids = users.map(u => u.telegram_id)
    allIds.push(...ids)

    if (users.length < limit) break
    offset += limit
  }

  console.log(`[TG] Найдено ${allIds.length} пользователей с Telegram ID`)
  return sendToMany(allIds, text)
}

// ─── Вспомогательное ─────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

module.exports = {
  sendToUser,
  sendOrderUpdate,
  sendTrackingLink,
  sendPromo,
  sendToMany,
  broadcastToAllUsers
}

// ─── Запуск как скрипт ────────────────────────────────────────────────────────
// node sendTelegramMessage.js
// Раскомментируй нужный пример:

// broadcastToAllUsers('🍕 Новые блюда уже в GoFoods! Загляни сегодня 👇')
//   .then(console.log)
//   .catch(console.error)
