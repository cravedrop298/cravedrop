-- ============================================================
-- CRAVEDROP PLATFORM - PERSONALIZED RECOMMENDATION ENGINE & INTERACTION TRACKING
-- Migration: 20261010_recommendations_and_tracking.sql
-- ============================================================

-- 1. ADD CITY AND CATEGORY COLUMNS TO RESTAURANTS AND POSTS
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS city_id TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS city_id TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS category TEXT;

-- Normalize existing restaurants and posts city_id based on city name
UPDATE public.restaurants
SET city_id = LOWER(REPLACE(city, ' ', '-'))
WHERE city_id IS NULL AND city IS NOT NULL;

UPDATE public.posts p
SET 
  city_id = r.city_id,
  city = r.city,
  category = r.category
FROM public.restaurants r
WHERE p.restaurant_id = r.id AND (p.city_id IS NULL OR p.city IS NULL);

-- Create performance indices
CREATE INDEX IF NOT EXISTS idx_restaurants_city_id ON public.restaurants(city_id);
CREATE INDEX IF NOT EXISTS idx_posts_city_id ON public.posts(city_id);
CREATE INDEX IF NOT EXISTS idx_posts_city ON public.posts(city);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_expires_at ON public.posts(expires_at);

-- 2. CREATE POST INTERACTIONS TABLE (TRACKING SIGNALS)
CREATE TABLE IF NOT EXISTS public.post_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'impression',
      'watch',
      'complete',
      'rewatch',
      'like',
      'save',
      'share',
      'comment',
      'follow',
      'order',
      'skip',
      'not_interested'
    )
  ),
  watch_duration_ms INT DEFAULT 0,
  completion_percentage NUMERIC(5,2) DEFAULT 0,
  category TEXT,
  city_id TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indices for rapid querying and aggregation in recommendation ranking
CREATE INDEX IF NOT EXISTS idx_post_interactions_user_post ON public.post_interactions(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_post_interactions_user_event ON public.post_interactions(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_post_interactions_user_cat ON public.post_interactions(user_id, category);
CREATE INDEX IF NOT EXISTS idx_post_interactions_created ON public.post_interactions(created_at);

-- Enable RLS
ALTER TABLE public.post_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own interactions" ON public.post_interactions;
CREATE POLICY "Users can insert their own interactions"
  ON public.post_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can select their own interactions" ON public.post_interactions;
CREATE POLICY "Users can select their own interactions"
  ON public.post_interactions FOR SELECT
  USING (auth.uid() = user_id);

-- 3. SERVER-SIDE STORED PROCEDURE / RPC FOR PERSONALIZED HOME FEED
-- Strictly enforces user city partitioning (zero cross-city leakage)
-- Incorporates cold-start interests + behavioral affinity + freshness + urgency + fatigue penalties
CREATE OR REPLACE FUNCTION public.get_personalized_home_feed(
  p_user_id UUID,
  p_city_id TEXT,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  restaurant_id UUID,
  product_id UUID,
  caption TEXT,
  media_url TEXT,
  media_type TEXT,
  thumbnail_url TEXT,
  duration_seconds INT,
  expires_at TIMESTAMPTZ,
  is_expired BOOLEAN,
  is_hidden BOOLEAN,
  likes_count INT,
  comments_count INT,
  shares_count INT,
  saves_count INT,
  views_count INT,
  orders_count INT,
  tags TEXT[],
  city TEXT,
  city_id TEXT,
  category TEXT,
  created_at TIMESTAMPTZ,
  recommendation_score NUMERIC
) AS $$
DECLARE
  v_user_interests TEXT[] := '{}';
  v_clean_city_id TEXT;
BEGIN
  -- Normalize city_id
  v_clean_city_id := LOWER(TRIM(p_city_id));

  -- Get user onboarding interests if authenticated
  IF p_user_id IS NOT NULL THEN
    SELECT COALESCE(interests, '{}') INTO v_user_interests
    FROM public.profiles
    WHERE public.profiles.id = p_user_id;
  END IF;

  RETURN QUERY
  WITH user_affinities AS (
    -- Calculate user category affinity based on recent watch & engagement behavior (past 14 days)
    SELECT
      pi.category AS cat_name,
      SUM(
        CASE 
          WHEN pi.event_type = 'complete' THEN 25
          WHEN pi.event_type = 'rewatch' THEN 30
          WHEN pi.event_type = 'like' THEN 20
          WHEN pi.event_type = 'save' THEN 25
          WHEN pi.event_type = 'order' THEN 40
          WHEN pi.event_type = 'watch' AND pi.completion_percentage >= 50 THEN 15
          WHEN pi.event_type = 'skip' THEN -20
          ELSE 0
        END
      ) AS affinity_score
    FROM public.post_interactions pi
    WHERE pi.user_id = p_user_id
      AND pi.created_at >= (now() - INTERVAL '14 days')
      AND pi.category IS NOT NULL
    GROUP BY pi.category
  ),
  followed_restaurants AS (
    SELECT rf.restaurant_id AS followed_rest_id
    FROM public.restaurant_follows rf
    WHERE rf.user_id = p_user_id
  ),
  not_interested_posts AS (
    SELECT pi.post_id AS dismissed_id
    FROM public.post_interactions pi
    WHERE pi.user_id = p_user_id
      AND pi.event_type = 'not_interested'
  ),
  post_impressions AS (
    SELECT pi.post_id AS imp_post_id, COUNT(*) AS imp_count
    FROM public.post_interactions pi
    WHERE pi.user_id = p_user_id
      AND pi.event_type = 'impression'
    GROUP BY pi.post_id
  ),
  skipped_posts AS (
    SELECT DISTINCT pi.post_id AS skip_post_id
    FROM public.post_interactions pi
    WHERE pi.user_id = p_user_id
      AND pi.event_type = 'skip'
  )
  SELECT
    p.id,
    p.restaurant_id,
    p.product_id,
    p.caption,
    p.media_url,
    p.media_type,
    p.thumbnail_url,
    p.duration_seconds,
    p.expires_at,
    p.is_expired,
    p.is_hidden,
    p.likes_count,
    p.comments_count,
    p.shares_count,
    p.saves_count,
    p.views_count,
    p.orders_count,
    p.tags,
    COALESCE(p.city, r.city) AS city,
    COALESCE(p.city_id, r.city_id) AS city_id,
    COALESCE(p.category, r.category) AS category,
    p.created_at,
    (
      -- Base Score
      100.0

      -- 1. Cold-Start / Onboarding Interests Match (+50)
      + CASE 
          WHEN v_user_interests IS NOT NULL AND array_length(v_user_interests, 1) > 0 THEN
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM unnest(v_user_interests) ui
                WHERE LOWER(COALESCE(p.category, r.category, '')) LIKE '%' || LOWER(ui) || '%'
                   OR EXISTS (
                        SELECT 1 FROM unnest(p.tags) tag 
                        WHERE LOWER(tag) LIKE '%' || LOWER(ui) || '%'
                      )
              ) THEN 50.0
              ELSE 0.0
            END
          ELSE 0.0
        END

      -- 2. Real-Time Behavioral Category Affinity (+ up to 80, - up to 40)
      + COALESCE(LEAST(80.0, GREATEST(-40.0, ua.affinity_score)), 0.0)

      -- 3. Followed Restaurant Creator Boost (+60)
      + CASE WHEN fr.followed_rest_id IS NOT NULL THEN 60.0 ELSE 0.0 END

      -- 4. Content Freshness (Up to +50 decaying over 24 hours)
      + GREATEST(0.0, 50.0 - (EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600.0) * 2.5)

      -- 5. Expiry Urgency Bump (+35 for <1h, +20 for <3h)
      + CASE 
          WHEN p.expires_at > now() AND p.expires_at <= (now() + INTERVAL '1 hour') THEN 35.0
          WHEN p.expires_at > (now() + INTERVAL '1 hour') AND p.expires_at <= (now() + INTERVAL '3 hours') THEN 20.0
          ELSE 0.0
        END

      -- 6. Engagement Velocity (Cap at 30)
      + LEAST(30.0, (
          (p.likes_count * 1.5) +
          (p.comments_count * 3.0) +
          (p.shares_count * 4.0) +
          (p.saves_count * 5.0) +
          (p.orders_count * 10.0)
        ) * 0.05
      )

      -- 7. Fatigue / Exposure Penalty (-20 for repeatedly seen items)
      - COALESCE(LEAST(60.0, pimp.imp_count * 15.0), 0.0)

      -- 8. Negative Skip Penalty (-50)
      - CASE WHEN sp.skip_post_id IS NOT NULL THEN 50.0 ELSE 0.0 END
    )::NUMERIC AS recommendation_score
  FROM public.posts p
  JOIN public.restaurants r ON p.restaurant_id = r.id
  LEFT JOIN user_affinities ua ON ua.cat_name = COALESCE(p.category, r.category)
  LEFT JOIN followed_restaurants fr ON fr.followed_rest_id = p.restaurant_id
  LEFT JOIN not_interested_posts nip ON nip.dismissed_id = p.id
  LEFT JOIN post_impressions pimp ON pimp.imp_post_id = p.id
  LEFT JOIN skipped_posts sp ON sp.skip_post_id = p.id
  WHERE
    -- CRITICAL REQUIREMENT 1: HARD CITY PARTITION (Zero cross-city leakage)
    (
      LOWER(COALESCE(p.city_id, r.city_id, '')) = v_clean_city_id
      OR LOWER(COALESCE(p.city, r.city, '')) = v_clean_city_id
    )
    -- Must be active and not expired
    AND p.is_expired = false
    AND p.is_hidden = false
    AND p.expires_at > now()
    -- Exclude user dismissed drops
    AND nip.dismissed_id IS NULL
  ORDER BY recommendation_score DESC, p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
