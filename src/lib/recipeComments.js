import { supabase } from '../config/supabase'

export const createRecipeComment = async (data) => {
  const { data: comment, error } = await supabase
    .from('recipe_comments')
    .insert({
      recipe_id: data.recipeId,
      user_id: data.userId,
      content: data.content
    })
    .select()
    .single()

  if (error) throw error
  return comment
}

export const getRecipeComments = async (recipeId) => {
  const { data, error } = await supabase
    .from('recipe_comments')
    .select('*, users!user_id(display_name, avatar_url)')
    .eq('recipe_id', recipeId)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) throw error
  return data || []
}

export const getRecipeCommentsCount = async (recipeId) => {
  const { count, error } = await supabase
    .from('recipe_comments')
    .select('*', { count: 'exact', head: true })
    .eq('recipe_id', recipeId)

  if (error) throw error
  return count || 0
}

export const deleteRecipeComment = async (commentId) => {
  const { error } = await supabase
    .from('recipe_comments')
    .delete()
    .eq('id', commentId)

  if (error) throw error
}
