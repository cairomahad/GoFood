# GoFoods Backend Server (Supabase + Uber Direct)

Серверная часть GoFoods — обрабатывает заказы, управляет Telegram ботами и интегрируется с Uber Direct для доставки.

**База данных:** Supabase (PostgreSQL)

---

## 📁 Структура файлов

```
server/
├── index.js                    # Основной сервер (Express + Telegram боты)
├── deliveryFlow.js             # Uber Direct API (создание доставки, webhook)
├── sendTelegramMessage.js      # Отправка сообщений пользователям
├── package.json                # Зависимости
├── .env.example                # Шаблон переменных окружения
├── SETUP.md                    # Полная инструкция по настройке
├── ORDER_STRUCTURE.md          # Структура данных заказа в Appwrite
├── DELIVERY_TIMELINE.md        # Хронология доставки от заказа до получения
└── APPWRITE_SETUP.md           # Настройка Appwrite (поля, индексы)
```

---

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
cd server
npm install
```

### 2. Настройка окружения

```bash
cp .env.example .env
nano .env   # вставить все ключи
```

Где взять ключи — читай в **[SETUP.md](./SETUP.md)**

### 3. Запуск

```bash
# Разработка (с автоперезагрузкой)
npm run dev

# Продакшен
npm start
```

Сервер запустится на `http://localhost:3001`

---

## 🤖 Как это работает

### Бот для покупателей (`@gofoods_bot`)

```
Пользователь:
  /start → получает кнопку "Открыть GoFoods"
           ↓
         Mini App (React сайт в Telegram)
           ↓
         Оформляет заказ
           ↓
         Бот пишет: "✅ Заказ #1234 принят!"
```

### Бот для поваров (`@gofoods_cook_bot`)

```
Новый заказ → Повар получает уведомление:
              "🔔 НОВЫЙ ЗАКАЗ #1234
               [✅ Принять] [❌ Отказать]"
              ↓
         Принял → создаётся доставка в Uber
              ↓
         Курьер едет
```

### Uber Direct

```
Повар принял заказ
  ↓
Сервер вызывает Uber API: createDelivery()
  ↓
Uber назначает курьера
  ↓
Webhook → сервер получает статусы:
  - courier_assigned   → "Курьер едет к повару"
  - pickup_complete    → "Курьер забрал заказ"
  - dropoff_complete   → "Доставлено!"
```

---

## 📡 API Endpoints

### `POST /webhook/uber`
Получает события от Uber (статусы доставки)

### `GET /api/orders/:orderId`
Получить информацию о заказе

---

## 🔧 Используемые технологии

- **Express** — HTTP сервер
- **node-telegram-bot-api** — Telegram боты
- **@supabase/supabase-js** — PostgreSQL база данных
- **axios** — HTTP клиент для Uber API

---

## 📚 Документация

- **[SETUP_SUPABASE.md](./SETUP_SUPABASE.md)** — Полная инструкция по настройке (с получением всех ключей)
- **[ORDER_STRUCTURE.md](./ORDER_STRUCTURE.md)** — Какие поля хранятся в заказе
- **[DELIVERY_TIMELINE.md](./DELIVERY_TIMELINE.md)** — Полная хронология доставки
- **[supabase/schema.sql](./supabase/schema.sql)** — SQL схема базы данных

---

## 🐛 Отладка

### Проверить что боты работают

```bash
curl https://api.telegram.org/bot<BOT_TOKEN>/getMe
```

Должен вернуть информацию о боте.

### Проверить webhook Uber

```bash
curl http://localhost:3001/webhook/uber
```

Должен вернуть: `GoFoods Uber Webhook is running ✅`

### Логи

```bash
# Если запущено через PM2
pm2 logs gofoods

# Если через npm start
# логи выводятся в консоль
```

---

## 🌍 Деплой

### Railway (рекомендуется)

1. Зарегистрироваться на https://railway.app
2. New Project → Deploy from GitHub
3. Root Directory: `/server`
4. Add variables из `.env`
5. Deploy

### Render

1. https://render.com → New Web Service
2. Build: `npm install`
3. Start: `npm start`
4. Environment Variables из `.env`

### VPS

```bash
git clone https://github.com/yourusername/gofoods.git
cd gofoods/server
npm install
pm2 start index.js --name gofoods
```

---

## 💡 Что дальше?

После запуска сервера:
1. Протестируй полный флоу: заказ → повар → доставка
2. Настрой мониторинг ошибок (Sentry)
3. Добавь rate limiting для API
4. Настрой HTTPS (Let's Encrypt)
5. Добавь логирование в файл

---

## 📄 Лицензия

MIT
