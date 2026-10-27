# Appwrite — добавить поля для Telegram ID

## Шаги в Appwrite Dashboard

### 1. Открыть коллекцию Users

Database → твоя база → коллекция `users`

### 2. Добавить три атрибута

| Имя атрибута     | Тип     | Required | Default |
|------------------|---------|----------|---------|
| telegramId       | String  | No       | —       |
| telegramUsername | String  | No       | —       |
| telegramNotify   | Boolean | No       | true    |

### 3. Создать индекс для быстрого поиска

Indexes → Create Index:
- Key: `telegramId_index`
- Type: `key`
- Attribute: `telegramId`
- Order: ASC

### 4. Server API Key (для рассылки)

Settings → API Keys → Create API Key:
- Name: `GoFoods Server`
- Scopes: `databases.read`, `databases.write`
- Сохранить в `.env` как `APPWRITE_API_KEY`
