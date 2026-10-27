-- =========================================================================
-- GoFoods — полная схема базы данных для Supabase
-- Запусти этот файл в Supabase: SQL Editor → New query → Run
-- =========================================================================

-- Расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- генерация UUID
CREATE EXTENSION IF NOT EXISTS "postgis";      -- работа с координатами

-- =========================================================================
-- 1. USERS
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id       UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  email         VARCHAR(255) UNIQUE NOT NULL,
  display_name  VARCHAR(255),
  avatar_url    TEXT,
  phone         VARCHAR(50),
  bio           TEXT,
  address       TEXT,
  location      GEOGRAPHY(POINT, 4326),   -- координаты (PostGIS)

  -- Telegram
  telegram_id       VARCHAR(50) UNIQUE,
  telegram_username VARCHAR(100),
  telegram_notify   BOOLEAN DEFAULT TRUE,

  -- Роль и статус
  role         VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'cook', 'admin')),
  is_verified  BOOLEAN DEFAULT FALSE,
  suspended    BOOLEAN DEFAULT FALSE,

  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_auth_id      ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_telegram_id  ON public.users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_role         ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_location     ON public.users USING GIST(location);

-- =========================================================================
-- 2. FOOD_ITEMS (блюда)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.food_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cook_id     UUID REFERENCES public.users(id) ON DELETE CASCADE,

  name        VARCHAR(255) NOT NULL,
  description TEXT,
  category    VARCHAR(50),               -- homemade, restaurant, bakery и т.д.
  tags        TEXT[]       DEFAULT '{}',
  price       DECIMAL(10, 2) NOT NULL DEFAULT 0,
  is_donation BOOLEAN DEFAULT FALSE,

  -- Изображения
  image_url   TEXT,
  images      TEXT[]       DEFAULT '{}', -- массив URL

  -- Доставка / самовывоз
  pickup               BOOLEAN DEFAULT FALSE,
  delivery             BOOLEAN DEFAULT FALSE,
  pickup_address       JSONB,
  delivery_radius_km   DECIMAL(5, 1) DEFAULT 0,

  -- Количество и доступность
  quantity        INTEGER DEFAULT 1,
  available_from  TIMESTAMPTZ DEFAULT NOW(),
  available_until TIMESTAMPTZ,

  -- Локация повара в реальном времени
  live_location  JSONB,

  status  VARCHAR(20) DEFAULT 'available'
          CHECK (status IN ('available', 'sold', 'unavailable')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_items_cook_id  ON public.food_items(cook_id);
CREATE INDEX IF NOT EXISTS idx_food_items_status   ON public.food_items(status);
CREATE INDEX IF NOT EXISTS idx_food_items_category ON public.food_items(category);

-- =========================================================================
-- 3. REQUESTS (запросы на получение блюда)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  food_item_id UUID REFERENCES public.food_items(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  owner_id     UUID REFERENCES public.users(id) ON DELETE CASCADE,

  message             TEXT DEFAULT '',
  status              VARCHAR(30) DEFAULT 'pending'
                      CHECK (status IN (
                        'pending','accepted','rejected',
                        'collected','cancelled','completed'
                      )),
  pickup_or_delivery  VARCHAR(20) DEFAULT 'pickup'
                      CHECK (pickup_or_delivery IN ('pickup','delivery')),
  proposed_time       TIMESTAMPTZ,

  -- Геолокация участников
  requester_location  JSONB,
  owner_location      JSONB,
  handoff_point       JSONB,

  -- Маршрут и трекинг
  route_path    JSONB DEFAULT '[]',
  share_enabled BOOLEAN DEFAULT FALSE,
  share_token   VARCHAR(100) UNIQUE,

  -- Оценка
  rating    DECIMAL(2, 1),
  feedback  TEXT,

  -- Временные метки
  confirmed_at  TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requests_food_item_id  ON public.requests(food_item_id);
CREATE INDEX IF NOT EXISTS idx_requests_requester_id  ON public.requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_requests_owner_id      ON public.requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_requests_status        ON public.requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_share_token   ON public.requests(share_token);

-- =========================================================================
-- 4. ORDERS (заказы с доставкой через Uber)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  cook_id     UUID REFERENCES public.users(id) ON DELETE CASCADE,
  telegram_id VARCHAR(50) NOT NULL,

  items         JSONB NOT NULL,
  -- Пример: [{"food_id":"uuid","name":"Плов","quantity":2,"price":8.50}]

  total_price    DECIMAL(10, 2) NOT NULL,
  delivery_fee   DECIMAL(10, 2) DEFAULT 0,
  cook_earnings  DECIMAL(10, 2),

  delivery_address TEXT    NOT NULL,
  delivery_coords  GEOGRAPHY(POINT, 4326),
  delivery_phone   VARCHAR(50),
  delivery_notes   TEXT,

  -- Uber Direct
  uber_delivery_id  VARCHAR(255) UNIQUE,
  uber_tracking_url TEXT,
  uber_status       VARCHAR(50),

  status VARCHAR(50) DEFAULT 'pending'
         CHECK (status IN (
           'pending','cooking','courier_assigned',
           'in_delivery','delivered','cancelled',
           'rejected','delivery_cancelled'
         )),
  payment_status VARCHAR(20) DEFAULT 'unpaid'
                 CHECK (payment_status IN ('unpaid','paid','refunded')),

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  accepted_at         TIMESTAMPTZ,
  courier_assigned_at TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id       ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_cook_id           ON public.orders(cook_id);
CREATE INDEX IF NOT EXISTS idx_orders_status            ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_telegram_id       ON public.orders(telegram_id);
CREATE INDEX IF NOT EXISTS idx_orders_uber_delivery_id  ON public.orders(uber_delivery_id);

-- =========================================================================
-- 5. MESSAGES (сообщения между пользователями)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id   UUID REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  request_id  UUID REFERENCES public.requests(id) ON DELETE SET NULL,

  content     TEXT NOT NULL,
  read        BOOLEAN DEFAULT FALSE,

  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id   ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_request_id  ON public.messages(request_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at  ON public.messages(created_at DESC);

-- =========================================================================
-- 6. BOOKMARKS (избранное)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES public.users(id) ON DELETE CASCADE,
  food_item_id UUID REFERENCES public.food_items(id) ON DELETE CASCADE,

  created_at   TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, food_item_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);

-- =========================================================================
-- 7. NOTIFICATIONS (уведомления)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id  UUID REFERENCES public.users(id) ON DELETE CASCADE,

  type     VARCHAR(50) NOT NULL,  -- message, request, match, system
  title    VARCHAR(255),
  message  TEXT NOT NULL,
  read     BOOLEAN DEFAULT FALSE,
  metadata JSONB,                  -- доп. данные: order_id, request_id и т.д.

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read    ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type    ON public.notifications(type);

-- =========================================================================
-- 8. RECIPES (рецепты)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.recipes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID REFERENCES public.users(id) ON DELETE CASCADE,

  title               VARCHAR(255) NOT NULL,
  description         TEXT,
  ingredients         JSONB DEFAULT '[]',
  -- Пример: [{"name":"Рис","amount":"2 стакана"},{"name":"Баранина","amount":"500г"}]
  steps               JSONB DEFAULT '[]',
  -- Пример: [{"step":1,"text":"Промыть рис"},{"step":2,"text":"Обжарить мясо"}]

  cook_time_minutes   INTEGER,
  servings            INTEGER,
  image_url           TEXT,
  linked_food_item_id UUID REFERENCES public.food_items(id) ON DELETE SET NULL,
  visibility          VARCHAR(20) DEFAULT 'public'
                      CHECK (visibility IN ('public','private')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipes_user_id    ON public.recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_visibility ON public.recipes(visibility);

-- =========================================================================
-- 9. RECIPE_COMMENTS (комментарии к рецептам)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.recipe_comments (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES public.users(id) ON DELETE CASCADE,

  content   TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipe_comments_recipe_id ON public.recipe_comments(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_comments_user_id   ON public.recipe_comments(user_id);

-- =========================================================================
-- TRIGGERS — автообновление updated_at
-- =========================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_food_items_updated_at
  BEFORE UPDATE ON public.food_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- ROW LEVEL SECURITY (RLS)
-- =========================================================================

ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_comments ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY "users: read all"        ON public.users FOR SELECT USING (true);
CREATE POLICY "users: insert own"      ON public.users FOR INSERT WITH CHECK (auth.uid() = auth_id);
CREATE POLICY "users: update own"      ON public.users FOR UPDATE USING (auth.uid() = auth_id);

-- food_items
CREATE POLICY "food: read all"         ON public.food_items FOR SELECT USING (true);
CREATE POLICY "food: insert by cook"   ON public.food_items FOR INSERT
  WITH CHECK (auth.uid() = (SELECT auth_id FROM public.users WHERE id = cook_id));
CREATE POLICY "food: update by cook"   ON public.food_items FOR UPDATE
  USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = cook_id));
CREATE POLICY "food: delete by cook"   ON public.food_items FOR DELETE
  USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = cook_id));

-- requests
CREATE POLICY "requests: read own"     ON public.requests FOR SELECT
  USING (
    auth.uid() = (SELECT auth_id FROM public.users WHERE id = requester_id) OR
    auth.uid() = (SELECT auth_id FROM public.users WHERE id = owner_id)
  );
CREATE POLICY "requests: insert"       ON public.requests FOR INSERT
  WITH CHECK (auth.uid() = (SELECT auth_id FROM public.users WHERE id = requester_id));
CREATE POLICY "requests: update own"   ON public.requests FOR UPDATE
  USING (
    auth.uid() = (SELECT auth_id FROM public.users WHERE id = requester_id) OR
    auth.uid() = (SELECT auth_id FROM public.users WHERE id = owner_id)
  );

-- orders (читает владелец или повар)
CREATE POLICY "orders: read own"       ON public.orders FOR SELECT
  USING (
    auth.uid() = (SELECT auth_id FROM public.users WHERE id = customer_id) OR
    auth.uid() = (SELECT auth_id FROM public.users WHERE id = cook_id)
  );
CREATE POLICY "orders: insert own"     ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = (SELECT auth_id FROM public.users WHERE id = customer_id));

-- messages
CREATE POLICY "messages: read own"     ON public.messages FOR SELECT
  USING (
    auth.uid() = (SELECT auth_id FROM public.users WHERE id = sender_id) OR
    auth.uid() = (SELECT auth_id FROM public.users WHERE id = receiver_id)
  );
CREATE POLICY "messages: insert"       ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = (SELECT auth_id FROM public.users WHERE id = sender_id));

-- bookmarks
CREATE POLICY "bookmarks: read own"    ON public.bookmarks FOR SELECT
  USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));
CREATE POLICY "bookmarks: insert"      ON public.bookmarks FOR INSERT
  WITH CHECK (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));
CREATE POLICY "bookmarks: delete"      ON public.bookmarks FOR DELETE
  USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));

-- notifications
CREATE POLICY "notif: read own"        ON public.notifications FOR SELECT
  USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));
CREATE POLICY "notif: update own"      ON public.notifications FOR UPDATE
  USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));

-- recipes
CREATE POLICY "recipes: read public"   ON public.recipes FOR SELECT
  USING (visibility = 'public' OR auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));
CREATE POLICY "recipes: insert own"    ON public.recipes FOR INSERT
  WITH CHECK (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));
CREATE POLICY "recipes: update own"    ON public.recipes FOR UPDATE
  USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));
CREATE POLICY "recipes: delete own"    ON public.recipes FOR DELETE
  USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));

-- recipe_comments
CREATE POLICY "r_comments: read all"   ON public.recipe_comments FOR SELECT USING (true);
CREATE POLICY "r_comments: insert own" ON public.recipe_comments FOR INSERT
  WITH CHECK (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));
CREATE POLICY "r_comments: delete own" ON public.recipe_comments FOR DELETE
  USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));

-- =========================================================================
-- ФУНКЦИЯ: найти поваров рядом (геопоиск)
-- =========================================================================

CREATE OR REPLACE FUNCTION find_nearby_cooks(
  user_lat  DOUBLE PRECISION,
  user_lng  DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 10
)
RETURNS TABLE (
  id           UUID,
  display_name VARCHAR,
  address      TEXT,
  avatar_url   TEXT,
  distance_km  DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.display_name,
    u.address,
    u.avatar_url,
    ROUND(
      (ST_Distance(
        u.location::geometry,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geometry
      ) / 1000)::NUMERIC, 1
    )::DOUBLE PRECISION AS distance_km
  FROM public.users u
  WHERE
    u.role = 'cook'
    AND u.suspended = FALSE
    AND u.location IS NOT NULL
    AND ST_DWithin(
      u.location::geometry,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geometry,
      radius_km * 1000
    )
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- STORAGE BUCKETS (запусти отдельно в Supabase Dashboard или через SQL)
-- =========================================================================

-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('food-images', 'food-images', true);

-- =========================================================================
-- Готово! Все таблицы созданы.
-- =========================================================================
