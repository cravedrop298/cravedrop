-- ============================================================
-- CRAVEDROP PLATFORM - CHECKOUT, DELIVERY ADDRESSES & COVERAGE
-- Migration: 20261011_checkout_and_addresses.sql
-- ============================================================

-- 1. CITY AREAS TABLE (Allows dynamic cities & localities via database)
CREATE TABLE IF NOT EXISTS public.city_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id TEXT NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_popular BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(city_id, name)
);

ALTER TABLE public.city_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "City areas are viewable by everyone" ON public.city_areas;
CREATE POLICY "City areas are viewable by everyone"
  ON public.city_areas FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_city_areas_city_id ON public.city_areas(city_id);

-- Seed initial structured Pakistani areas/sectors
INSERT INTO public.city_areas (city_id, name, is_popular) VALUES
  -- Islamabad
  ('islamabad', 'F-6', true),
  ('islamabad', 'F-7', true),
  ('islamabad', 'F-8', true),
  ('islamabad', 'F-10', true),
  ('islamabad', 'F-11', true),
  ('islamabad', 'G-9', true),
  ('islamabad', 'G-10', true),
  ('islamabad', 'G-11', true),
  ('islamabad', 'I-8', true),
  ('islamabad', 'E-11', true),
  ('islamabad', 'Blue Area', true),
  ('islamabad', 'DHA Islamabad', true),
  ('islamabad', 'Bahria Enclave', true),
  -- Rawalpindi
  ('rawalpindi', 'Saddar', true),
  ('rawalpindi', 'Satellite Town', true),
  ('rawalpindi', 'Bahria Town', true),
  ('rawalpindi', 'Chaklala', true),
  ('rawalpindi', 'Commercial Market', true),
  ('rawalpindi', 'Westridge', true),
  ('rawalpindi', 'Peshawar Road', true),
  ('rawalpindi', 'Lalazar', true),
  -- Lahore
  ('lahore', 'Gulberg', true),
  ('lahore', 'Johar Town', true),
  ('lahore', 'DHA', true),
  ('lahore', 'Model Town', true),
  ('lahore', 'Bahria Town', true),
  ('lahore', 'Cantt', true),
  ('lahore', 'Garden Town', true),
  ('lahore', 'Wapda Town', true),
  ('lahore', 'Faisal Town', true),
  -- Karachi
  ('karachi', 'Clifton', true),
  ('karachi', 'DHA', true),
  ('karachi', 'Gulshan-e-Iqbal', true),
  ('karachi', 'North Nazimabad', true),
  ('karachi', 'PECHS', true),
  ('karachi', 'Bahadurabad', true),
  ('karachi', 'Gulistan-e-Johar', true),
  ('karachi', 'Saddar', true),
  ('karachi', 'Tariq Road', true),
  -- Faisalabad
  ('faisalabad', 'Peoples Colony', true),
  ('faisalabad', 'Madina Town', true),
  ('faisalabad', 'D Ground', true),
  ('faisalabad', 'Kohinoor City', true),
  ('faisalabad', 'Canal Road', true),
  -- Multan
  ('multan', 'Cantt', true),
  ('multan', 'Gulgasht Colony', true),
  ('multan', 'Model Town', true),
  ('multan', 'Bosan Road', true),
  ('multan', 'DHA Multan', true),
  -- Peshawar
  ('peshawar', 'Hayatabad', true),
  ('peshawar', 'University Town', true),
  ('peshawar', 'Cantt', true),
  ('peshawar', 'Saddar', true),
  ('peshawar', 'Warsak Road', true),
  -- Quetta
  ('quetta', 'Jinnah Town', true),
  ('quetta', 'Cantt', true),
  ('quetta', 'Satellite Town', true),
  ('quetta', 'Samungli Road', true),
  -- Sialkot
  ('sialkot', 'Cantt', true),
  ('sialkot', 'Model Town', true),
  ('sialkot', 'Citi Housing', true),
  ('sialkot', 'Kashmir Road', true),
  -- Gujranwala
  ('gujranwala', 'Citi Housing', true),
  ('gujranwala', 'Model Town', true),
  ('gujranwala', 'Peoples Colony', true),
  ('gujranwala', 'Wapda Town', true),
  -- Hyderabad
  ('hyderabad', 'Latifabad', true),
  ('hyderabad', 'Qasimabad', true),
  ('hyderabad', 'Cantt', true),
  ('hyderabad', 'Auto Bhan Road', true)
ON CONFLICT (city_id, name) DO NOTHING;

-- 2. DELIVERY ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS public.delivery_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Home',
  recipient_name TEXT NOT NULL CHECK (char_length(trim(recipient_name)) >= 2),
  phone_number TEXT NOT NULL CHECK (phone_number ~ '^\+923[0-9]{9}$'),
  country_code TEXT NOT NULL DEFAULT '+92',
  city_id TEXT NOT NULL,
  city_name TEXT NOT NULL,
  area TEXT NOT NULL CHECK (char_length(trim(area)) >= 1),
  house_number TEXT NOT NULL CHECK (char_length(trim(house_number)) >= 1),
  street TEXT NOT NULL CHECK (char_length(trim(street)) >= 1),
  block_or_phase TEXT DEFAULT '',
  landmark TEXT DEFAULT '',
  delivery_instructions TEXT DEFAULT '',
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_delivery_addresses_user_id ON public.delivery_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_user_default ON public.delivery_addresses(user_id, is_default);

-- Enable RLS on delivery_addresses
ALTER TABLE public.delivery_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own delivery addresses" ON public.delivery_addresses;
CREATE POLICY "Users can view own delivery addresses"
  ON public.delivery_addresses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own delivery addresses" ON public.delivery_addresses;
CREATE POLICY "Users can insert own delivery addresses"
  ON public.delivery_addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own delivery addresses" ON public.delivery_addresses;
CREATE POLICY "Users can update own delivery addresses"
  ON public.delivery_addresses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own delivery addresses" ON public.delivery_addresses;
CREATE POLICY "Users can delete own delivery addresses"
  ON public.delivery_addresses FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to keep default address consistent per user
CREATE OR REPLACE FUNCTION public.handle_default_delivery_address()
RETURNS trigger AS $$
DECLARE
  v_existing_count INT;
BEGIN
  NEW.updated_at := timezone('utc'::text, now());

  -- If this is the user's very first address, make it default automatically
  SELECT COUNT(*) INTO v_existing_count
  FROM public.delivery_addresses
  WHERE user_id = NEW.user_id AND id != NEW.id;

  IF v_existing_count = 0 THEN
    NEW.is_default := true;
  END IF;

  -- If this address is set as default, unset is_default on other addresses for this user
  IF NEW.is_default = true THEN
    UPDATE public.delivery_addresses
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_default_delivery_address ON public.delivery_addresses;
CREATE TRIGGER trg_default_delivery_address
  BEFORE INSERT OR UPDATE ON public.delivery_addresses
  FOR EACH ROW EXECUTE PROCEDURE public.handle_default_delivery_address();

-- 3. ENHANCE ORDERS & ORDER ITEMS FOR ADDRESS SNAPSHOTS & IDEMPOTENCY
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_address_id UUID REFERENCES public.delivery_addresses(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_address_snapshot JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax NUMERIC(6,2) DEFAULT 0.00;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS include_cutlery BOOLEAN DEFAULT true;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS original_price NUMERIC(8,2);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS special_instructions TEXT DEFAULT '';
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key ON public.orders(idempotency_key);
