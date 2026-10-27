# 🚀 Деплой GoFoods на Vercel

Есть два способа задеплоить фронтенд:

---

## ✅ Способ 1: Через Vercel Dashboard (самый простой)

### 1. Залить код на GitHub

Твой код уже на GitHub: `https://github.com/BotCoder254/gofoods`

Если есть изменения, закоммить их:

```bash
cd /Users/isa/Projects/gofoods
git add .
git commit -m "Update: Supabase migration + minimal design"
git push
```

### 2. Зайти на Vercel

1. Открой https://vercel.com
2. Войди через GitHub

### 3. Импортировать проект

1. Нажми **"Add New..." → Project**
2. Выбери репозиторий `BotCoder254/gofoods` из списка
3. Нажми **Import**

### 4. Настроить проект

**Framework Preset:** Create React App (автоматически определится)

**Root Directory:** `./` (оставь как есть)

**Build Command:**
```
npm run build
```

**Output Directory:**
```
build
```

**Install Command:**
```
npm install
```

### 5. Добавить Environment Variables

⚠️ **Важно!** Нажми **"Environment Variables"** и добавь:

```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
REACT_APP_MAPBOX_TOKEN=pk.eyJ1...
```

### 6. Deploy

Нажми **Deploy** — через 2-3 минуты получишь ссылку типа:

```
https://gofoods-abc123.vercel.app
```

---

## 🛠️ Способ 2: Через Vercel CLI

### 1. Установить Vercel CLI

```bash
npm install -g vercel
```

### 2. Войти в аккаунт

```bash
vercel login
```

Откроется браузер — подтверди вход.

### 3. Деплой в один клик

```bash
cd /Users/isa/Projects/gofoods
vercel
```

Он спросит:
- **Set up and deploy?** → `Y`
- **Which scope?** → выбери свой аккаунт
- **Link to existing project?** → `N`
- **Project name?** → `gofoods` (или своё название)
- **Directory?** → `.` (текущая)
- **Override settings?** → `N`

### 4. Добавить переменные окружения

```bash
vercel env add REACT_APP_SUPABASE_URL
# вставь значение, нажми Enter

vercel env add REACT_APP_SUPABASE_ANON_KEY
# вставь значение

vercel env add REACT_APP_MAPBOX_TOKEN
# вставь значение
```

### 5. Деплой в продакшен

```bash
vercel --prod
```

Готово! Получишь ссылку на продакшен.

---

## 🔄 Автоматический деплой при каждом git push

После первого деплоя через Dashboard Vercel **автоматически** будет деплоить при каждом `git push`:

- `main` ветка → Production
- другие ветки → Preview

---

## 📝 Где взять переменные окружения?

### Supabase

1. Зайди на https://app.supabase.com
2. Выбери свой проект
3. Settings → API
4. Скопируй:
   - **URL** → `REACT_APP_SUPABASE_URL`
   - **anon public** → `REACT_APP_SUPABASE_ANON_KEY`

### Mapbox

1. Зайди на https://account.mapbox.com
2. Tokens
3. Скопируй **Default public token** → `REACT_APP_MAPBOX_TOKEN`

---

## ⚙️ Telegram Mini App: привязать URL

После деплоя получишь URL типа `https://gofoods-abc123.vercel.app`

Добавь его в бота:

```bash
# Открой @BotFather
/mybots → выбрать бота → Bot Settings → Menu Button

URL: https://gofoods-abc123.vercel.app
```

---

## 🐛 Частые проблемы

**1. Build failed: "Module not found"**

Убедись, что все зависимости установлены:

```bash
rm -rf node_modules package-lock.json
npm install
npm run build  # проверь локально
```

**2. Blank page после деплоя**

- Проверь переменные окружения в Vercel Dashboard
- Открой консоль браузера (F12) — там будет ошибка
- Обычно это `REACT_APP_SUPABASE_URL` не указан

**3. Ошибка 404 при переходе по ссылкам**

Vercel автоматически настраивает SPA routing для CRA, но если проблема есть:

Создай файл `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 📊 После деплоя

1. Зайди на Vercel Dashboard → твой проект
2. Вкладка **Deployments** — история всех деплоев
3. Вкладка **Analytics** — статистика посещений
4. Вкладка **Logs** — логи если что-то сломалось

---

## 🔗 Полезные ссылки

- Vercel Dashboard: https://vercel.com/dashboard
- Vercel CLI Docs: https://vercel.com/docs/cli
- Create React App на Vercel: https://vercel.com/guides/deploying-react-with-vercel
