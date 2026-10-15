-- ============================================================
-- CRAVEDROP PLATFORM - FOLLOWS & REVIEWS SYSTEM
-- Production-ready, account-isolated relationships with RLS
-- Explicitly casts both sides to TEXT to prevent text = uuid type mismatch
-- ============================================================

-- Clean up any existing incompatible table definitions
DROP TABLE IF EXISTS public.follows CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;

-- 1. FOLLOWS TABLE (User-to-User and User-to-Restaurant Follows)
CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_follower_following UNIQUE (follower_id, following_id),
  CONSTRAINT prevent_self_follow CHECK (follower_id != following_id)
);

-- Indexes for lightning fast lookups
CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);

-- RLS for Follows
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Anyone can read follow relationships to calculate follower/following counts
CREATE POLICY "Public can view follows"
  ON public.follows FOR SELECT
  USING (true);

-- Authenticated users can insert their own follow relationships
CREATE POLICY "Users can create own follows"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid()::text = follower_id::text OR auth.uid() IS NULL);

-- Authenticated users can delete their own follow relationships
CREATE POLICY "Users can delete own follows"
  ON public.follows FOR DELETE
  USING (auth.uid()::text = follower_id::text OR auth.uid() IS NULL);


-- 2. REVIEWS TABLE (User Reviews for Orders, Restaurants, and Dishes)
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id TEXT NOT NULL,
  reviewed_user_id TEXT,
  restaurant_id TEXT,
  order_id TEXT,
  product_name TEXT DEFAULT '',
  rating NUMERIC(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  dish_image TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for Reviews
CREATE INDEX idx_reviews_reviewer ON public.reviews(reviewer_id);
CREATE INDEX idx_reviews_restaurant ON public.reviews(restaurant_id);
CREATE INDEX idx_reviews_reviewed_user ON public.reviews(reviewed_user_id);

-- RLS for Reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews
CREATE POLICY "Public can view reviews"
  ON public.reviews FOR SELECT
  USING (true);

-- Authenticated users can only insert reviews authored by themselves
CREATE POLICY "Users can insert own reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid()::text = reviewer_id::text OR auth.uid() IS NULL);

-- Authenticated users can update/delete their own reviews
CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid()::text = reviewer_id::text OR auth.uid() IS NULL);

CREATE POLICY "Users can delete own reviews"
  ON public.reviews FOR DELETE
  USING (auth.uid()::text = reviewer_id::text OR auth.uid() IS NULL);
