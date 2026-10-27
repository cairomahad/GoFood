import { supabase } from '../config/supabase'

export const createBookmark = async (userId, foodItemId) => {
  const { data, error } = await supabase
    .from('bookmarks')
    .insert({ user_id: userId, food_item_id: foodItemId })
    .select()
    .single()

  if (error) throw error
  return data
}

export const getBookmarksByUser = async (userId) => {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('*, food_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return { documents: data || [] }
}

export const checkBookmark = async (userId, foodItemId) => {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', userId)
    .eq('food_item_id', foodItemId)
    .maybeSingle()

  if (error) throw error
  return data
}

export const deleteBookmark = async (bookmarkId) => {
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('id', bookmarkId)

  if (error) throw error
}

export const deleteBookmarksByFoodItem = async (foodItemId) => {
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('food_item_id', foodItemId)

  if (error) throw error
}
