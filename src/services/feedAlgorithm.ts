// Feed Algorithm V1: Weighted Multi-Factor Ranking
// Ranking formula: recent + nearby + engaging + followed + expiry urgency
// Expired posts receive zero eligibility in active discovery feed.

import { FoodPost, Restaurant } from '../types';
import { isPostExpired } from './expiryService';

export interface FeedRankingFactors {
  userFollowedRestaurantIds?: string[];
  userLat?: number;
  userLng?: number;
  preferredCategory?: string;
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
  // CRITICAL RULE: Expired posts have zero eligibility in active feed
  if (isPostExpired(post.expires_at) || post.is_expired || post.is_hidden) {
    return 0;
  }

  let score = 100;

  // 1. Recency factor (Newer drops score higher)
  const ageInHours = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
  const recencyBoost = Math.max(0, 50 - ageInHours * 4);
  score += recencyBoost;

  // 2. Engagement factor (likes, comments, orders converted)
  const engagementScore = (post.likes_count * 1.5) + (post.comments_count * 3) + (post.orders_count * 10);
  score += Math.min(60, engagementScore * 0.1);

  // 3. User Follows Boost
  if (factors?.userFollowedRestaurantIds?.includes(post.restaurant_id)) {
    score += 40; // High priority for kitchens user actively follows
  }

  // 4. Expiry Urgency Factor
  // Drops ending soon (less than 2 hours) get elevated visibility so food isn't wasted
  const remainingHours = (new Date(post.expires_at).getTime() - Date.now()) / (1000 * 60 * 60);
  if (remainingHours > 0 && remainingHours <= 1) {
    score += 35; // Critical urgency bump
  } else if (remainingHours > 1 && remainingHours <= 3) {
    score += 20; // Moderate urgency bump
  }

  // 5. Restaurant Popularity & Rating
  if (restaurant) {
    score += (restaurant.rating || 4.5) * 5;
    if (restaurant.is_verified) score += 10;
    if (restaurant.is_featured) score += 15;
  }

  return score;
}

/**
 * Ranks and returns active food posts according to user preferences and eligibility
 */
export function rankFoodPosts(
  posts: FoodPost[],
  restaurantsMap: Record<string, Restaurant>,
  factors?: FeedRankingFactors,
  includeExpiredForDirectAccess = false
): FoodPost[] {
  return posts
    .filter((post) => {
      if (includeExpiredForDirectAccess) return true;
      return !isPostExpired(post.expires_at) && !post.is_hidden;
    })
    .sort((a, b) => {
      const scoreA = calculatePostFeedScore(a, restaurantsMap[a.restaurant_id], factors);
      const scoreB = calculatePostFeedScore(b, restaurantsMap[b.restaurant_id], factors);
      return scoreB - scoreA;
    });
}
