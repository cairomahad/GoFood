import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Mail, Lock, ArrowRight, User } from 'lucide-react'
import { Input, Button } from '../common/FormElements'
import { useAuth } from '../../context/AuthContext'
import { validateEmail, validatePassword } from '../../utils/validation'
import { toast } from 'react-toastify'

const AuthModal = ({ isOpen, onClose, onSuccess }) => {
  const { login, register, loginAsGuest } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({ email: '', password: '', name: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value })
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' })
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!validateEmail(formData.email)) {
      newErrors.email = 'Введите корректный email'
    }
    if (!validatePassword(formData.password)) {
      newErrors.password = 'Минимум 8 символов'
    }
    if (!isLogin && !formData.name?.trim()) {
      newErrors.name = 'Введите имя'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      if (isLogin) {
        await login(formData.email, formData.password)
        toast.success('Добро пожаловать!')
      } else {
        await register(formData.email, formData.password, formData.name)
        toast.success('Регистрация завершена!')
      }
      onSuccess?.()
      onClose()
    } catch (error) {
      toast.error(error.message || 'Ошибка авторизации')
    } finally {
      setLoading(false)
    }
  }

  const handleGuestLogin = async () => {
    setGuestLoading(true)
    try {
      await loginAsGuest()
      toast.success('Вы вошли как гость!')
      onSuccess?.()
      onClose()
    } catch (error) {
      toast.error('Ошибка входа: ' + (error.message || 'Попробуйте позже'))
    } finally {
      setGuestLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-neutral-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {isLogin ? 'Вход' : 'Регистрация'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isLogin && (
            <Input
              label="Имя"
              type="text"
              value={formData.name}
              onChange={handleChange('name')}
              error={errors.name}
              icon={User}
              placeholder="Ваше имя"
              required
            />
          )}

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleChange('email')}
            error={errors.email}
            icon={Mail}
            placeholder="you@example.com"
            required
          />

          <Input
            label="Пароль"
            type="password"
            value={formData.password}
            onChange={handleChange('password')}
            error={errors.password}
            icon={Lock}
            placeholder={isLogin ? 'Ваш пароль' : 'Минимум 8 символов'}
            required
          />

          <Button type="submit" variant="primary" fullWidth loading={loading} icon={ArrowRight}>
            {isLogin ? 'Войти' : 'Зарегистрироваться'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-neutral-500">или</span>
            </div>
          </div>

          <Button 
            type="button" 
            variant="secondary" 
            fullWidth 
            loading={guestLoading}
            onClick={handleGuestLogin}
          >
            Войти как гость
          </Button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default AuthModal
