import { supabase } from '../config/supabase'

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
  return data
}

export const getUserById = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', userId)
    .single()

  if (error) throw error
  return data
}

export const updateUser = async (userId, data) => {
  const { data: updated, error } = await supabase
    .from('users')
    .update(data)
    .eq('auth_id', userId)
    .select()
    .single()

  if (error) throw error
  return updated
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
  return data
}

export const getUserByTelegramId = async (telegramId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', String(telegramId))
    .maybeSingle()

  if (error) throw error
  return data
}

// ─── Аватар (Supabase Storage) ────────────────────────────────────────────────

export const uploadAvatar = async (file, userId) => {
  const ext = file.name.split('.').pop()
  const path = `${userId}/avatar.${ext}`

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true })

  if (error) throw error
  return data.path
}

export const getAvatarUrl = (path) => {
  if (!path) return null
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

export const deleteAvatar = async (path) => {
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
  return data
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
