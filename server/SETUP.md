# 🚀 Полная инструкция по запуску GoFoods с доставкой

---

## Что будет работать после настройки

✅ Telegram Mini App (сайт открывается в Telegram)  
✅ Сохранение Telegram ID пользователей  
✅ Два бота (для покупателей и поваров)  
✅ Доставка через Uber Direct  
✅ Webhook уведомления о статусах  

---

## 📋 Что нужно сделать (чеклист)

### 1️⃣ Appwrite — база данных

**Зарегистрироваться:** https://cloud.appwrite.io

**Создать проект:**
1. Dashboard → Create Project
2. Название: `GoFoods`
3. Сохранить `Project ID`

**Создать базу данных:**
1. Databases → Create Database
2. Название: `gofoods_db`
3. Сохранить `Database ID`

**Создать коллекции:**

#### Коллекция `users`
Attributes:
- `authId` → String (required)
- `email` → String (required)
- `displayName` → String
- `avatarFileId` → String
- `bio` → String
- `phone` → String
- `location` → JSON (для координат)
- `address` → String
- `role` → String (enum: user, cook, admin)
- `isVerified` → Boolean
- `suspended` → Boolean
- **`telegramId` → String** ← NEW
- **`telegramUsername` → String** ← NEW
- **`telegramNotify` → Boolean (default: true)** ← NEW

Indexes:
- `telegramId_index` → Key → telegramId → ASC

Permissions:
- Read: `any`
- Create: `users`
- Update: `users`

#### Коллекция `orders`
Attributes:
- `customerId` → String (required)
- `cookId` → String (required)
- `telegramId` → String (required)
- `items` → JSON (массив блюд)
- `totalPrice` → Float
- `deliveryFee` → Float
- `cookEarnings` → Float
- `deliveryAddress` → String (required)
- `deliveryCoords` → JSON (lat, lng)
- `deliveryPhone` → String
- `deliveryNotes` → String
- `uberDeliveryId` → String
- `uberTrackingUrl` → String
- `uberStatus` → String
- `status` → String (enum: pending, cooking, courier_assigned, in_delivery, delivered, cancelled)
- `paymentStatus` → String (enum: unpaid, paid, refunded)
- `createdAt` → DateTime
- `acceptedAt` → DateTime
- `deliveredAt` → DateTime

Permissions:
- Read: `any`
- Create: `users`
- Update: `team:admins`, `team:cooks`

**Создать Server API Key:**
1. Settings → API Keys → Create API Key
2. Name: `GoFoods Server`
3. Scopes: ✅ `databases.read`, ✅ `databases.write`
4. Сохранить ключ в `.env` → `APPWRITE_API_KEY`

---

### 2️⃣ Telegram боты

**Создать бота для покупателей:**
1. Открыть [@BotFather](https://t.me/BotFather)
2. Написать `/newbot`
3. Название: `GoFoods`
4. Username: `gofoods_bot` (должен быть уникальным)
5. Получить токен → сохранить в `.env` → `BOT_TOKEN`

**Настроить Web App:**
```
/setmenubutton
→ выбрать бота
→ URL: https://твой-сайт.vercel.app
```

**Создать бота для поваров:**
1. Снова `/newbot`
2. Название: `GoFoods Cook`
3. Username: `gofoods_cook_bot`
4. Токен → `.env` → `COOK_BOT_TOKEN`

---

### 3️⃣ Uber Direct API

**⚠️ Внимание:** Uber Direct доступен только для зарегистрированных бизнесов. Нужны:
- Company name
- Tax ID / EIN (для США) или аналог
- Business address

**Регистрация:**
1. Зайти на https://developer.uber.com
2. Sign up → Business account
3. Create App → Name: `GoFoods Delivery`
4. Products → Enable **Uber Direct**

**Получить ключи:**
1. Dashboard → Apps → GoFoods Delivery
2. Settings → Credentials
3. Сохранить:
   - `Client ID` → `.env` → `UBER_CLIENT_ID`
   - `Client Secret` → `.env` → `UBER_CLIENT_SECRET`
4. Settings → Customer ID → `.env` → `UBER_CUSTOMER_ID`

**Настроить Webhook:**
1. Dashboard → Webhooks
2. Add endpoint: `https://твой-сервер.com/webhook/uber`
3. Events: выбрать все `delivery.*`

**Тестирование:**
- Uber предоставляет **Sandbox** для тестов без реальных курьеров
- В Sandbox доставка симулируется, webhook приходят как настоящие

---

### 4️⃣ Деплой сервера

**Вариант А — Railway (рекомендуется)**

1. Зарегистрироваться на https://railway.app
2. New Project → Deploy from GitHub
3. Выбрать репозиторий
4. Root Directory: `/server`
5. Environment Variables → вставить все из `.env`
6. Deploy

Railway даст URL: `https://gofoods-production.up.railway.app`

**Вариант Б — Render**

1. https://render.com → New Web Service
2. GitHub → выбрать репозиторий
3. Root Directory: `server`
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Environment Variables → скопировать из `.env`

**Вариант В — Свой VPS**

```bash
ssh user@your-server.com

# Установить Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Клонировать репозиторий
git clone https://github.com/yourusername/gofoods.git
cd gofoods/server

# Установить зависимости
npm install

# Создать .env (вставить все ключи)
nano .env

# Запустить через PM2 (чтобы работало постоянно)
npm install -g pm2
pm2 start index.js --name gofoods
pm2 save
pm2 startup
```

**Настроить Nginx для webhook:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /webhook/uber {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

---

### 5️⃣ Деплой фронтенда (React Mini App)

**Vercel (проще всего):**

```bash
cd gofoods
npm install -g vercel

# Первый раз
vercel

# Следующие разы
vercel --prod
```

Получишь URL: `https://gofoods-pi.vercel.app`

**Этот URL нужно:**
1. Вставить в `.env` сервера → `MINI_APP_URL`
2. Указать в @BotFather → `/setmenubutton`

---

### 6️⃣ Тестирование

**Проверить всё работает:**

1. **Открыть бота покупателя**
   ```
   t.me/gofoods_bot → /start
   → должна появиться кнопка "Открыть GoFoods"
   ```

2. **Открыть Mini App**
   - Сайт откроется внутри Telegram
   - Telegram ID должен сохраниться автоматически

3. **Оформить тестовый заказ**
   - Добавить блюдо в корзину
   - Указать адрес доставки
   - Нажать "Заказать"
   - Бот должен прислать подтверждение

4. **Проверить бота поваров**
   ```
   t.me/gofoods_cook_bot → должно прийти уведомление
   → нажать "Принять"
   ```

5. **Проверить Uber**
   - В логах сервера должно быть: `[Uber] Доставка создана: abc-def`
   - Покупателю должна прийти ссылка на отслеживание

6. **Проверить webhook**
   ```bash
   # В логах сервера (через 1-2 минуты)
   [Uber Webhook] delivery.courier_update
   [Uber Webhook] delivery.pickup_complete
   ```

---

### 7️⃣ Запуск в продакшене

**Чеклист перед запуском:**
- [ ] Все `.env` переменные заполнены
- [ ] Appwrite коллекции созданы
- [ ] Telegram боты отвечают на `/start`
- [ ] Mini App открывается в боте
- [ ] Сервер развёрнут и доступен
- [ ] Uber webhook настроен
- [ ] Тестовый заказ прошёл успешно

**Monitoring:**
- Логи сервера: `pm2 logs gofoods` или Railway/Render dashboard
- Ошибки Appwrite: Dashboard → Logs
- Uber статистика: Uber Developer Dashboard

---

## 💰 Примерные затраты

| Сервис | Бесплатный лимит | Платно от |
|--------|------------------|-----------|
| Appwrite Cloud | 75K MAU, 2GB | $15/мес |
| Railway | 500 часов/мес | $5/мес |
| Vercel | Безлимитно для фронта | $0 |
| Telegram Bots | Бесплатно | $0 |
| Uber Direct | Нет бесплатного | $3-10 за доставку |

**Итого для старта:** $5-7/мес + комиссия Uber с каждого заказа

---

## 🆘 Частые проблемы

**1. Бот не отвечает**
```bash
# Проверить что сервер запущен
curl http://localhost:3001/webhook/uber
# Должен вернуть: GoFoods Uber Webhook is running ✅
```

**2. Telegram ID не сохраняется**
- Открой сайт через бота (не через браузер напрямую)
- Проверь что подключён `@twa-dev/sdk`
- Проверь консоль браузера: должно быть `window.Telegram.WebApp`

**3. Uber возвращает ошибку**
- Проверь что адреса валидные (с координатами)
- Проверь что Customer ID правильный
- В Sandbox некоторые адреса могут не работать

**4. Webhook не приходит**
- Проверь что URL доступен извне: `curl https://твой-домен.com/webhook/uber`
- В Uber Dashboard → Webhooks должен быть статус "Active"
- Проверь логи на сервере

---

## 📞 Поддержка

Если что-то не получается:
1. Проверь `.env` — там ли все ключи?
2. Посмотри логи сервера
3. Проверь Appwrite Dashboard → Logs
4. Напиши в issues: https://github.com/BotCoder254/gofoods/issues
