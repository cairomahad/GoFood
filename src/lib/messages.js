import { supabase } from '../config/supabase'
import { createNotification } from './notifications'
import { getRequestById } from './requests'

export const createMessage = async (data) => {
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      sender_id: data.senderId,
      receiver_id: data.receiverId,
      content: data.text || '',
      request_id: data.requestId || null
    })
    .select()
    .single()

  if (error) throw error

  // Уведомление получателю
  try {
    if (data.requestId) {
      const request = await getRequestById(data.requestId)
      const recipientId = data.senderId === request.requester_id
        ? request.owner_id
        : request.requester_id

      await createNotification({
        userId: recipientId,
        type: 'message',
        payload: { requestId: data.requestId, senderId: data.senderId }
      })
    }
  } catch (e) {
    console.error('Ошибка уведомления:', e)
  }

  return message
}

export const getMessagesByRequest = async (requestId) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*, users!sender_id(display_name, avatar_url)')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) throw error
  return { documents: data || [] }
}

export const markMessageAsRead = async (messageId) => {
  const { data, error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('id', messageId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Вложения ────────────────────────────────────────────────────────────────

export const uploadMessageAttachment = async (file) => {
  const path = `attachments/${Date.now()}_${file.name}`
  const { data, error } = await supabase.storage
    .from('food-images')
    .upload(path, file)

  if (error) throw error
  return data
}

export const getAttachmentUrl = (path) => {
  if (!path) return null
  const { data } = supabase.storage.from('food-images').getPublicUrl(path)
  return data.publicUrl
}

// ─── Realtime подписка ────────────────────────────────────────────────────────

export const subscribeToMessages = (requestId, callback) => {
  const channel = supabase
    .channel(`messages-${requestId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `request_id=eq.${requestId}`
      },
      (payload) => callback(payload)
    )
    .subscribe()

  // Возвращаем функцию для отписки
  return () => supabase.removeChannel(channel)
}
