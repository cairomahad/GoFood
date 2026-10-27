import { supabase } from '../config/supabase'
import { deleteBookmarksByFoodItem } from './bookmarks'

// ─── Создание блюда ───────────────────────────────────────────────────────────

export const createFoodItem = async (data) => {
  if (!data.ownerId) throw new Error('ownerId is required')

  const { data: item, error } = await supabase
    .from('food_items')
    .insert({
      cook_id: data.ownerId,
      name: data.title,
      description: data.description || '',
      category: data.foodType,
      price: data.price || 0,
      is_donation: data.isDonation || false,
      status: 'available',
      // Расширенные поля (если нужны — добавить в schema.sql)
      tags: data.tags || [],
      pickup: data.pickup || false,
      delivery: data.delivery || false,
      pickup_address: data.pickupAddress || null,
      delivery_radius_km: data.deliveryRadiusKm || 0,
      available_from: data.availableFrom || new Date().toISOString(),
      available_until: data.availableUntil || null,
      quantity: data.quantity || 1
    })
    .select()
    .single()

  if (error) throw error
  return item
}

// ─── Список блюд ──────────────────────────────────────────────────────────────

export const getFoodItems = async (filters = {}) => {
  let query = supabase
    .from('food_items')
    .select('*, users!cook_id(display_name, avatar_url, telegram_id)')
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(50)

  if (filters.foodType) {
    query = query.eq('category', filters.foodType)
  }

  if (filters.isDonation !== undefined) {
    query = query.eq('is_donation', filters.isDonation)
  }

  const { data, error } = await query
  if (error) throw error

  return { documents: data || [] }
}

// ─── Одно блюдо ───────────────────────────────────────────────────────────────

export const getFoodItemById = async (itemId) => {
  const { data, error } = await supabase
    .from('food_items')
    .select('*, users!cook_id(display_name, avatar_url, phone, address, location)')
    .eq('id', itemId)
    .single()

  if (error) throw error
  return data
}

// ─── Обновление ───────────────────────────────────────────────────────────────

export const updateFoodItem = async (itemId, data) => {
  const { data: updated, error } = await supabase
    .from('food_items')
    .update(data)
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw error
  return updated
}

// ─── Удаление ─────────────────────────────────────────────────────────────────

export const deleteFoodItem = async (itemId) => {
  await deleteBookmarksByFoodItem(itemId)

  const { error } = await supabase
    .from('food_items')
    .delete()
    .eq('id', itemId)

  if (error) throw error
}

// ─── Изображения (Supabase Storage) ──────────────────────────────────────────

export const uploadFoodImage = async (file, itemId) => {
  const ext = file.name.split('.').pop()
  const path = `${itemId || Date.now()}/${Date.now()}.${ext}`

  const { data, error } = await supabase.storage
    .from('food-images')
    .upload(path, file, { upsert: true })

  if (error) throw error
  return data
}

export const getFoodImageUrl = (path) => {
  if (!path) return null
  const { data } = supabase.storage.from('food-images').getPublicUrl(path)
  return data.publicUrl
}

export const deleteFoodImage = async (path) => {
  const { error } = await supabase.storage.from('food-images').remove([path])
  if (error) throw error
}

// ─── Поиск ───────────────────────────────────────────────────────────────────

export const searchFoodItems = async (searchTerm) => {
  if (!searchTerm) return []

  const { data, error } = await supabase
    .from('food_items')
    .select('*')
    .eq('status', 'available')
    .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
    .limit(20)

  if (error) throw error
  return data
}

// ─── Live location ────────────────────────────────────────────────────────────

export const updateLiveLocation = async (itemId, location) => {
  const { data, error } = await supabase
    .from('food_items')
    .update({ live_location: location })
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw error
  return data
}

export const clearLiveLocation = async (itemId) => {
  const { data, error } = await supabase
    .from('food_items')
    .update({ live_location: null })
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Вспомогательная функция для обратной совместимости ──────────────────────

export const parseFoodItemImages = (item) => {
  if (!item) return item
  return {
    ...item,
    images: Array.isArray(item.images) ? item.images : []
  }
}
