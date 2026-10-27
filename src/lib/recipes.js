import { supabase } from '../config/supabase'

// ─── Рецепты ──────────────────────────────────────────────────────────────────

export const createRecipe = async (data) => {
  if (!data.userId) throw new Error('userId is required')

  const { data: recipe, error } = await supabase
    .from('recipes')
    .insert({
      user_id: data.userId,
      title: data.title,
      description: data.description || '',
      ingredients: data.ingredients || [],
      steps: data.steps || [],
      cook_time_minutes: data.cookTimeMinutes,
      servings: data.servings || null,
      image_url: data.imageId || null,
      linked_food_item_id: data.linkedFoodItemId || null,
      visibility: data.visibility || 'public'
    })
    .select()
    .single()

  if (error) throw error
  return recipe
}

export const getRecipes = async (filters = {}) => {
  let query = supabase
    .from('recipes')
    .select('*, users!user_id(display_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (filters.userId) {
    query = query.eq('user_id', filters.userId)
  } else {
    query = query.eq('visibility', 'public')
  }

  if (filters.cookTimeMax) {
    query = query.lte('cook_time_minutes', filters.cookTimeMax)
  }

  const { data, error } = await query
  if (error) throw error
  return { documents: data || [] }
}

export const getRecipeById = async (recipeId) => {
  const { data, error } = await supabase
    .from('recipes')
    .select('*, users!user_id(display_name, avatar_url)')
    .eq('id', recipeId)
    .single()

  if (error) throw error
  return data
}

export const updateRecipe = async (recipeId, data) => {
  const { data: updated, error } = await supabase
    .from('recipes')
    .update(data)
    .eq('id', recipeId)
    .select()
    .single()

  if (error) throw error
  return updated
}

export const deleteRecipe = async (recipeId) => {
  const { error } = await supabase.from('recipes').delete().eq('id', recipeId)
  if (error) throw error
}

export const uploadRecipeImage = async (file, recipeId) => {
  const ext = file.name.split('.').pop()
  const path = `recipes/${recipeId || Date.now()}.${ext}`

  const { data, error } = await supabase.storage
    .from('food-images')
    .upload(path, file, { upsert: true })

  if (error) throw error
  return data
}

export const getRecipeImageUrl = (path) => {
  if (!path) return null
  const { data } = supabase.storage.from('food-images').getPublicUrl(path)
  return data.publicUrl
}

export const searchRecipes = async (searchTerm) => {
  if (!searchTerm) return []

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('visibility', 'public')
    .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
    .limit(20)

  if (error) throw error
  return data || []
}
