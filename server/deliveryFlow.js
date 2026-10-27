/**
 * GoFoods — полный процесс доставки через Uber Direct
 * 
 * Запускается когда повар принимает заказ
 */

const axios = require('axios')
const { supabase } = require('./config/supabase')

// ─── Uber Direct Token ───────────────────────────────────────────────────────

let cachedToken = null
let tokenExpiry = 0

async function getUberToken() {
  // Если токен ещё не истёк — используем кешированный
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken
  }

  const res = await axios.post('https://auth.uber.com/oauth/v2/token', 
    new URLSearchParams({
      client_id: process.env.UBER_CLIENT_ID,
      client_secret: process.env.UBER_CLIENT_SECRET,
      grant_type: 'client_credentials',
      scope: 'eats.deliveries'
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )

  cachedToken = res.data.access_token
  tokenExpiry = Date.now() + (res.data.expires_in * 1000) - 60000 // -1 минута запас
  return cachedToken
}

// ─── Создание доставки ───────────────────────────────────────────────────────

/**
 * Главная функция — создаёт заявку на доставку в Uber
 * 
 * @param {object} order - заказ из Supabase
 * @returns {object} { deliveryId, trackingUrl, courier }
 */
async function createDelivery(order) {
  const token = await getUberToken()

  // Получаем данные повара и покупателя из Supabase
  const { data: cook } = await supabase
    .from('users')
    .select('*')
    .eq('id', order.cook_id)
    .single()

  const { data: customer } = await supabase
    .from('users')
    .select('*')
    .eq('id', order.customer_id)
    .single()

  // Описание содержимого заказа
  const itemsList = order.items.map(item => 
    `${item.quantity}x ${item.name}`
  ).join(', ')

  // Создаём заявку в Uber Direct
  const delivery = await axios.post(
    `https://api.uber.com/v1/customers/${process.env.UBER_CUSTOMER_ID}/deliveries`,
    {
      // 📍 ТОЧКА A — адрес повара (откуда забрать)
      pickup: {
        name: cook.display_name,
        address: cook.address,
        phone_number: cook.phone,
        location: {
          latitude: cook.location?.coordinates[1],
          longitude: cook.location?.coordinates[0]
        },
        notes: `Заказ #${order.id.slice(0, 8)}. Звонить в домофон перед подъездом`
      },

      // 📍 ТОЧКА Б — адрес покупателя (куда доставить)
      dropoff: {
        name: customer.display_name,
        address: order.delivery_address,
        phone_number: customer.phone || order.delivery_phone,
        location: {
          latitude: order.delivery_coords?.coordinates[1],
          longitude: order.delivery_coords?.coordinates[0]
        },
        notes: order.delivery_notes || 'Оставить у двери'
      },

      // 📦 Информация о заказе
      manifest: {
        description: itemsList,
        total_value: Math.round(order.total_price * 100) // в центах
      },

      // 💰 Кто оплачивает доставку
      dropoff_verification: {
        signature_required: false,
        picture_required: false
      },

      // 📞 Разрешить курьеру звонить
      undeliverable_action: 'return', // вернуть повару если не доставлено

      // 🔗 External ID для связи с нашей базой
      external_id: order.id
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  )

  const result = {
    deliveryId: delivery.data.id,
    trackingUrl: delivery.data.tracking_url,
    status: delivery.data.status,
    courier: delivery.data.courier || null,
    fee: delivery.data.fee / 100 // стоимость доставки в долларах
  }

  // Сохраняем данные доставки в заказ
  await supabase
    .from('orders')
    .update({
      uber_delivery_id: result.deliveryId,
      uber_tracking_url: result.trackingUrl,
      delivery_fee: result.fee,
      status: 'courier_assigned'
    })
    .eq('id', order.id)

  console.log(`[Uber] Доставка создана: ${result.deliveryId}`)
  console.log(`[Uber] Отслеживание: ${result.trackingUrl}`)

  return result
}

// ─── Получить статус доставки ────────────────────────────────────────────────

async function getDeliveryStatus(deliveryId) {
  const token = await getUberToken()

  const res = await axios.get(
    `https://api.uber.com/v1/customers/${process.env.UBER_CUSTOMER_ID}/deliveries/${deliveryId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  return {
    status: res.data.status,
    courier: res.data.courier,
    pickup_eta: res.data.pickup_eta, // когда курьер приедет к повару
    dropoff_eta: res.data.dropoff_eta, // когда доставит покупателю
    trackingUrl: res.data.tracking_url
  }
}

// ─── Отменить доставку ───────────────────────────────────────────────────────

async function cancelDelivery(deliveryId) {
  const token = await getUberToken()

  await axios.post(
    `https://api.uber.com/v1/customers/${process.env.UBER_CUSTOMER_ID}/deliveries/${deliveryId}/cancel`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  )

  console.log(`[Uber] Доставка ${deliveryId} отменена`)
}

// ─── Webhook обработчик (получает события от Uber) ───────────────────────────

/**
 * Uber шлёт POST запросы на этот URL при изменении статуса доставки
 * 
 * Настроить в Uber Dashboard:
 * Settings → Webhooks → https://yourserver.com/webhook/uber
 */
async function handleUberWebhook(req, res) {
  const { event_type, meta, resource_href } = req.body

  console.log(`[Uber Webhook] ${event_type}`, meta)

  // Найти заказ по external_id
  const orderId = meta.external_id
  
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    console.error('[Uber Webhook] Заказ не найден:', orderId)
    return res.status(404).send('Order not found')
  }

  const { sendToUser } = require('./sendTelegramMessage')

  switch (event_type) {
    case 'delivery.status_changed':
      // Общее изменение статуса
      await supabase
        .from('orders')
        .update({ uber_status: meta.status })
        .eq('id', orderId)
      break

    case 'delivery.courier_update':
      // Курьер назначен / едет к повару
      await sendToUser(
        order.telegram_id,
        `🏍️ <b>Курьер едет к повару!</b>\n\nИмя: ${meta.courier?.name}\nАвто: ${meta.courier?.vehicle_type}\n\nПримерное время прибытия к тебе: ${meta.dropoff_eta || '30 мин'}`
      )
      break

    case 'delivery.pickup_complete':
      // Курьер забрал заказ у повара
      await supabase
        .from('orders')
        .update({ status: 'in_delivery' })
        .eq('id', orderId)
      
      await sendToUser(
        order.telegram_id,
        `📦 <b>Курьер забрал заказ!</b>\n\nЕдет к тебе. Жди через ${meta.dropoff_eta || '20 мин'}`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: '🗺️ Отследить на карте', url: order.uber_tracking_url }
            ]]
          }
        }
      )
      break

    case 'delivery.dropoff_complete':
      // Доставлено!
      await supabase
        .from('orders')
        .update({ 
          status: 'delivered', 
          delivered_at: new Date().toISOString() 
        })
        .eq('id', orderId)

      await sendToUser(
        order.telegram_id,
        `🎉 <b>Заказ доставлен!</b>\n\nПриятного аппетита! ❤️\n\nОставь отзыв повару 👇`,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: '⭐ Оставить отзыв', callback_data: `review:${orderId}` }
            ]]
          }
        }
      )
      break

    case 'delivery.cancelled':
      // Доставка отменена
      await supabase
        .from('orders')
        .update({ status: 'delivery_cancelled' })
        .eq('id', orderId)

      await sendToUser(
        order.telegram_id,
        `❌ Доставка отменена\n\nПричина: ${meta.cancellation_reason}\n\nСвяжись с поддержкой для возврата денег.`
      )
      break

    case 'delivery.returned':
      // Курьер не смог доставить и вернул повару
      await sendToUser(
        order.telegram_id,
        `⚠️ Не удалось доставить заказ\n\nКурьер вернул его повару. Проверь правильность адреса.`
      )
      break
  }

  res.status(200).send('OK')
}

module.exports = {
  createDelivery,
  getDeliveryStatus,
  cancelDelivery,
  handleUberWebhook
}
