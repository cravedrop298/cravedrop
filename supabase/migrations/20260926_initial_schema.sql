-- ============================================================
-- CRAVEDROP PLATFORM - PRODUCTION SUPABASE SCHEMA & RLS
-- PostgreSQL / Supabase Schema Definition with Automated Triggers
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES TABLE (User Accounts: Customer, Restaurant Partner, Admin)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'restaurant', 'admin')),
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  interests TEXT[] DEFAULT '{}',
  phone TEXT DEFAULT '',
  city TEXT DEFAULT 'Metropolis',
  lat NUMERIC(9,6),
  lng NUMERIC(9,6),
  restaurant_id UUID,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. RESTAURANTS TABLE
CREATE TABLE IF NOT EXISTS public.restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT NOT NULL DEFAULT '',
  cover_url TEXT NOT NULL DEFAULT '',
  bio TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  cuisine TEXT[] DEFAULT '{}',
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Metropolis',
  lat NUMERIC(9,6) NOT NULL DEFAULT 40.7128,
  lng NUMERIC(9,6) NOT NULL DEFAULT -74.0060,
  delivery_time_min INT NOT NULL DEFAULT 20,
  delivery_time_max INT NOT NULL DEFAULT 35,
  delivery_fee NUMERIC(5,2) NOT NULL DEFAULT 2.99,
  min_order NUMERIC(6,2) NOT NULL DEFAULT 10.00,
  rating NUMERIC(3,2) NOT NULL DEFAULT 5.00,
  review_count INT NOT NULL DEFAULT 0,
  followers_count INT NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  is_open BOOLEAN NOT NULL DEFAULT true,
  opening_hours TEXT NOT NULL DEFAULT '11:00 AM - 11:00 PM',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Foreign key link back from profiles to restaurants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_profile_restaurant'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT fk_profile_restaurant
    FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon_name TEXT DEFAULT 'Utensils',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(8,2) NOT NULL CHECK (price >= 0),
  discount_price NUMERIC(8,2) CHECK (discount_price IS NULL OR discount_price <= price),
  category TEXT NOT NULL DEFAULT 'General',
  image_url TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  prep_time_mins INT NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. FOOD POSTS (TIME-LIMITED POSTS / DROPS)
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
  caption TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('video', 'image')),
  thumbnail_url TEXT NOT NULL,
  duration_seconds INT DEFAULT 15,
  expires_at TIMESTAMPTZ NOT NULL, -- CRITICAL: Server-side post expiry time
  is_expired BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  shares_count INT DEFAULT 0,
  saves_count INT DEFAULT 0,
  views_count INT DEFAULT 0,
  orders_count INT DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. POST LIKES TABLE
CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (post_id, user_id)
);

-- 7. POST COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) > 0),
  is_reported BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. RESTAURANT FOLLOWS TABLE
CREATE TABLE IF NOT EXISTS public.restaurant_follows (
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (restaurant_id, user_id)
);

-- 9. SAVED POSTS TABLE
CREATE TABLE IF NOT EXISTS public.saved_posts (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, post_id)
);

-- 10. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE RESTRICT NOT NULL,
  associated_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  subtotal NUMERIC(8,2) NOT NULL,
  delivery_fee NUMERIC(5,2) NOT NULL,
  discount NUMERIC(6,2) DEFAULT 0.00,
  total NUMERIC(8,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash_on_delivery',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'rejected', 'cancelled')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
  product_name TEXT NOT NULL,
  price NUMERIC(8,2) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0)
);

-- 12. ORDER STATUS HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL,
  note TEXT DEFAULT '',
  timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('order', 'follow', 'like', 'comment', 'drop', 'system')),
  action_url TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. REPORTS TABLE (Moderation)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reported_type TEXT NOT NULL CHECK (reported_type IN ('post', 'restaurant', 'comment', 'user')),
  reported_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'fake_information', 'inappropriate_content', 'fraud_scam', 'copyright', 'offensive', 'other')),
  details TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
  action_taken TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- AUTOMATED USER REGISTRATION TRIGGER
-- Auto-creates a profile record in public.profiles when auth.users is created
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    auth_user_id,
    email,
    name,
    full_name,
    username,
    avatar_url,
    role,
    onboarding_completed
  )
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    LOWER(REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)), '[^a-zA-Z0-9_]', '_', 'g')) || '_' || SUBSTRING(NEW.id::text, 1, 4),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    COALESCE((NEW.raw_user_meta_data->>'onboarding_completed')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = timezone('utc'::text, now());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- AUTOMATIC EXPIRY FUNCTION FOR FOOD DROPS
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_expired_food_posts()
RETURNS void AS $$
BEGIN
  UPDATE public.posts
  SET is_expired = true
  WHERE expires_at <= timezone('utc'::text, now()) AND is_expired = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Profiles: Public read, self-write
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Restaurants: Public read, owner manage
CREATE POLICY "Restaurants are viewable by everyone" ON public.restaurants FOR SELECT USING (true);
CREATE POLICY "Owners can insert restaurant" ON public.restaurants FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their restaurant" ON public.restaurants FOR UPDATE USING (auth.uid() = owner_id);

-- Products: Public read, restaurant owner manage
CREATE POLICY "Public can view active products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Restaurant owners can manage products" ON public.products FOR ALL USING (
  EXISTS (SELECT 1 FROM public.restaurants WHERE id = products.restaurant_id AND owner_id = auth.uid())
);

-- Posts: Public view non-hidden, restaurant owners create/manage
CREATE POLICY "Public can view active drops" ON public.posts FOR SELECT USING (is_hidden = false);
CREATE POLICY "Restaurant owners can create posts" ON public.posts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.restaurants WHERE id = posts.restaurant_id AND owner_id = auth.uid())
);
CREATE POLICY "Restaurant owners can update posts" ON public.posts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.restaurants WHERE id = posts.restaurant_id AND owner_id = auth.uid())
);

-- Likes, Comments, Saves, Follows: Self-managed
CREATE POLICY "Public view likes" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users toggle own likes" ON public.post_likes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public view comments" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Users post comments" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON public.post_comments FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users view own follows" ON public.restaurant_follows FOR SELECT USING (true);
CREATE POLICY "Users toggle own follows" ON public.restaurant_follows FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users view own saved drops" ON public.saved_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users toggle saved drops" ON public.saved_posts FOR ALL USING (auth.uid() = user_id);

-- Orders: Customer can view/place, Restaurant owner can view/update
CREATE POLICY "Customers view own orders" ON public.orders FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Restaurants view orders" ON public.orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.restaurants WHERE id = orders.restaurant_id AND owner_id = auth.uid())
);
CREATE POLICY "Customers can place orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Restaurants update orders" ON public.orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.restaurants WHERE id = orders.restaurant_id AND owner_id = auth.uid())
);

CREATE POLICY "Order items viewable with order access" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND (customer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.restaurants WHERE id = orders.restaurant_id AND owner_id = auth.uid())))
);
CREATE POLICY "Customers insert order items" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND customer_id = auth.uid())
);

-- Notifications
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Reports
CREATE POLICY "Users submit reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins view and manage reports" ON public.reports FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_expires_at ON public.posts (expires_at);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_restaurant_id ON public.posts (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_products_restaurant ON public.products (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON public.orders (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
