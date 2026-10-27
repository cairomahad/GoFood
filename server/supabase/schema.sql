-- =========================================================================
-- GoFoods Database Schema для Supabase (PostgreSQL)
-- =========================================================================

-- Включить расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- для координат

-- ─────────────────────────────────────────────────────────────────────────
-- Таблица: users (пользователи)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- связь с Supabase Auth
  
  -- Основная информация
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  avatar_url TEXT,
  phone VARCHAR(50),
  bio TEXT,
  
  -- Адрес и координаты
  address TEXT,
  location GEOGRAPHY(POINT, 4326), -- PostGIS: lat, lng
  
  -- Telegram
  telegram_id VARCHAR(50) UNIQUE,
  telegram_username VARCHAR(100),
  telegram_notify BOOLEAN DEFAULT TRUE,
  
  -- Роль и статус
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'cook', 'admin')),
  is_verified BOOLEAN DEFAULT FALSE,
  suspended BOOLEAN DEFAULT FALSE,
  
  -- Временные метки
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX idx_users_telegram_id ON public.users(telegram_id);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_location ON public.users USING GIST(location); -- для геопоиска

-- ─────────────────────────────────────────────────────────────────────────
-- Таблица: food_items (блюда)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.food_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cook_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Информация о блюде
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- homemade, restaurant, bakery
  price DECIMAL(10, 2) NOT NULL,
  
  -- Медиа
  image_url TEXT,
  
  -- Статус
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'sold', 'unavailable')),
  is_donation BOOLEAN DEFAULT FALSE,
  
  -- Временные метки
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_food_items_cook_id ON public.food_items(cook_id);
CREATE INDEX idx_food_items_status ON public.food_items(status);

-- ─────────────────────────────────────────────────────────────────────────
-- Таблица: orders (заказы)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Участники
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  cook_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  telegram_id VARCHAR(50) NOT NULL, -- для отправки уведомлений
  
  -- Заказанные блюда (JSON)
  items JSONB NOT NULL,
  -- Пример: [{"food_id": "uuid", "name": "Плов", "quantity": 2, "price": 8.50}]
  
  -- Стоимость
  total_price DECIMAL(10, 2) NOT NULL,
  delivery_fee DECIMAL(10, 2) DEFAULT 0,
  cook_earnings DECIMAL(10, 2),
  
  -- Адрес доставки
  delivery_address TEXT NOT NULL,
  delivery_coords GEOGRAPHY(POINT, 4326), -- lat, lng
  delivery_phone VARCHAR(50) NOT NULL,
  delivery_notes TEXT,
  
  -- Uber Direct
  uber_delivery_id VARCHAR(255) UNIQUE,
  uber_tracking_url TEXT,
  uber_status VARCHAR(50),
  
  -- Статусы
  status VARCHAR(50) DEFAULT 'pending' CHECK (
    status IN ('pending', 'cooking', 'courier_assigned', 'in_delivery', 'delivered', 'cancelled')
  ),
  payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (
    payment_status IN ('unpaid', 'paid', 'refunded')
  ),
  
  -- Временные метки
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  courier_assigned_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_cook_id ON public.orders(cook_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_telegram_id ON public.orders(telegram_id);
CREATE INDEX idx_orders_uber_delivery_id ON public.orders(uber_delivery_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Таблица: messages (сообщения)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────
-- Таблица: bookmarks (избранное)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  food_item_id UUID REFERENCES public.food_items(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, food_item_id)
);

CREATE INDEX idx_bookmarks_user_id ON public.bookmarks(user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Таблица: notifications (уведомления)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  
  metadata JSONB, -- дополнительные данные (order_id и т.д.)
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);

-- ─────────────────────────────────────────────────────────────────────────
-- Функция: автоматическое обновление updated_at
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Применить к таблицам
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_food_items_updated_at BEFORE UPDATE ON public.food_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security (RLS) — безопасность на уровне строк
-- ─────────────────────────────────────────────────────────────────────────

-- Включить RLS для всех таблиц
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Политики для users
CREATE POLICY "Пользователи видны всем" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Пользователь может обновлять свой профиль" ON public.users
  FOR UPDATE USING (auth.uid() = auth_id);

-- Политики для food_items
CREATE POLICY "Блюда видны всем" ON public.food_items
  FOR SELECT USING (true);

CREATE POLICY "Повар может создавать блюда" ON public.food_items
  FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_id FROM public.users WHERE id = cook_id));

CREATE POLICY "Повар может редактировать свои блюда" ON public.food_items
  FOR UPDATE USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = cook_id));

-- Политики для orders
CREATE POLICY "Пользователь видит свои заказы" ON public.orders
  FOR SELECT USING (
    auth.uid() = (SELECT auth_id FROM public.users WHERE id = customer_id) OR
    auth.uid() = (SELECT auth_id FROM public.users WHERE id = cook_id)
  );

CREATE POLICY "Пользователь может создавать заказы" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_id FROM public.users WHERE id = customer_id));

-- Политики для messages
CREATE POLICY "Пользователь видит свои сообщения" ON public.messages
  FOR SELECT USING (
    auth.uid() = (SELECT auth_id FROM public.users WHERE id = sender_id) OR
    auth.uid() = (SELECT auth_id FROM public.users WHERE id = receiver_id)
  );

-- Политики для bookmarks
CREATE POLICY "Пользователь видит свои закладки" ON public.bookmarks
  FOR SELECT USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));

CREATE POLICY "Пользователь может создавать закладки" ON public.bookmarks
  FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));

-- Политики для notifications
CREATE POLICY "Пользователь видит свои уведомления" ON public.notifications
  FOR SELECT USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));

-- ─────────────────────────────────────────────────────────────────────────
-- Функция: поиск поваров рядом (геопоиск)
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION find_nearby_cooks(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  display_name VARCHAR,
  address TEXT,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.display_name,
    u.address,
    ST_Distance(
      u.location::geometry,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geometry
    ) / 1000 AS distance_km
  FROM public.users u
  WHERE 
    u.role = 'cook' 
    AND u.location IS NOT NULL
    AND ST_DWithin(
      u.location::geometry,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geometry,
      radius_km * 1000
    )
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────
-- Готово! Запусти этот файл в Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────
