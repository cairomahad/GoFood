import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react'
import { Input, Button } from '../../components/common/FormElements'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../config/supabase'
import { validateEmail, validatePassword } from '../../utils/validation'
import { toast } from 'react-toastify'
import { fadeInUp, fadeIn } from '../../utils/animations'

const Login = () => {
  const navigate = useNavigate()
  const { login, loginAsGuest } = useAuth()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value })
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' })
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setEmailNotConfirmed(false)
    setLoading(true)
    try {
      await login(formData.email, formData.password)
      toast.success('Добро пожаловать!')
      navigate('/feed')
    } catch (error) {
      const msg = error.message || ''
      if (msg.toLowerCase().includes('email not confirmed')) {
        // Email не подтверждён — показать блок с повторной отправкой
        setEmailNotConfirmed(true)
      } else if (msg.toLowerCase().includes('invalid login credentials')) {
        toast.error('Неверный email или пароль')
      } else {
        toast.error(msg || 'Ошибка входа')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    setResendLoading(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email
      })
      if (error) throw error
      toast.success('Письмо отправлено! Проверь почту.')
    } catch (error) {
      toast.error('Не удалось отправить письмо')
    } finally {
      setResendLoading(false)
    }
  }

  const handleGuestLogin = async () => {
    setGuestLoading(true)
    try {
      await loginAsGuest()
      toast.success('Вы вошли как гость!')
      navigate('/feed')
    } catch (error) {
      toast.error('Ошибка входа: ' + (error.message || 'Попробуйте позже'))
    } finally {
      setGuestLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary to-secondary">
        <div className="absolute inset-0 bg-black/20" />
        <img
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80"
          alt="Food"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="text-white text-center"
          >
            <h1 className="text-5xl font-bold mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
              GoFoods
            </h1>
            <p className="text-xl opacity-90" style={{ fontFamily: 'Inter, sans-serif' }}>
              Share, Sell & Discover Local Food
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-neutral-50">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-neutral-900 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Welcome Back
            </h2>
            <p className="text-neutral-600" style={{ fontFamily: 'Inter, sans-serif' }}>
              Sign in to continue to GoFoods
            </p>
          </div>

          {/* Блок: email не подтверждён */}
          {emailNotConfirmed && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col gap-3"
            >
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Email не подтверждён</p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    Мы отправили письмо на <strong>{formData.email}</strong>. Найди его и нажми на ссылку подтверждения.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendLoading}
                className="flex items-center justify-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-900 disabled:opacity-50"
              >
                <RefreshCw size={14} className={resendLoading ? 'animate-spin' : ''} />
                {resendLoading ? 'Отправляем...' : 'Отправить письмо снова'}
              </button>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              error={errors.email}
              icon={Mail}
              placeholder="you@example.com"
              required
            />

            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleChange('password')}
              error={errors.password}
              icon={Lock}
              placeholder="Enter your password"
              required
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-neutral-300 text-primary focus:ring-primary" />
                <span className="text-sm text-neutral-600">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-primary hover:text-primary/80">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" variant="primary" fullWidth loading={loading} icon={ArrowRight}>
              Sign In
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-neutral-50 text-neutral-500">или</span>
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
          </form>

          <div className="mt-8 text-center">
            <p className="text-neutral-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary font-medium hover:text-primary/80">
                Sign up
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Login
