// ============================================================
// REVIEW SERVICE — Account-isolated reviews system
// Production-ready, Supabase-backed review management.
// No shared demo reviews, no cross-account review leakage.
// ============================================================

import { supabase } from '../lib/supabase';
import { isLiveSupabaseConfigured } from '../config/env';
import { UserReview } from '../types';

const localStorageKey = (userId: string) => `cravedrop_reviews_${userId}`;

/**
 * Load real reviews for a specific user (either authored by them, or left for them).
 * A brand new account will always return [] (0 reviews).
 */
export async function getReviewsForUser(userId: string): Promise<UserReview[]> {
  if (!userId) return [];

  if (!isLiveSupabaseConfigured()) {
    try {
      const raw = localStorage.getItem(localStorageKey(userId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .or(`reviewer_id.eq.${userId},reviewed_user_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[ReviewService] Error loading reviews from Supabase:', error.message);
      const raw = localStorage.getItem(localStorageKey(userId));
      return raw ? JSON.parse(raw) : [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      order_id: row.order_id || '',
      restaurant_id: row.restaurant_id || '',
      restaurant_name: row.restaurant_name || '',
      product_name: row.product_name || '',
      rating: Number(row.rating),
      comment: row.comment || '',
      created_at: row.created_at,
      dish_image: row.dish_image || undefined,
      reviewer_id: row.reviewer_id,
      reviewed_user_id: row.reviewed_user_id,
    }));
  } catch (err) {
    console.warn('[ReviewService] Exception loading reviews:', err);
    const raw = localStorage.getItem(localStorageKey(userId));
    return raw ? JSON.parse(raw) : [];
  }
}

/**
 * Creates and persists a real review.
 * Only attached to the authenticated reviewer's account.
 */
export async function addReviewToDatabase(
  review: Omit<UserReview, 'id' | 'created_at'> & { reviewer_id?: string }
): Promise<UserReview> {
  const newReview: UserReview = {
    ...review,
    id: `rev-${Date.now()}`,
    created_at: new Date().toISOString(),
  };

  const userId = review.reviewer_id;
  if (userId) {
    try {
      const raw = localStorage.getItem(localStorageKey(userId));
      const current: UserReview[] = raw ? JSON.parse(raw) : [];
      localStorage.setItem(localStorageKey(userId), JSON.stringify([newReview, ...current]));
    } catch {}
  }

  if (isLiveSupabaseConfigured() && userId) {
    try {
      await supabase.from('reviews').insert({
        reviewer_id: userId,
        reviewed_user_id: review.reviewed_user_id || null,
        restaurant_id: review.restaurant_id || null,
        order_id: review.order_id || null,
        product_name: review.product_name || '',
        rating: review.rating,
        comment: review.comment,
        dish_image: review.dish_image || null,
      });
    } catch (err) {
      console.warn('[ReviewService] Exception inserting review to Supabase:', err);
    }
  }

  return newReview;
}

export function clearReviewCacheForUser(userId: string): void {
  try {
    localStorage.removeItem(localStorageKey(userId));
  } catch {}
}
