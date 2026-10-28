import { supabase } from '../config/supabase'

// ─── Аватар URL (нужен до normalizeUser) ──────────────────────────────────────

export const getAvatarUrl = (path) => {
  if (!path) return null
  if (String(path).startsWith('http')) return path
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
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

const toDbFields = (data = {}) => {
  const map = {
    displayName: 'display_name',
    avatarFileId: 'avatar_url',
    avatarUrl: 'avatar_url',
    isVerified: 'is_verified',
    telegramId: 'telegram_id',
    telegramUsername: 'telegram_username',
    telegramNotify: 'telegram_notify'
  }

  const out = {}
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue
    const dbKey = map[key] || key
    // Не пропускать Appwrite-поля которых нет в схеме
    if (['$id', 'authId', 'createdAt', 'updatedAt'].includes(key)) continue
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
  const ext = file.name.split('.').pop()
  const path = `${userId || 'anon'}/avatar.${ext}`

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true })

  if (error) throw error
  // Возвращаем путь (сохраняется в users.avatar_url)
  return data.path
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
