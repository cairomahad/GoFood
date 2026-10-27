import { supabase } from '../config/supabase'

export const createNotification = async (notificationData) => {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: notificationData.userId,
      type: notificationData.type,
      title: notificationData.title || null,
      message: notificationData.message || JSON.stringify(notificationData.payload || {}),
      metadata: notificationData.payload || {},
      read: false
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export const getUserNotifications = async (userId, limit = 50) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export const markNotificationAsRead = async (notificationId) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .select()
    .single()

  if (error) throw error
  return data
}

export const markAllNotificationsAsRead = async (userId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)

  if (error) throw error
  return true
}

export const deleteNotification = async (notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)

  if (error) throw error
  return true
}

// ─── Realtime подписка ────────────────────────────────────────────────────────

export const subscribeToNotifications = (userId, callback) => {
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => callback(payload.new)
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}
