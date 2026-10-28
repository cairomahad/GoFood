import { supabase } from '../config/supabase'

// ─── Аватар URL (нужен до normalizeUser) ──────────────────────────────────────

export const getAvatarUrl = (path) => {
  if (!path) return null
  const value = String(path)
  if (value.startsWith('http')) return value
  // fullPath иногда приходит как "avatars/..." — убрать имя bucket
  const clean = value.replace(/^avatars\//, '')
  const { data } = supabase.storage.from('avatars').getPublicUrl(clean)
  return data?.publicUrl || null
}

/** Универсальный src для <img> из объекта пользователя */
export const resolveUserAvatar = (user, fallbackName = 'User') => {
  if (!user) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=2A2A2E&color=fff`
  }
  const raw = user.avatarUrl || user.avatar_url || user.avatarFileId
  const url = getAvatarUrl(raw)
  if (url) {
    // сбросить кеш браузера после замены файла с тем же путём
    const sep = url.includes('?') ? '&' : '?'
    return `${url}${sep}v=${user.updated_at || user.updatedAt || Date.now()}`
  }
  const name = user.displayName || user.display_name || fallbackName
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2A2A2E&color=fff`
}

// ─── Нормализация: snake_case (БД) ↔ camelCase (UI) ──────────────────────────

const normalizeUser = (row) => {
  if (!row) return null
  return {
    ...row,
    $id: row.auth_id || row.id,
    authId: row.auth_id,
    displayName: row.display_name,
    avatarFileId: row.avatar_url, // путь в Storage (для UI)
    avatarUrl: row.avatar_url ? getAvatarUrl(row.avatar_url) : null,
    isVerified: row.is_verified,
    telegramId: row.telegram_id,
    telegramUsername: row.telegram_username,
    telegramNotify: row.telegram_notify,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// Только реальные колонки таблицы users (никаких avatarFileId и т.п.)
const ALLOWED_DB_COLUMNS = new Set([
  'email',
  'display_name',
  'avatar_url',
  'phone',
  'bio',
  'address',
  'location',
  'telegram_id',
  'telegram_username',
  'telegram_notify',
  'role',
  'is_verified',
  'suspended'
])

const FIELD_ALIASES = {
  displayName: 'display_name',
  avatarFileId: 'avatar_url', // старое Appwrite-имя → Supabase
  avatarUrl: 'avatar_url',
  isVerified: 'is_verified',
  telegramId: 'telegram_id',
  telegramUsername: 'telegram_username',
  telegramNotify: 'telegram_notify'
}

const toDbFields = (data = {}) => {
  const out = {}
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue
    const dbKey = FIELD_ALIASES[key] || key
    if (!ALLOWED_DB_COLUMNS.has(dbKey)) continue // отсечь avatarFileId и мусор
    out[dbKey] = value
  }
  return out
}

// ─── Пользователи ─────────────────────────────────────────────────────────────

export const createUser = async (userId, email, displayName, telegramId = null) => {
  const { data, error } = await supabase
    .from('users')
    .insert({
      auth_id: userId,
      email,
      display_name: displayName,
      avatar_url: null,
      bio: '',
      phone: '',
      location: null,
      role: 'user',
      is_verified: false,
      suspended: false,
      telegram_id: telegramId ? String(telegramId) : null,
      telegram_username: null,
      telegram_notify: true
    })
    .select()
    .single()

  if (error) throw error
  return normalizeUser(data)
}

export const getUserById = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', userId)
    .single()

  if (error) throw error
  return normalizeUser(data)
}

export const updateUser = async (userId, data) => {
  const { data: updated, error } = await supabase
    .from('users')
    .update(toDbFields(data))
    .eq('auth_id', userId)
    .select()
    .single()

  if (error) throw error
  return normalizeUser(updated)
}

// ─── Telegram ─────────────────────────────────────────────────────────────────

export const saveTelegramId = async (userId, telegramUser) => {
  const { data, error } = await supabase
    .from('users')
    .update({
      telegram_id: String(telegramUser.id),
      telegram_username: telegramUser.username || null,
      telegram_notify: true
    })
    .eq('auth_id', userId)
    .select()
    .single()

  if (error) throw error
  return normalizeUser(data)
}

export const getUserByTelegramId = async (telegramId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', String(telegramId))
    .maybeSingle()

  if (error) throw error
  return normalizeUser(data)
}

// ─── Аватар (Supabase Storage) ────────────────────────────────────────────────

export const uploadAvatar = async (file, userId) => {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  // уникальное имя — чтобы не кешировалась старая картинка
  const path = `${userId || 'anon'}/avatar_${Date.now()}.${ext}`

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(path, file, {
      upsert: true,
      contentType: file.type || 'image/jpeg'
    })

  if (error) throw error

  const storedPath = data?.path || path
  // В БД сохраняем сразу публичный URL — так проще показывать на сайте
  const publicUrl = getAvatarUrl(storedPath)
  return publicUrl || storedPath
}

export const deleteAvatar = async (path) => {
  if (!path || String(path).startsWith('http')) return
  const { error } = await supabase.storage.from('avatars').remove([path])
  if (error) throw error
}

// ─── Поиск пользователей ──────────────────────────────────────────────────────

export const searchUsers = async (searchTerm) => {
  if (!searchTerm) return []

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`display_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
    .limit(20)

  if (error) throw error
  return (data || []).map(normalizeUser)
}

// ─── Повара рядом (геопоиск) ───────────────────────────────────────────────────

export const findNearbyCooks = async (lat, lng, radiusKm = 10) => {
  const { data, error } = await supabase
    .rpc('find_nearby_cooks', {
      user_lat: lat,
      user_lng: lng,
      radius_km: radiusKm
    })

  if (error) throw error
  return data
}
