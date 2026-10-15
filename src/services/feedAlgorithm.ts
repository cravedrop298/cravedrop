// ============================================================
// Feed Algorithm: Multi-Factor Personalized Ranking with Strict City Partition
// Ranking formula: Strict City Match + Onboarding Interests + Behavioral Category Affinity +
// Following + Freshness Decay + Urgency + Engagement Velocity - Fatigue - Negative Signals
// Expired posts and non-matching city posts receive zero eligibility in active local feed.
// ============================================================

import { FoodPost, Restaurant } from '../types';
import { isPostExpired } from './expiryService';
import {
  isPostEligibleForCity,
  calculatePostRecommendationScore,
  DEFAULT_WEIGHTS,
} from './recommendationService';
import { interactionTracker } from './interactionTrackingService';

export interface FeedRankingFactors {
  userId?: string;
  userFollowedRestaurantIds?: string[];
  userCity?: string;
  userCityId?: string;
  userLat?: number;
  userLng?: number;
  preferredCategory?: string;
  userInterests?: string[];
  userTastePreferences?: string[];
  sortByUrgency?: boolean;
}

/**
 * Calculates a weighted relevance score for a food post
 */
export function calculatePostFeedScore(
  post: FoodPost,
  restaurant?: Restaurant,
  factors?: FeedRankingFactors
): number {
  // CRITICAL RULE 1: Expired posts have zero eligibility in active feed
  if (isPostExpired(post.expires_at) || post.is_expired || post.is_hidden) {
    return 0;
  }

  // CRITICAL RULE 2: STRICT CITY PARTITION (No other city allowed in local feed)
  if (factors?.userCity || factors?.userCityId) {
    if (!isPostEligibleForCity(post, restaurant, factors.userCity, factors.userCityId)) {
      return 0;
    }
  }

  const userId = factors?.userId;
  const categoryAffinities = userId ? interactionTracker.getUserCategoryAffinities(userId) : {};
  const notInterestedPostIds = userId ? interactionTracker.getNotInterestedPostIds(userId) : undefined;
  const skippedPostIds = userId ? interactionTracker.getSkippedPostIds(userId) : undefined;
  const impressionCounts = userId ? interactionTracker.getImpressionCounts(userId) : undefined;

  return calculatePostRecommendationScore(
    post,
    restaurant,
    {
      userId,
      userCity: factors?.userCity,
      userCityId: factors?.userCityId,
      userInterests: factors?.userInterests,
      userTastePreferences: factors?.userTastePreferences,
      followedRestaurantIds: factors?.userFollowedRestaurantIds,
      categoryAffinities,
      notInterestedPostIds,
      skippedPostIds,
      impressionCounts,
    },
    DEFAULT_WEIGHTS
  );
}

/**
 * Ranks and returns active food posts according to user preferences and eligibility.
 * Enforces strict city partitioning: content from other cities is filtered out.
 */
export function rankFoodPosts(
  posts: FoodPost[],
  restaurantsMap: Record<string, Restaurant>,
  factors?: FeedRankingFactors,
  includeExpiredForDirectAccess = false
): FoodPost[] {
  const userCity = factors?.userCity;
  const userCityId = factors?.userCityId;
  const userId = factors?.userId;
  const notInterestedPostIds = userId ? interactionTracker.getNotInterestedPostIds(userId) : new Set<string>();

  return posts
    .filter((post) => {
      if (includeExpiredForDirectAccess) return true;
      if (isPostExpired(post.expires_at) || post.is_hidden) return false;
      if (notInterestedPostIds.has(post.id)) return false;

      // CRITICAL: Strict city filtering
      if (userCity || userCityId) {
        const restaurant = restaurantsMap[post.restaurant_id];
        return isPostEligibleForCity(post, restaurant, userCity, userCityId);
      }
      return true;
    })
    .sort((a, b) => {
      const scoreA = calculatePostFeedScore(a, restaurantsMap[a.restaurant_id], factors);
      const scoreB = calculatePostFeedScore(b, restaurantsMap[b.restaurant_id], factors);
      return scoreB - scoreA;
    });
}
