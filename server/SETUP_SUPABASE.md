# 🚀 Полная инструкция по запуску GoFoods с Supabase + Uber Direct

---

## Что будет работать после настройки

✅ Telegram Mini App (сайт открывается в Telegram)  
✅ Supabase (PostgreSQL база данных)  
✅ Сохранение Telegram ID пользователей  
✅ Два бота (для покупателей и поваров)  
✅ Доставка через Uber Direct  
✅ Webhook уведомления о статусах  

---

## 📋 Что нужно сделать (чеклист)

### 1️⃣ Supabase — база данных

**Зарегистрироваться:** https://supabase.com

**Создать проект:**
1. Dashboard → New Project
2. Название: `gofoods`
3. Пароль базы данных: придумать надёжный пароль (сохрани!)
4. Region: выбрать ближайший (Europe West для России)
5. Plan: **Free** (бесплатно навсегда, лимит 500 MB)

**Получить ключи:**
1. Settings → API
2. Скопировать:
   - `URL` → `.env` → `SUPABASE_URL`
   - `anon public` → для фронтенда
   - `service_role` → `.env` → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ СЕКРЕТНЫЙ! Никому не показывай

**Создать таблицы:**
1. SQL Editor → New query
2. Скопировать весь файл `/server/supabase/schema.sql`
3. Run
4. Должно выполниться без ошибок

**Проверить что таблицы созданы:**
```
Table Editor → должны появиться таблицы:
- users
- food_items
- orders
- messages
- bookmarks
- notifications
```

**Настроить Storage (для фото блюд и аватаров):**
1. Storage → Create bucket
2. Name: `avatars`
3. Public: ✅ Yes
4. Создать ещё один: `food-images` (тоже public)

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

**Обновить фронтенд для Supabase:**

Создать файл `src/config/supabase.js`:
```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

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

## 🔧 Отличия Supabase от других БД

### ✅ Преимущества

| Фича | Supabase | Appwrite |
|------|----------|----------|
| База данных | PostgreSQL (мощная, стандарт индустрии) | NoSQL (MongoDB-стиль) |
| SQL запросы | ✅ Да | ❌ Нет |
| Геопоиск | ✅ PostGIS (встроенная поддержка координат) | ⚠️ Ограниченная |
| Real-time | ✅ WebSocket подписки из коробки | ✅ Да |
| Row Level Security | ✅ Защита на уровне БД | ⚠️ Permissions на уровне коллекций |
| Бесплатный план | 500 MB навсегда | 2 GB (но медленнее) |
| Миграции | ✅ SQL файлы (стандарт) | ❌ Через Dashboard |
| Бекапы | ✅ Point-in-time recovery | ⚠️ Только в платных планах |

### 📍 Геопоиск (найти поваров рядом)

Supabase использует PostGIS → можно делать запросы типа:

```sql
-- Найти всех поваров в радиусе 5 км от пользователя
SELECT * FROM find_nearby_cooks(55.7558, 37.6173, 5);
```

Это встроено в схему (`server/supabase/schema.sql`)!

---

## 📊 Структура таблиц Supabase

```sql
users
├── id (UUID, primary key)
├── email
├── display_name
├── phone
├── address
├── location (GEOGRAPHY point) ← координаты для геопоиска
├── telegram_id ← для отправки сообщений
├── telegram_username
├── role (user | cook | admin)

orders
├── id (UUID)
├── customer_id → users(id)
├── cook_id → users(id)
├── telegram_id ← для уведомлений
├── items (JSONB) ← массив блюд
├── delivery_address
├── delivery_coords (GEOGRAPHY point)
├── uber_delivery_id
├── uber_tracking_url
├── status (pending | cooking | delivered...)
```

Полная схема в файле `server/supabase/schema.sql`

---

## 💰 Примерные затраты

| Сервис | Бесплатный лимит | Платно от |
|--------|------------------|-----------|
| Supabase | 500 MB, 2 GB transfer | $25/мес |
| Railway | 500 часов/мес | $5/мес |
| Vercel | Безлимитно для фронта | $0 |
| Telegram Bots | Бесплатно | $0 |
| Uber Direct | Нет бесплатного | $3-10 за доставку |

**Итого для старта:** $5-7/мес + комиссия Uber с каждого заказа

---

## 🆘 Частые проблемы

**1. Ошибка "relation does not exist"**
- Не запустился `schema.sql` → зайди в SQL Editor и запусти снова

**2. "JWT expired" или auth ошибки**
- Проверь `SUPABASE_SERVICE_ROLE_KEY` в `.env` (не `anon key`!)

**3. Бот не отвечает**
```bash
# Проверить что сервер запущен
curl http://localhost:3001/webhook/uber
# Должен вернуть: GoFoods Uber Webhook is running ✅
```

**4. Telegram ID не сохраняется**
- Открой сайт через бота (не через браузер напрямую)
- Проверь что подключён `@twa-dev/sdk`

**5. Uber возвращает ошибку**
- Проверь что адреса валидные (с координатами)
- В Sandbox некоторые адреса могут не работать

---

## 📞 Поддержка

Если что-то не получается:
1. Проверь `.env` — там ли все ключи?
2. Посмотри логи сервера
3. Проверь Supabase Dashboard → Logs
4. Напиши в issues: https://github.com/BotCoder254/gofoods/issues
