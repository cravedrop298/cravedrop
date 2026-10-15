// ============================================================
// FOLLOW SERVICE — Account-isolated follow relationship system
// Each follow relationship is keyed by the authenticated user's ID.
// Followers/Following data NEVER leaks between accounts.
// ============================================================

import { supabase } from '../lib/supabase';
import { isLiveSupabaseConfigured } from '../config/env';
import { UserProfile } from '../types';

// localStorage key pattern: cravedrop_follows_{userId}
// Value: JSON array of IDs that this user follows
const localStorageKey = (userId: string) => `cravedrop_follows_${userId}`;

// ────────────────────────────────────────────────────────────
// LOCAL-ONLY HELPERS (used when Supabase is not configured)
// ────────────────────────────────────────────────────────────

function loadLocalFollows(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(localStorageKey(userId));
    if (!raw) return new Set<string>();
    const arr = JSON.parse(raw) as string[];
    return new Set<string>(arr);
  } catch {
    return new Set<string>();
  }
}

function saveLocalFollows(userId: string, follows: Set<string>): void {
  try {
    localStorage.setItem(localStorageKey(userId), JSON.stringify(Array.from(follows)));
  } catch {}
}

function clearLocalFollows(userId: string): void {
  try {
    localStorage.removeItem(localStorageKey(userId));
  } catch {}
}

// ────────────────────────────────────────────────────────────
// PUBLIC API
// ────────────────────────────────────────────────────────────

/**
 * Load the set of IDs that `userId` follows.
 * Returns a Set<string> of following IDs.
 */
export async function getFollowingIds(userId: string): Promise<Set<string>> {
  if (!userId) return new Set<string>();

  const local = loadLocalFollows(userId);

  if (!isLiveSupabaseConfigured()) {
    return local;
  }

  try {
    const { data, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId);

    if (error || !data) {
      return local;
    }

    // Merge remote with local so nothing is lost
    data.forEach((row: { following_id: string }) => local.add(row.following_id));
    saveLocalFollows(userId, local);
    return local;
  } catch (err) {
    return local;
  }
}

/**
 * Load the set of IDs that follow `userId` (i.e. this user's followers).
 * Returns a Set<string> of follower IDs.
 */
export async function getFollowerIds(userId: string): Promise<Set<string>> {
  if (!userId) return new Set<string>();

  const localFollowers = new Set<string>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('cravedrop_follows_')) continue;
      const followerId = key.replace('cravedrop_follows_', '');
      if (followerId === userId) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const arr = JSON.parse(raw) as string[];
      if (arr.includes(userId)) {
        localFollowers.add(followerId);
      }
    }
  } catch {}

  if (!isLiveSupabaseConfigured()) {
    return localFollowers;
  }

  try {
    const { data, error } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', userId);

    if (error || !data) {
      return localFollowers;
    }

    data.forEach((row: { follower_id: string }) => localFollowers.add(row.follower_id));
    return localFollowers;
  } catch (err) {
    return localFollowers;
  }
}

/**
 * Follow a target user/restaurant. Idempotent — safe to call even if already following.
 * Returns the new following set for `followerId`.
 */
export async function followUser(followerId: string, targetId: string): Promise<Set<string>> {
  if (!followerId || !targetId || followerId === targetId) {
    return loadLocalFollows(followerId);
  }

  // 1. Immediately and unconditionally persist locally to this user's storage
  const current = loadLocalFollows(followerId);
  current.add(targetId);
  saveLocalFollows(followerId, current);

  // 2. Sync to Supabase in background
  if (isLiveSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('follows')
        .upsert(
          { follower_id: followerId, following_id: targetId },
          { onConflict: 'follower_id,following_id' }
        );
      if (error) {
        console.warn('[FollowService] Supabase follows upsert note:', error.message);
      }
    } catch (err) {
      console.warn('[FollowService] Exception syncing follow to Supabase:', err);
    }
  }

  return current;
}

/**
 * Unfollow a target. Removes ONLY the A→B relationship, leaving all others intact.
 * Returns the new following set for `followerId`.
 */
export async function unfollowUser(followerId: string, targetId: string): Promise<Set<string>> {
  if (!followerId || !targetId) {
    return loadLocalFollows(followerId);
  }

  // 1. Immediately and unconditionally remove from this user's storage
  const current = loadLocalFollows(followerId);
  current.delete(targetId);
  saveLocalFollows(followerId, current);

  // 2. Sync to Supabase in background
  if (isLiveSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', targetId);
      if (error) {
        console.warn('[FollowService] Supabase follows delete note:', error.message);
      }
    } catch (err) {
      console.warn('[FollowService] Exception syncing unfollow to Supabase:', err);
    }
  }

  return current;
}


/**
 * Clear all follow data for a user from local cache.
 * Called on logout so the next user gets a clean slate.
 */
export function clearFollowCacheForUser(userId: string): void {
  clearLocalFollows(userId);
}

/**
 * Fetch public user profiles for an array of user IDs.
 * Used to populate real follower and following lists without mock data.
 */
export async function getProfilesForUserIds(userIds: string[]): Promise<UserProfile[]> {
  if (!userIds || userIds.length === 0) return [];

  const uniqueIds = Array.from(new Set(userIds));

  if (!isLiveSupabaseConfigured()) {
    const results: UserProfile[] = [];
    for (const id of uniqueIds) {
      const raw = localStorage.getItem(`cravedrop_user_profile_${id}`);
      if (raw) {
        try {
          results.push(JSON.parse(raw));
          continue;
        } catch {}
      }
      // Check active profile if it matches id
      const activeRaw = localStorage.getItem('cravedrop_user_profile');
      if (activeRaw) {
        try {
          const active = JSON.parse(activeRaw);
          if (active.id === id) {
            results.push(active);
            continue;
          }
        } catch {}
      }
      // Minimal representation if profile details not yet in local storage
      results.push({
        id,
        email: `${id}@cravedrop.pk`,
        name: `User ${id.slice(-4)}`,
        full_name: `User ${id.slice(-4)}`,
        username: `user_${id.slice(-4)}`,
        avatar_url: '',
        role: 'customer',
        onboarding_completed: true,
        saved_post_ids: [],
        created_at: new Date().toISOString(),
      });
    }
    return results;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('id', uniqueIds);

    if (error || !data) {
      console.warn('[FollowService] Error fetching user profiles from Supabase:', error?.message);
      return [];
    }

    return data.map((d: any) => ({
      id: d.id,
      email: d.email,
      name: d.name || d.full_name || d.username || 'Foodie',
      full_name: d.full_name || d.name,
      username: d.username,
      avatar_url: d.avatar_url || '',
      city: d.city || 'Lahore',
      bio: d.bio || '',
      role: d.role || 'customer',
      onboarding_completed: Boolean(d.onboarding_completed),
      phone: d.phone,
      saved_post_ids: [],
      created_at: d.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('[FollowService] Exception fetching user profiles:', err);
    return [];
  }
}

