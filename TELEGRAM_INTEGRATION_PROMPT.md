# 🚀 GoFoods × Telegram Mini App + Uber Delivery — Полный промт для разработчика

---

## 🎯 Задача

Превратить существующий React-сайт **GoFoods** в полноценную Telegram Mini App
с двумя ботами и автоматической доставкой через **Uber Direct API**.

---

## 🏗️ Архитектура системы

```
┌─────────────────────────────────────────────────────────────┐
│                        ПОКУПАТЕЛЬ                           │
│  Telegram → открывает Mini App (Web App) → делает заказ     │
└───────────────────────┬─────────────────────────────────────┘
                        │  заказ сохраняется в Appwrite
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js)                       │
│  Appwrite Functions / Express сервер                        │
│  - Webhook от Telegram                                      │
│  - Создание заказа                                          │
│  - Вызов Uber Direct API                                    │
│  - Уведомление поваров                                      │
└──────────┬────────────────────────────┬─────────────────────┘
           │                            │
           ▼                            ▼
┌──────────────────┐        ┌─────────────────────────┐
│  БОТ ДЛЯ ПОВАРОВ │        │   UBER DIRECT API        │
│  Получает заказ  │        │   Создаёт доставку       │
│  Принять/Откл.   │        │   Отслеживает курьера    │
└──────────────────┘        └─────────────────────────┘
```

---

## 📱 Часть 1 — Telegram Mini App (фронтенд для покупателей)

### Что нужно сделать с существующим React-приложением

1. **Установить Telegram Web App SDK**
```bash
npm install @twa-dev/sdk
# или подключить через CDN в index.html:
# <script src="https://telegram.org/js/telegram-web-app.js"></script>
```

2. **Инициализация в `src/index.js`**
```js
import WebApp from '@twa-dev/sdk';
WebApp.ready();
WebApp.expand(); // разворачивает на весь экран
```

3. **Получить данные пользователя из Telegram (авторизация)**
```js
// вместо email/password — авторизация через Telegram
import WebApp from '@twa-dev/sdk';

const telegramUser = WebApp.initDataUnsafe?.user;
// { id, first_name, last_name, username, photo_url, language_code }
```
- Используй `initData` (строку) + проверяй её подпись на бэкенде через `HMAC-SHA256`
- Сохраняй пользователя в Appwrite, если нет — создавай автоматически

4. **Главная кнопка Telegram (оформление заказа)**
```js
WebApp.MainButton.setText('🛒 Оформить заказ — $12.50');
WebApp.MainButton.show();
WebApp.MainButton.onClick(() => {
  // отправить заказ на бэкенд
  submitOrder();
});
```

5. **Кнопка "Назад" Telegram**
```js
WebApp.BackButton.show();
WebApp.BackButton.onClick(() => navigate(-1));
```

6. **Цветовая тема — адаптироваться под тему пользователя**
```js
document.documentElement.style.setProperty(
  '--tg-theme-bg-color', WebApp.themeParams.bg_color
);
```

7. **Убрать стандартную авторизацию** — заменить `AuthContext.js`:
   - не показывать форму login/register
   - автоматически логинить через Telegram `initData`

8. **Экраны которые нужны в Mini App:**
   - 🏠 Главная — список еды (существующий Feed)
   - 🔍 Поиск по категориям
   - 🍽️ Карточка блюда с кнопкой "Добавить в корзину"
   - 🛒 Корзина
   - 📍 Ввод адреса доставки (поле + Mapbox autocomplete)
   - 💳 Оплата (Telegram Payments или Stars)
   - 📦 Статус заказа в реальном времени

---

## 🤖 Часть 2 — Бот для покупателей (`@GoFoodsBot`)

### Создание бота

1. Создать бота через `@BotFather` в Telegram
2. Получить `BOT_TOKEN`
3. Настроить Menu Button → указать URL своего React-приложения:
```
/setmenubutton → URL: https://your-domain.com
```
4. Или создать кнопку через BotFather:
```
/newapp → привязать Web App к боту
```

### Сообщения бота покупателю

```
/start → "Добро пожаловать в GoFoods! Нажми кнопку ниже 👇"
         [Открыть GoFoods 🍕] — кнопка открывает Mini App

После заказа:
→ "✅ Заказ #1234 принят! Повар готовит твою еду."
→ "🏍️ Курьер выехал! Примерное время: 25 мин."
→ "📍 Курьер рядом!" + ссылка на отслеживание Uber
→ "🎉 Заказ доставлен! Приятного аппетита!"
```

### Код бота (Node.js + `node-telegram-bot-api`)

```bash
npm install node-telegram-bot-api
```

```js
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Команда /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, '🍕 Добро пожаловать в GoFoods!', {
    reply_markup: {
      inline_keyboard: [[{
        text: '🛒 Открыть меню',
        web_app: { url: process.env.MINI_APP_URL }
      }]]
    }
  });
});

// Получить данные из Mini App
bot.on('web_app_data', (msg) => {
  const order = JSON.parse(msg.web_app_data.data);
  processOrder(order, msg.from.id);
});
```

---

## 👨‍🍳 Часть 3 — Бот для поваров (`@GoFoodsCookBot`)

### Логика работы

Когда покупатель оформляет заказ → бот ищет повара блюда → отправляет уведомление с кнопками.

### Сообщение повару

```
🔔 НОВЫЙ ЗАКАЗ #1234

Блюдо: Плов с бараниной
Количество: 2 порции
Покупатель: Иван И.
Адрес доставки: ул. Ленина, 15
Время заказа: 17:45

💰 Ваш заработок: $8.00

[✅ Принять]  [❌ Отказать]
```

### Код обработки ответа повара

```js
const cookBot = new TelegramBot(process.env.COOK_BOT_TOKEN, { polling: true });

cookBot.on('callback_query', async (query) => {
  const [action, orderId] = query.data.split(':');
  
  if (action === 'accept') {
    await updateOrderStatus(orderId, 'cooking');
    await notifyCustomer(orderId, 'cooking');
    await createUberDelivery(orderId); // ← вызов Uber API
    cookBot.answerCallbackQuery(query.id, { text: '✅ Заказ принят!' });
  }

  if (action === 'reject') {
    await updateOrderStatus(orderId, 'rejected');
    await findAnotherCook(orderId); // поиск другого повара
    cookBot.answerCallbackQuery(query.id, { text: '❌ Заказ отклонён' });
  }
});
```

### Уведомления повару о статусах доставки

```
🚗 Курьер Uber едет к тебе за заказом.
    Ожидаемое прибытие: 10 мин.

✅ Курьер забрал заказ. Доставка началась!
```

---

## 🚗 Часть 4 — Uber Direct (Courier API) интеграция

### Регистрация

1. Зарегистрироваться на [developer.uber.com](https://developer.uber.com)
2. Создать приложение → включить **Uber Direct (Delivery API)**
3. Получить `CLIENT_ID`, `CLIENT_SECRET`
4. Получить `CUSTOMER_ID` (из dashboard)

### Получение Access Token

```js
const axios = require('axios');

async function getUberToken() {
  const res = await axios.post('https://auth.uber.com/oauth/v2/token', {
    client_id: process.env.UBER_CLIENT_ID,
    client_secret: process.env.UBER_CLIENT_SECRET,
    grant_type: 'client_credentials',
    scope: 'eats.deliveries'
  }, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return res.data.access_token;
}
```

### Создание доставки

```js
async function createUberDelivery(order) {
  const token = await getUberToken();

  const delivery = await axios.post(
    `https://api.uber.com/v1/customers/${process.env.UBER_CUSTOMER_ID}/deliveries`,
    {
      pickup: {
        name: order.cook.name,
        address: order.cook.address,       // адрес повара
        phone_number: order.cook.phone,
        notes: 'Взять заказ у повара'
      },
      dropoff: {
        name: order.customer.name,
        address: order.customer.address,   // адрес покупателя
        phone_number: order.customer.phone,
        notes: order.deliveryNotes
      },
      manifest: {
        description: order.items.map(i => i.name).join(', '),
        total_value: order.totalPrice * 100  // в центах
      }
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  // Сохранить delivery_id в Appwrite
  await updateOrder(order.id, {
    uberDeliveryId: delivery.data.id,
    trackingUrl: delivery.data.tracking_url,
    status: 'courier_assigned'
  });

  // Отправить ссылку на отслеживание покупателю
  await notifyCustomerWithTracking(order.customerId, delivery.data.tracking_url);
}
```

### Webhook от Uber (статусы доставки)

```js
app.post('/webhook/uber', (req, res) => {
  const { event_type, meta } = req.body;

  switch (event_type) {
    case 'delivery.courier_update':
      // курьер выехал к повару
      notifyCustomer(meta.external_id, 'courier_on_way');
      break;
    case 'delivery.pickup_complete':
      // курьер забрал еду
      notifyCustomer(meta.external_id, 'food_picked_up');
      notifyCook(meta.external_id, 'food_picked_up');
      break;
    case 'delivery.dropoff_complete':
      // доставлено!
      notifyCustomer(meta.external_id, 'delivered');
      markOrderComplete(meta.external_id);
      break;
    case 'delivery.cancelled':
      notifyCustomer(meta.external_id, 'cancelled');
      break;
  }

  res.sendStatus(200);
});
```

---

## 💳 Часть 5 — Оплата через Telegram

### Вариант A: Telegram Stars (крипто, без комиссии)

```js
// отправить инвойс через бот
bot.sendInvoice(chatId, {
  title: 'Заказ GoFoods',
  description: 'Плов с бараниной x2',
  payload: JSON.stringify({ orderId }),
  provider_token: '',           // пустой = Telegram Stars
  currency: 'XTR',             // Stars
  prices: [{ label: 'Итого', amount: 250 }]  // 250 Stars
});
```

### Вариант B: Обычная оплата картой

```js
// provider_token получить от @BotFather → /mybots → Payments
bot.sendInvoice(chatId, {
  title: 'Заказ GoFoods',
  description: 'Плов с бараниной x2',
  payload: JSON.stringify({ orderId }),
  provider_token: process.env.PAYMENT_PROVIDER_TOKEN, // Stripe/ЮKassa
  currency: 'USD',
  prices: [{ label: 'Итого', amount: 1250 }]  // $12.50 в центах
});

bot.on('pre_checkout_query', (query) => {
  bot.answerPreCheckoutQuery(query.id, true);
});

bot.on('successful_payment', async (msg) => {
  const { orderId } = JSON.parse(msg.successful_payment.invoice_payload);
  await confirmPayment(orderId);
  await sendOrderToCook(orderId);
});
```

---

## 🗄️ Часть 6 — Appwrite структура данных

### Новые поля в коллекции `orders`

```json
{
  "orderId": "string",
  "customerId": "string",          // telegram user id
  "cookId": "string",              // id повара в Appwrite
  "items": "array",                // список блюд
  "totalPrice": "float",
  "deliveryAddress": "string",
  "deliveryCoords": {              // координаты для Uber
    "lat": "float",
    "lng": "float"
  },
  "status": "enum",               // pending|cooking|courier_assigned|delivered|cancelled
  "uberDeliveryId": "string",
  "uberTrackingUrl": "string",
  "paymentStatus": "enum",        // unpaid|paid|refunded
  "telegramChatId": "string",     // для уведомлений
  "createdAt": "datetime"
}
```

### Appwrite Function — `processOrder`

Создать serverless функцию в Appwrite, которая:
1. Срабатывает при создании нового документа в коллекции `orders`
2. Находит повара по `cookId`
3. Отправляет уведомление в `@GoFoodsCookBot`
4. Инициирует Uber доставку после принятия заказа поваром

---

## 🌐 Часть 7 — Деплой

### Минимальная инфраструктура

| Компонент | Хостинг | Примерная стоимость |
|-----------|---------|---------------------|
| React Mini App | Vercel / Netlify (бесплатно) | $0 |
| Bot Backend (Node.js) | Railway / Render | $5-7/мес |
| База данных | Appwrite Cloud (бесплатно до лимита) | $0 |
| Uber Direct | По заказам (~$3-5 за доставку) | % с заказа |

### Переменные окружения (`.env`)

```env
# Telegram
BOT_TOKEN=<токен основного бота покупателей>
COOK_BOT_TOKEN=<токен бота для поваров>
MINI_APP_URL=https://gofoods-pi.vercel.app

# Appwrite
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=xxx
APPWRITE_API_KEY=xxx
APPWRITE_DATABASE_ID=xxx
APPWRITE_ORDERS_COLLECTION_ID=orders

# Uber Direct
UBER_CLIENT_ID=xxx
UBER_CLIENT_SECRET=xxx
UBER_CUSTOMER_ID=xxx

# Оплата
PAYMENT_PROVIDER_TOKEN=xxx   # от BotFather
```

---

## 📋 Порядок разработки (чеклист)

### Этап 1 — Mini App (1-2 дня)
- [ ] Установить `@twa-dev/sdk`
- [ ] Заменить авторизацию на Telegram `initData`
- [ ] Добавить `WebApp.MainButton` в корзину
- [ ] Задеплоить на Vercel
- [ ] Создать бота через `@BotFather` и привязать Mini App

### Этап 2 — Бот для покупателей (1 день)
- [ ] Node.js сервер с `node-telegram-bot-api`
- [ ] Обработка `/start`
- [ ] Получение `web_app_data` от Mini App
- [ ] Уведомления о статусах заказа

### Этап 3 — Бот для поваров (1 день)
- [ ] Второй бот (`COOK_BOT_TOKEN`)
- [ ] Уведомление с кнопками Принять/Отказать
- [ ] Логика переназначения при отказе

### Этап 4 — Uber Direct (2-3 дня)
- [ ] Зарегистрироваться в Uber Developer Portal
- [ ] Реализовать создание доставки
- [ ] Настроить webhook для статусов
- [ ] Передавать `tracking_url` покупателю

### Этап 5 — Оплата (1-2 дня)
- [ ] Подключить провайдера оплаты через BotFather
- [ ] Реализовать `sendInvoice` / `pre_checkout_query`
- [ ] Подтверждение заказа только после оплаты

### Этап 6 — Тестирование (2 дня)
- [ ] Полный флоу: заказ → повар → Uber → доставка
- [ ] Edge cases: повар отказал, Uber нет курьеров, оплата не прошла

---

## 🔗 Полезные ссылки

- [Telegram Mini Apps Docs](https://core.telegram.org/bots/webapps)
- [Telegram Bot Payments](https://core.telegram.org/bots/payments)
- [Uber Direct API Docs](https://developer.uber.com/docs/deliveries)
- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api)
- [@twa-dev/sdk](https://github.com/twa-dev/SDK)
- [Appwrite Functions](https://appwrite.io/docs/products/functions)
