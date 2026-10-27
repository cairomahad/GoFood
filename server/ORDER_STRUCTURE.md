# Структура заказа в Appwrite — коллекция "orders"

## Атрибуты коллекции

```js
{
  // Основная информация
  "$id": "order_123456",
  "customerId": "user_789",      // кто заказал
  "cookId": "user_456",          // кто готовит
  "telegramId": "123456789",     // TG ID покупателя
  
  // Заказанные блюда
  "items": [
    {
      "foodId": "food_111",
      "name": "Плов с бараниной",
      "quantity": 2,
      "price": 8.50
    },
    {
      "foodId": "food_222",
      "name": "Самса",
      "quantity": 3,
      "price": 2.00
    }
  ],
  
  // Стоимость
  "totalPrice": 23.00,
  "deliveryFee": 4.50,           // сколько взял Uber
  "cookEarnings": 18.50,         // сколько получит повар (totalPrice - комиссия)
  
  // ────────────────────────────────────────────────────────
  // АДРЕСА — самое важное для доставки!
  // ────────────────────────────────────────────────────────
  
  // Откуда забрать (адрес повара берётся из его профиля автоматически)
  // НЕ НУЖНО хранить тут — берём из users[cookId].address
  
  // Куда доставить (вводит покупатель при заказе)
  "deliveryAddress": "ул. Пушкина, 10, кв. 5",
  "deliveryCoords": {
    "lat": 55.751244,
    "lng": 37.618423
  },
  "deliveryPhone": "+79991234567",  // телефон для курьера (может отличаться от профиля)
  "deliveryNotes": "Позвонить за 5 минут, оставить у двери",
  
  // ────────────────────────────────────────────────────────
  // UBER данные
  // ────────────────────────────────────────────────────────
  
  "uberDeliveryId": "abc-def-ghi",   // ID доставки в Uber
  "uberTrackingUrl": "https://...",   // ссылка на карту
  "uberStatus": "dropoff_complete",   // статус от Uber
  
  // ────────────────────────────────────────────────────────
  // Статусы заказа (для внутренней логики)
  // ────────────────────────────────────────────────────────
  
  "status": "delivered",
  // Возможные значения:
  //   - "pending"           → ждёт принятия поваром
  //   - "cooking"           → повар готовит
  //   - "courier_assigned"  → курьер едет к повару
  //   - "in_delivery"       → курьер везёт к покупателю
  //   - "delivered"         → доставлено ✅
  //   - "cancelled"         → отменён
  
  "paymentStatus": "paid",       // unpaid | paid | refunded
  
  // Временные метки
  "createdAt": "2026-10-27T15:30:00Z",
  "acceptedAt": "2026-10-27T15:32:00Z",    // когда повар принял
  "courierAssignedAt": "2026-10-27T15:35:00Z",
  "deliveredAt": "2026-10-27T16:05:00Z"
}
```

---

## Как формируется адрес доставки в React

### 1. Компонент выбора адреса

```jsx
// src/components/orders/AddressInput.jsx

import { useState } from 'react'
import axios from 'axios'

export default function AddressInput({ onAddressSelect }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])

  const searchAddress = async (text) => {
    setQuery(text)
    
    if (text.length < 3) return
    
    // Mapbox Geocoding API
    const res = await axios.get(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json`,
      {
        params: {
          access_token: process.env.REACT_APP_MAPBOX_TOKEN,
          country: 'RU',  // только Россия
          types: 'address',
          limit: 5
        }
      }
    )

    setSuggestions(res.data.features)
  }

  const selectAddress = (feature) => {
    const address = feature.place_name
    const [lng, lat] = feature.geometry.coordinates

    onAddressSelect({
      address,
      coords: { lat, lng }
    })

    setSuggestions([])
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => searchAddress(e.target.value)}
        placeholder="Введите адрес доставки"
        className="w-full px-4 py-3 border rounded-lg"
      />
      
      {suggestions.length > 0 && (
        <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1">
          {suggestions.map((s) => (
            <div
              key={s.id}
              onClick={() => selectAddress(s)}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              {s.place_name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

### 2. Экран оформления заказа

```jsx
// src/pages/checkout/CheckoutPage.jsx

import { useState } from 'react'
import AddressInput from '../../components/orders/AddressInput'

export default function CheckoutPage() {
  const [deliveryAddress, setDeliveryAddress] = useState(null)
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  const submitOrder = async () => {
    const order = {
      items: cart.items,
      totalPrice: cart.total,
      
      // Адрес доставки
      deliveryAddress: deliveryAddress.address,
      deliveryCoords: deliveryAddress.coords,
      deliveryPhone: phone,
      deliveryNotes: notes,
      
      status: 'pending'
    }

    // Создать заказ в Appwrite
    await databases.createDocument(DATABASE_ID, 'orders', ID.unique(), order)
  }

  return (
    <div className="p-4">
      <h1>Оформление заказа</h1>
      
      <AddressInput onAddressSelect={setDeliveryAddress} />
      
      <input
        type="tel"
        placeholder="Телефон для курьера"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      
      <textarea
        placeholder="Комментарий для курьера"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      
      <button onClick={submitOrder}>
        Заказать за ${cart.total}
      </button>
    </div>
  )
}
```

---

## Сколько стоит доставка Uber Direct?

Стоимость зависит от:
- Расстояния между поваром и покупателем
- Времени суток (пиковые часы дороже)
- Спроса на курьеров

**Примерные цены:**
- До 2 км — $3-5
- 2-5 км — $5-8
- 5-10 км — $8-12

**Получить стоимость ДО создания заказа:**

```js
// Uber API — quote (расчёт стоимости)
const quote = await axios.post(
  `https://api.uber.com/v1/customers/${CUSTOMER_ID}/delivery_quotes`,
  {
    pickup: { latitude: 55.7558, longitude: 37.6173 },
    dropoff: { latitude: 55.7512, longitude: 37.6184 }
  },
  { headers: { Authorization: `Bearer ${token}` } }
)

console.log(`Стоимость доставки: $${quote.data.fee / 100}`)
console.log(`Время в пути: ${quote.data.dropoff_eta} мин`)
```
