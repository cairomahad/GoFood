import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getUserById, createUser, saveTelegramId } from '../lib/users'

// ─── Telegram Web App SDK ─────────────────────────────────────────────────────

const getTelegramUser = () => {
  try {
    const tg = window.Telegram?.WebApp
    if (!tg) return null
    const user = tg.initDataUnsafe?.user
    if (!user?.id) return null
    return user // { id, first_name, last_name, username, photo_url }
  } catch {
    return null
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()

  // ─── Профиль пользователя ─────────────────────────────────────────────────

  const { data: user, isLoading: userLoading, refetch: refetchUser } = useQuery({
    queryKey: ['currentUser', session?.user?.id],
    queryFn: async () => {
      const profile = await getUserById(session.user.id)

      // Сохранить Telegram ID если открыто через Mini App
      const tgUser = getTelegramUser()
      if (tgUser) {
        try {
          await saveTelegramId(session.user.id, tgUser)
          console.log('[GoFoods] Telegram ID сохранён:', tgUser.id)
        } catch (e) {
          console.warn('[GoFoods] Не удалось сохранить Telegram ID:', e)
        }
      }

      return profile
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000
  })

  // ─── Восстановление сессии при загрузке ──────────────────────────────────

  useEffect(() => {
    // Получить текущую сессию
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Слушать изменения auth состояния
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      queryClient.invalidateQueries(['currentUser'])
    })

    return () => subscription.unsubscribe()
  }, [queryClient])

  // ─── Вход ────────────────────────────────────────────────────────────────

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  // ─── Magic Link (вход без пароля) ────────────────────────────────────────

  const sendMagicLink = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/feed` }
    })
    if (error) throw error
  }

  // ─── Гостевой вход ───────────────────────────────────────────────────────

  const loginAsGuest = async () => {
    // Создать временный email для гостя
    const guestEmail = `guest_${Date.now()}_${Math.random().toString(36).substring(7)}@gofoods.app`
    const guestPassword = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
    
    // Зарегистрировать и войти
    const { data, error } = await supabase.auth.signUp({
      email: guestEmail,
      password: guestPassword,
      options: { 
        data: { display_name: 'Гость' },
        emailRedirectTo: undefined // Отключить подтверждение email
      }
    })
    if (error) throw error

    // Создать профиль
    if (data.user) {
      await createUser(data.user.id, guestEmail, 'Гость')
    }

    return data
  }

  // ─── Выход ───────────────────────────────────────────────────────────────

  const logout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setSession(null)
    queryClient.clear()
  }

  // ─── Регистрация ─────────────────────────────────────────────────────────

  const register = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } }
    })
    if (error) throw error

    // Создать профиль в таблице users
    if (data.user) {
      await createUser(data.user.id, email, name)
    }

    return data
  }

  // ─── Сброс пароля ────────────────────────────────────────────────────────

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    if (error) throw error
  }

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  // ─── Value ───────────────────────────────────────────────────────────────

  const value = {
    session,
    user,
    loading: loading || userLoading,
    isAuthenticated: !!session,
    login,
    logout,
    register,
    resetPassword,
    updatePassword,
    refetchUser,
    sendMagicLink,
    loginAsGuest
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
