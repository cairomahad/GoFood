/**
 * Supabase Configuration
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase URL и Service Role Key обязательны! Проверь .env файл')
}

// Клиент с полными правами (для серверной части)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

module.exports = { supabase }
