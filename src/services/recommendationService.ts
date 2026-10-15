// ============================================================
// CRAVEDROP PLATFORM - PERSONALIZED RECOMMENDATION SERVICE
// Strict city partitioning (zero cross-city leakage) + TikTok/YouTube style ranking
// Enforces hard city filtering both server-side (RPC) and client-side (cache/fallback)
// ============================================================

import { supabase } from '../lib/supabase';
import { isLiveSupabaseConfigured } from '../config/env';
import { FoodPost, Restaurant, UserProfile } from '../types';
import { isPostExpired } from './expiryService';
import { interactionTracker, UserCategoryAffinityMap } from './interactionTrackingService';
import { getCityByName, getCityById } from '../utils/userUtils';

export interface RecommendationFactors {
  userId?: string;
  userCity?: string;
  userCityId?: string;
  userInterests?: string[];
  userTastePreferences?: string[];
  followedRestaurantIds?: string[];
  categoryAffinities?: UserCategoryAffinityMap;
  notInterestedPostIds?: Set<string>;
  skippedPostIds?: Set<string>;
  impressionCounts?: Record<string, number>;
}

export interface RecommendationWeights {
  baseScore: number;
  onboardingInterestMatch: number;
  categoryAffinityMultiplier: number;
  followedRestaurantBoost: number;
  freshnessMaxBoost: number;
  freshnessDecayPerHour: number;
  urgencyCriticalBoost: number;
  urgencyModerateBoost: number;
  engagementVelocityMultiplier: number;
  exposurePenaltyPerImpression: number;
  skipPenalty: number;
}

export const DEFAULT_WEIGHTS: RecommendationWeights = {
  baseScore: 100,
  onboardingInterestMatch: 50,
  categoryAffinityMultiplier: 1.0, // Scales affinity points up to +80 / -40
  followedRestaurantBoost: 60,
  freshnessMaxBoost: 50,
  freshnessDecayPerHour: 2.5,
  urgencyCriticalBoost: 35, // Ends in < 1 hour
  urgencyModerateBoost: 20, // Ends in < 3 hours
  engagementVelocityMultiplier: 0.05,
  exposurePenaltyPerImpression: 15,
  skipPenalty: 60,
};

/**
 * Normalizes a city string or ID to a standard lowercase token.
 * Handles 'Karachi', 'karachi', 'Lahore', 'lahore', etc.
 */
export function normalizeCityToken(value?: string): string {
  if (!value) return '';
  const trimmed = value.trim().toLowerCase();
  const option = getCityById(trimmed) || getCityByName(trimmed);
  return option ? option.id.toLowerCase() : trimmed.replace(/\s+/g, '-');
}

/**
 * STRICT CITY ELIGIBILITY CHECK:
 * A post is strictly eligible for a user's Home Feed IF AND ONLY IF:
 * It belongs to the user's selected city.
 * Content from other cities is STRICTLY EXCLUDED.
 */
export function isPostEligibleForCity(
  post: FoodPost,
  restaurant?: Restaurant,
  targetCity?: string,
  targetCityId?: string
): boolean {
  if (!targetCity && !targetCityId) {
    // If no city has been selected at all, nothing is eligible for local feed
    return false;
  }

  const userCityToken = normalizeCityToken(targetCityId || targetCity);
  const postCityToken = normalizeCityToken(post.city_id || post.city || restaurant?.city_id || restaurant?.city);

  if (!userCityToken || !postCityToken) return false;

  return userCityToken === postCityToken;
}

/**
 * Calculates TikTok/YouTube-style personalized relevance score for a food drop
 */
export function calculatePostRecommendationScore(
  post: FoodPost,
  restaurant?: Restaurant,
  factors?: RecommendationFactors,
  weights: RecommendationWeights = DEFAULT_WEIGHTS
): number {
  // CRITICAL RULE 1: Post must not be expired or hidden
  if (isPostExpired(post.expires_at) || post.is_expired || post.is_hidden) {
    return 0;
  }

  // CRITICAL RULE 2: STRICT CITY PARTITION - ZERO CROSS-CITY LEAKAGE
  const userCity = factors?.userCity;
  const userCityId = factors?.userCityId;
  if (!isPostEligibleForCity(post, restaurant, userCity, userCityId)) {
    return 0; // Completely ineligible. Excluded from Home Feed!
  }

  // CRITICAL RULE 3: Explicit "Not Interested" dismissal = complete exclusion
  if (factors?.notInterestedPostIds && factors.notInterestedPostIds.has(post.id)) {
    return 0;
  }

  let score = weights.baseScore;

  // 1. Onboarding Interests Match (Cold-start + persistent interest alignment)
  const userInterests = [
    ...(factors?.userInterests || []),
    ...(factors?.userTastePreferences || []),
  ].map((i) => i.toLowerCase().trim()).filter(Boolean);

  const postTags = (post.tags || []).map((t) => t.toLowerCase().replace('#', '').trim());
  const postCategory = (post.category || restaurant?.category || '').toLowerCase().trim();
  const productName = post.product_name.toLowerCase();
  const restaurantCuisine = (restaurant?.cuisine || []).map((c) => c.toLowerCase());

  const hasInterestMatch = userInterests.some((interest) => {
    return (
      postCategory.includes(interest) ||
      interest.includes(postCategory) ||
      postTags.some((tag) => tag.includes(interest) || interest.includes(tag)) ||
      productName.includes(interest) ||
      restaurantCuisine.some((c) => c.includes(interest) || interest.includes(c))
    );
  });

  if (hasInterestMatch) {
    score += weights.onboardingInterestMatch; // +50
  }

  // 2. Real-Time Behavioral Category Affinity
  const affinities = factors?.categoryAffinities || {};
  if (postCategory && affinities[postCategory] !== undefined) {
    const rawAffinity = affinities[postCategory] * weights.categoryAffinityMultiplier;
    // Cap affinity boost between -40 and +80
    score += Math.max(-40, Math.min(80, rawAffinity));
  }

  // Also check if any post tags match user's top affinity categories
  for (const [catName, affinityScore] of Object.entries(affinities)) {
    if (catName !== postCategory && postTags.includes(catName)) {
      score += Math.max(-20, Math.min(40, affinityScore * 0.5));
    }
  }

  // 3. Followed Restaurant Creator Boost
  if (factors?.followedRestaurantIds?.includes(post.restaurant_id)) {
    score += weights.followedRestaurantBoost; // +60
  }

  // 4. Content Freshness (New drops get elevated visibility, decay over hours)
  const ageInHours = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
  const freshnessBoost = Math.max(0, weights.freshnessMaxBoost - ageInHours * weights.freshnessDecayPerHour);
  score += freshnessBoost;

  // 5. Expiry Urgency Bump (Ending soon drops get urgency bonus)
  const remainingHours = (new Date(post.expires_at).getTime() - Date.now()) / (1000 * 60 * 60);
  if (remainingHours > 0 && remainingHours <= 1) {
    score += weights.urgencyCriticalBoost; // +35
  } else if (remainingHours > 1 && remainingHours <= 3) {
    score += weights.urgencyModerateBoost; // +20
  }

  // 6. Engagement Velocity (Likes, comments, shares, saves, orders)
  const engagementVelocity =
    (post.likes_count * 1.5) +
    (post.comments_count * 3.0) +
    (post.shares_count * 4.0) +
    (post.saves_count * 5.0) +
    (post.orders_count * 10.0);
  score += Math.min(30, engagementVelocity * weights.engagementVelocityMultiplier);

  // 7. Restaurant Quality Rating
  if (restaurant) {
    score += ((restaurant.rating || 4.5) - 4.0) * 15; // 4.5 -> +7.5, 5.0 -> +15
    if (restaurant.is_verified) score += 10;
    if (restaurant.is_featured) score += 15;
  }

  // 8. Fatigue / Exposure Penalty (Diminish items seen repeatedly without engagement)
  if (factors?.impressionCounts && factors.impressionCounts[post.id]) {
    const impressions = factors.impressionCounts[post.id];
    score -= Math.min(60, impressions * weights.exposurePenaltyPerImpression);
  }

  // 9. Negative Skip Penalty (Diminish videos quickly skipped)
  if (factors?.skippedPostIds && factors.skippedPostIds.has(post.id)) {
    score -= weights.skipPenalty; // -60
  }

  return Math.max(0, score);
}

/**
 * Filter and rank food posts strictly for the authenticated user and target city.
 * NEVER returns content from other cities.
 * If no content exists in user's city, returns empty array [].
 */
export function rankFoodPostsStrict(
  posts: FoodPost[],
  restaurantsMap: Record<string, Restaurant>,
  user?: UserProfile | null,
  followedRestaurantIds: string[] = [],
  weights: RecommendationWeights = DEFAULT_WEIGHTS
): FoodPost[] {
  const userCity = user?.city || user?.location?.city;
  const userCityId = user?.city_id;

  if (!userCity && !userCityId) {
    return [];
  }

  const userId = user?.id;
  const categoryAffinities = interactionTracker.getUserCategoryAffinities(userId);
  const notInterestedPostIds = interactionTracker.getNotInterestedPostIds(userId);
  const skippedPostIds = interactionTracker.getSkippedPostIds(userId);
  const impressionCounts = interactionTracker.getImpressionCounts(userId);

  const factors: RecommendationFactors = {
    userId,
    userCity,
    userCityId,
    userInterests: user?.interests,
    userTastePreferences: user?.taste_preferences,
    followedRestaurantIds,
    categoryAffinities,
    notInterestedPostIds,
    skippedPostIds,
    impressionCounts,
  };

  // 1. Strict City Filter + Expiry Filter
  const eligible = posts.filter((post) => {
    const restaurant = restaurantsMap[post.restaurant_id];
    if (isPostExpired(post.expires_at) || post.is_expired || post.is_hidden) {
      return false;
    }
    if (notInterestedPostIds.has(post.id)) {
      return false;
    }
    return isPostEligibleForCity(post, restaurant, userCity, userCityId);
  });

  // 2. Score and Rank
  return eligible
    .map((post) => {
      const restaurant = restaurantsMap[post.restaurant_id];
      const score = calculatePostRecommendationScore(post, restaurant, factors, weights);
      return { post, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.post);
}

/**
 * Fetches personalized feed from Supabase RPC `get_personalized_home_feed`,
 * with full client-side fallback if offline or RPC is not yet applied.
 */
export async function getPersonalizedFeed(
  user: UserProfile | null,
  localPosts: FoodPost[],
  restaurantsMap: Record<string, Restaurant>,
  followedRestaurantIds: string[] = [],
  limit = 20,
  offset = 0
): Promise<FoodPost[]> {
  const userCity = user?.city || user?.location?.city;
  const userCityId = user?.city_id;

  if (!userCity && !userCityId) {
    return [];
  }

  const cleanCityId = normalizeCityToken(userCityId || userCity);

  // Attempt RPC call to Supabase if live
  if (isLiveSupabaseConfigured() && user?.id) {
    try {
      const { data, error } = await supabase.rpc('get_personalized_home_feed', {
        p_user_id: user.id,
        p_city_id: cleanCityId,
        p_limit: limit,
        p_offset: offset,
      });

      if (!error && Array.isArray(data) && data.length > 0) {
        // Map returned database rows to FoodPost model
        return data.map((row: any): FoodPost => {
          const rest = restaurantsMap[row.restaurant_id];
          return {
            id: row.id,
            restaurant_id: row.restaurant_id,
            restaurant_name: rest?.name || 'Local Kitchen',
            restaurant_logo: rest?.logo_url || '',
            restaurant_verified: rest?.is_verified ?? true,
            product_id: row.product_id,
            product_name: row.product_name || 'Special Food Drop',
            product_price: row.product_price || 15.0,
            product_discount_price: row.product_discount_price,
            caption: row.caption,
            media_url: row.media_url,
            media_type: row.media_type,
            thumbnail_url: row.thumbnail_url || row.media_url,
            duration_seconds: row.duration_seconds || 15,
            created_at: row.created_at,
            expires_at: row.expires_at,
            likes_count: row.likes_count || 0,
            comments_count: row.comments_count || 0,
            shares_count: row.shares_count || 0,
            saves_count: row.saves_count || 0,
            views_count: row.views_count || 0,
            orders_count: row.orders_count || 0,
            tags: row.tags || [],
            city: row.city || userCity,
            city_id: row.city_id || cleanCityId,
            category: row.category,
          };
        });
      }
    } catch (err) {
      console.warn('[RecommendationService] Supabase RPC call fallback to client ranking:', err);
    }
  }

  // Client-side fallback ranking with strict city partition
  return rankFoodPostsStrict(
    localPosts,
    restaurantsMap,
    user,
    followedRestaurantIds
  ).slice(offset, offset + limit);
}
