import { supabase } from '../config/supabase'
import { createNotification } from './notifications'

const generateShareToken = () =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`

// ─── Создание запроса ─────────────────────────────────────────────────────────

export const createRequest = async (data) => {
  const { data: request, error } = await supabase
    .from('requests')
    .insert({
      food_item_id: data.foodItemId,
      requester_id: data.requesterId,
      owner_id: data.ownerId,
      message: data.message || '',
      status: 'pending',
      pickup_or_delivery: data.pickupOrDelivery,
      proposed_time: data.proposedTime || null,
      handoff_point: data.handoffPoint || null,
      requester_location: data.requesterLocation || null,
      owner_location: data.ownerLocation || null,
      share_enabled: false,
      share_token: null,
      route_path: []
    })
    .select()
    .single()

  if (error) throw error

  // Уведомление владельцу
  try {
    await createNotification({
      userId: data.ownerId,
      type: 'request',
      payload: { requestId: request.id, foodItemId: data.foodItemId }
    })
  } catch (e) {
    console.error('Ошибка уведомления:', e)
  }

  return request
}

// ─── Получение запросов ───────────────────────────────────────────────────────

export const getRequestsByUser = async (userId) => {
  const { data, error } = await supabase
    .from('requests')
    .select('*, food_items(*)')
    .eq('requester_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return { documents: data || [] }
}

export const getRequestsByOwner = async (ownerId) => {
  const { data, error } = await supabase
    .from('requests')
    .select('*, food_items(*), users!requester_id(display_name, avatar_url)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return { documents: data || [] }
}

export const getRequestsByFoodItem = async (foodItemId) => {
  const { data, error } = await supabase
    .from('requests')
    .select('*, users!requester_id(display_name, avatar_url)')
    .eq('food_item_id', foodItemId)
    .limit(50)

  if (error) throw error
  return { documents: data || [] }
}

export const getRequestById = async (requestId) => {
  const { data, error } = await supabase
    .from('requests')
    .select('*, food_items(*), users!requester_id(display_name), users!owner_id(display_name)')
    .eq('id', requestId)
    .single()

  if (error) throw error
  return data
}

// ─── Обновление статуса ───────────────────────────────────────────────────────

export const updateRequestStatus = async (requestId, status, requestData = null) => {
  const updateData = { status }

  if (requestData?.handoffPoint) updateData.handoff_point = requestData.handoffPoint
  if (requestData?.confirmedAt) updateData.confirmed_at = requestData.confirmedAt
  if (requestData?.rating)      updateData.rating = requestData.rating
  if (requestData?.feedback)    updateData.feedback = requestData.feedback

  const { data, error } = await supabase
    .from('requests')
    .update(updateData)
    .eq('id', requestId)
    .select()
    .single()

  if (error) throw error

  if (status === 'accepted' && requestData) {
    await createNotification({
      userId: requestData.requesterId,
      type: 'match',
      payload: { requestId, foodItemId: requestData.foodItemId }
    })
  }

  return data
}

// ─── Местоположение ───────────────────────────────────────────────────────────

export const updateRequestLocation = async (requestId, location, locationType = 'requester') => {
  const field = locationType === 'requester' ? 'requester_location' : 'owner_location'

  const { data, error } = await supabase
    .from('requests')
    .update({ [field]: location })
    .eq('id', requestId)
    .select()
    .single()

  if (error) {
    console.error('Ошибка обновления локации:', error)
    return null
  }
  return data
}

export const updateHandoffPoint = async (requestId, handoffPoint) => {
  const { data: request, error: fetchError } = await supabase
    .from('requests')
    .select('requester_id, owner_id')
    .eq('id', requestId)
    .single()

  if (fetchError) throw fetchError

  const { data, error } = await supabase
    .from('requests')
    .update({ handoff_point: handoffPoint })
    .eq('id', requestId)
    .select()
    .single()

  if (error) throw error

  try {
    await Promise.all([
      createNotification({ userId: request.requester_id, type: 'system', payload: { requestId, message: 'Handoff point updated' } }),
      createNotification({ userId: request.owner_id, type: 'system', payload: { requestId, message: 'Handoff point updated' } })
    ])
  } catch (e) {
    console.error('Ошибка уведомления:', e)
  }

  return data
}

// ─── Завершение ───────────────────────────────────────────────────────────────

export const confirmCompletion = async (requestId, data = {}) => {
  const updateData = {
    status: 'collected',
    completed_at: new Date().toISOString()
  }

  if (data.rating)      updateData.rating = data.rating
  if (data.feedback)    updateData.feedback = data.feedback
  if (data.confirmedAt) updateData.confirmed_at = data.confirmedAt

  const { data: updated, error } = await supabase
    .from('requests')
    .update(updateData)
    .eq('id', requestId)
    .select()
    .single()

  if (error) throw error
  return updated
}

// ─── Trip Sharing ─────────────────────────────────────────────────────────────

export const enableTripSharing = async (requestId) => {
  const shareToken = generateShareToken()

  const { data, error } = await supabase
    .from('requests')
    .update({ share_enabled: true, share_token: shareToken })
    .eq('id', requestId)
    .select()
    .single()

  if (error) throw error
  return data
}

export const disableTripSharing = async (requestId) => {
  const { data, error } = await supabase
    .from('requests')
    .update({ share_enabled: false, share_token: null })
    .eq('id', requestId)
    .select()
    .single()

  if (error) throw error
  return data
}

export const getSharedTrip = async (shareToken) => {
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('share_token', shareToken)
    .eq('share_enabled', true)
    .maybeSingle()

  if (error) throw error
  return data
}

export const saveRouteSnapshot = async (requestId, location) => {
  try {
    const { data: request } = await supabase
      .from('requests')
      .select('route_path')
      .eq('id', requestId)
      .single()

    const currentPath = Array.isArray(request?.route_path) ? request.route_path : []
    const newPath = [...currentPath, { lat: location.lat, lng: location.lng, timestamp: Date.now() }]

    const { data, error } = await supabase
      .from('requests')
      .update({ route_path: newPath })
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Ошибка сохранения маршрута:', error)
    return null
  }
}
