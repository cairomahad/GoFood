import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, Loader as LoaderIcon } from 'lucide-react'
import { Input, Button } from '../../components/common/FormElements'
import { useAuth } from '../../context/AuthContext'
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

    setLoading(true)
    try {
      await login(formData.email, formData.password)
      toast.success('Welcome back!')
      navigate('/feed')
    } catch (error) {
      toast.error(error.message || 'Invalid email or password')
    } finally {
      setLoading(false)
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
