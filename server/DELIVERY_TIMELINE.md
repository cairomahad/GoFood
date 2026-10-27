# ⏱️ Хронология доставки — от заказа до получения

```
ВРЕМЯ    ДЕЙСТВИЕ                          КТО ДЕЛАЕТ           УВЕДОМЛЕНИЕ
─────────────────────────────────────────────────────────────────────────────

15:30    🛒 Заказ оформлен                 Покупатель           —
         (добавил в корзину, указал адрес,
          оплатил)
         ↓
         Appwrite: создаёт документ order
         status = "pending"

15:31    📨 Уведомление повару             Бот                  🤖 → 👨‍🍳 ПОВАР
         "Новый заказ #1234"                                    "Новый заказ!
         [✅ Принять] [❌ Отказать]                              [Принять/Отказать]"

15:32    ✅ Повар принял заказ              Повар (кнопка)       —
         ↓
         Appwrite: status = "cooking"
         ↓
         Сервер вызывает Uber API:
         createDelivery()

15:33    🚗 Uber назначает курьера          Uber                 🤖 → 👤 ПОКУПАТЕЛЬ
         ↓                                                       "Курьер едет к повару!
         webhook: courier_assigned                               Иван, Toyota Camry"
         ↓
         Appwrite: uberDeliveryId сохранён
                   status = "courier_assigned"

15:40    🏠 Курьер приехал к повару         Курьер               🤖 → 👨‍🍳 ПОВАР
         ↓                                                       "Курьер у подъезда"
         webhook: courier_arrived_at_pickup

15:42    📦 Курьер забрал заказ             Курьер               🤖 → 👤 ПОКУПАТЕЛЬ
         ↓                                   (в приложении)      "Курьер везёт заказ!
         webhook: pickup_complete                                🗺️ [Отследить]"
         ↓
         Appwrite: status = "in_delivery"

15:55    🚗 Курьер едет к покупателю        —                    (карта обновляется
         (в пути)                                                в режиме реального
                                                                 времени по ссылке)

16:05    🏁 Курьер у дома покупателя        Курьер               🤖 → 👤 ПОКУПАТЕЛЬ
         ↓                                                       "Курьер приехал!"
         webhook: courier_arrived_at_dropoff

16:06    ✅ Доставлено!                     Курьер               🤖 → 👤 ПОКУПАТЕЛЬ
         Покупатель получил заказ           (подтверждает        "🎉 Доставлено!
         ↓                                   в приложении)       Приятного аппетита!"
         webhook: dropoff_complete                               + кнопка отзыва
         ↓
         Appwrite: status = "delivered"
                   deliveredAt = timestamp

16:07    💰 Деньги переведены повару        Система              🤖 → 👨‍🍳 ПОВАР
                                                                 "Заказ #1234 завершён
                                                                  💵 +$18.50"
```

---

## 🔴 Возможные проблемы и как их решать

### 1️⃣ Повар отказался принять заказ

```
15:31  Уведомление повару
15:33  ❌ Повар нажал "Отказать"
       ↓
       Система ищет другого повара того же блюда
       ↓
       Если есть → отправляет ему
       Если нет → возврат денег покупателю
```

**Код:**
```js
async function handleCookReject(orderId) {
  // Найти других поваров этого же блюда
  const alternativeCooks = await findAlternativeCooks(order.items)
  
  if (alternativeCooks.length > 0) {
    await sendOrderToNextCook(orderId, alternativeCooks[0])
  } else {
    await refundOrder(orderId)
    await notifyCustomer(order.telegramId, 'К сожалению, заказ недоступен. Деньги вернутся в течение 3-5 дней.')
  }
}
```

---

### 2️⃣ Курьер не может найти адрес

```
16:00  webhook: delivery_issue
       reason: "address_not_found"
       ↓
       Бот пишет покупателю:
       "Курьер не может найти адрес. Позвони ему: +79991234567"
       ↓
       Если не решилось → возврат к повару
       webhook: delivery_returned
```

---

### 3️⃣ Покупатель отменяет заказ

```
Если status = "pending" или "cooking"
  ↓ отменить можно бесплатно
  
Если status = "courier_assigned"
  ↓ курьер уже едет — штраф $2
  
Если status = "in_delivery"
  ↓ отменить нельзя (курьер уже забрал еду)
```

**Код:**
```js
async function cancelOrder(orderId) {
  const order = await getOrder(orderId)
  
  if (order.status === 'in_delivery') {
    throw new Error('Заказ уже в пути, отменить нельзя')
  }
  
  if (order.uberDeliveryId) {
    await cancelDelivery(order.uberDeliveryId)
  }
  
  const refundAmount = order.status === 'courier_assigned' 
    ? order.totalPrice - 2.00  // минус штраф
    : order.totalPrice
    
  await refundPayment(order.paymentId, refundAmount)
}
```

---

## 📊 Метрики для отслеживания

**Dashboard для поваров:**
- Среднее время приготовления
- Процент принятых/отклонённых заказов
- Рейтинг от покупателей
- Заработок за день/неделю/месяц

**Dashboard для покупателей:**
- История заказов
- Любимые повара
- Потраченная сумма

**Admin панель:**
- Активные заказы (в реальном времени)
- Проблемные доставки (задержки, отмены)
- Выручка платформы
- Статистика Uber (сколько доставок, средняя стоимость)
