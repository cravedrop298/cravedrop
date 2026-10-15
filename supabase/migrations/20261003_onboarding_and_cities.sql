-- ============================================================
-- CRAVEDROP PLATFORM - ONBOARDING, CITIES & PROFILE ENFORCEMENT
-- Migration: 20261003_onboarding_and_cities.sql
-- ============================================================

-- 1. CITIES TABLE
CREATE TABLE IF NOT EXISTS public.cities (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  province TEXT,
  country TEXT DEFAULT 'Pakistan',
  lat NUMERIC(9,6),
  lng NUMERIC(9,6),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on cities
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cities are viewable by everyone" ON public.cities;
CREATE POLICY "Cities are viewable by everyone" ON public.cities FOR SELECT USING (true);

-- Seed Pakistani cities
INSERT INTO public.cities (id, name, province, country, lat, lng, is_active)
VALUES
  ('lahore', 'Lahore', 'Punjab', 'Pakistan', 31.5204, 74.3587, true),
  ('karachi', 'Karachi', 'Sindh', 'Pakistan', 24.8607, 67.0011, true),
  ('islamabad', 'Islamabad', 'Federal Capital', 'Pakistan', 33.6844, 73.0479, true),
  ('rawalpindi', 'Rawalpindi', 'Punjab', 'Pakistan', 33.5651, 73.0169, true),
  ('peshawar', 'Peshawar', 'Khyber Pakhtunkhwa', 'Pakistan', 34.0151, 71.5249, true),
  ('faisalabad', 'Faisalabad', 'Punjab', 'Pakistan', 31.4504, 73.1350, true),
  ('multan', 'Multan', 'Punjab', 'Pakistan', 30.1575, 71.5249, true),
  ('gujranwala', 'Gujranwala', 'Punjab', 'Pakistan', 32.1877, 74.1945, true),
  ('sialkot', 'Sialkot', 'Punjab', 'Pakistan', 32.4945, 74.5229, true),
  ('quetta', 'Quetta', 'Balochistan', 'Pakistan', 30.1798, 66.9750, true),
  ('hyderabad', 'Hyderabad', 'Sindh', 'Pakistan', 25.3960, 68.3578, true),
  ('bahawalpur', 'Bahawalpur', 'Punjab', 'Pakistan', 29.3544, 71.6911, true),
  ('sargodha', 'Sargodha', 'Punjab', 'Pakistan', 32.0836, 72.6711, true),
  ('abbottabad', 'Abbottabad', 'Khyber Pakhtunkhwa', 'Pakistan', 34.1688, 73.2215, true),
  ('sukkur', 'Sukkur', 'Sindh', 'Pakistan', 27.7052, 68.8574, true),
  ('mardan', 'Mardan', 'Khyber Pakhtunkhwa', 'Pakistan', 34.1989, 72.0404, true),
  ('gujrat', 'Gujrat', 'Punjab', 'Pakistan', 32.5742, 74.0754, true)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  province = EXCLUDED.province,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  is_active = EXCLUDED.is_active;

-- 2. ALTER PROFILES TABLE
-- Add city_id column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city_id TEXT;

-- Drop default 'Metropolis' if present
ALTER TABLE public.profiles ALTER COLUMN city DROP DEFAULT;

-- Allow empty name/username during intermediate registration state before onboarding is completed
ALTER TABLE public.profiles ALTER COLUMN username DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN name DROP NOT NULL;

-- 3. UPDATE USER REGISTRATION TRIGGER
-- Eliminates automatic email-based username and Unsplash placeholder avatar
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
    city,
    city_id,
    role,
    onboarding_completed
  )
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    COALESCE(NEW.raw_user_meta_data->>'city_id', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    false
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = timezone('utc'::text, now());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
