import { createClient } from '@supabase/supabase-js';
import { ENV, isLiveSupabaseConfigured } from '../config/env';
import { UserProfile, Restaurant, CityOption } from '../types';
import { PAKISTAN_CITIES_LIST } from '../utils/userUtils';

export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: typeof window !== 'undefined',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

/**
 * Validates connection to the configured Supabase instance
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    if (!isLiveSupabaseConfigured()) {
      return false;
    }
    const { error } = await supabase.from('restaurants').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetches user profile record from public.profiles
 */
export async function getProfileFromSupabase(userId: string): Promise<UserProfile | null> {
  try {
    if (!isLiveSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[Supabase] Error loading profile:', error.message);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      auth_user_id: data.auth_user_id || data.id,
      email: data.email,
      name: data.name || data.full_name || '',
      full_name: data.full_name || data.name || '',
      username: data.username || '',
      bio: data.bio || '',
      city: data.city || '',
      city_id: data.city_id || '',
      avatar_url: data.avatar_url || '',
      role: data.role || 'customer',
      onboarding_completed: Boolean(data.onboarding_completed),
      interests: data.interests || [],
      phone: data.phone || '',
      restaurant_id: data.restaurant_id || undefined,
      location: data.city ? {
        address: data.city,
        city: data.city,
        lat: data.lat || 31.5204,
        lng: data.lng || 74.3587,
      } : undefined,
      saved_post_ids: [],
      name_changed_at: data.name_changed_at,
      username_changed_at: data.username_changed_at,
      city_changed_at: data.city_changed_at,
      created_at: data.created_at || new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[Supabase] Exception fetching profile:', err);
    return null;
  }
}

/**
 * Creates or updates user profile in public.profiles
 */
export async function upsertProfileToSupabase(profile: Partial<UserProfile> & { id: string }): Promise<UserProfile | null> {
  try {
    if (!isLiveSupabaseConfigured()) return null;

    const payload: any = {
      id: profile.id,
      auth_user_id: profile.id,
      updated_at: new Date().toISOString(),
    };

    if (profile.email) payload.email = profile.email;
    if (profile.name) payload.name = profile.name;
    if (profile.full_name) payload.full_name = profile.full_name;
    if (profile.username) payload.username = profile.username;
    if (profile.bio !== undefined) payload.bio = profile.bio;
    if (profile.avatar_url !== undefined) payload.avatar_url = profile.avatar_url;
    if (profile.role) payload.role = profile.role;
    if (typeof profile.onboarding_completed === 'boolean') payload.onboarding_completed = profile.onboarding_completed;
    if (profile.interests) payload.interests = profile.interests;
    if (profile.phone) payload.phone = profile.phone;
    if (profile.restaurant_id) payload.restaurant_id = profile.restaurant_id;
    if (profile.city_id) payload.city_id = profile.city_id;
    if (profile.city || profile.location?.city) {
      payload.city = profile.city || profile.location?.city;
      if (profile.location?.lat) payload.lat = profile.location.lat;
      if (profile.location?.lng) payload.lng = profile.location.lng;
    }
    if (profile.name_changed_at) payload.name_changed_at = profile.name_changed_at;
    if (profile.username_changed_at) payload.username_changed_at = profile.username_changed_at;
    if (profile.city_changed_at) payload.city_changed_at = profile.city_changed_at;

    // Try update first (avoids NOT NULL constraint errors when updating partial profile fields)
    let { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', profile.id)
      .select()
      .maybeSingle();

    if (updateError && updateError.message?.includes('bio')) {
      delete payload.bio;
      const retry = await supabase.from('profiles').update(payload).eq('id', profile.id).select().maybeSingle();
      updateData = retry.data;
      updateError = retry.error;
    }

    let data = updateData;

    if (!data || updateError) {
      payload.id = profile.id;
      payload.auth_user_id = profile.id;
      let { data: upsertData, error: upsertError } = await supabase
        .from('profiles')
        .upsert(payload)
        .select()
        .maybeSingle();

      if (upsertError && upsertError.message?.includes('bio')) {
        delete payload.bio;
        const retryUpsert = await supabase.from('profiles').upsert(payload).select().maybeSingle();
        upsertData = retryUpsert.data;
        upsertError = retryUpsert.error;
      }

      if (upsertError) {
        console.warn('[Supabase] Error saving profile:', upsertError.message);
        return null;
      }
      data = upsertData;
    }

    if (!data) return null;

    return {
      id: data.id,
      auth_user_id: data.auth_user_id || data.id,
      email: data.email,
      name: data.name || data.full_name || '',
      full_name: data.full_name || data.name || '',
      username: data.username || '',
      bio: data.bio || '',
      city: data.city || '',
      city_id: data.city_id || '',
      avatar_url: data.avatar_url || '',
      role: data.role || 'customer',
      onboarding_completed: Boolean(data.onboarding_completed),
      interests: data.interests || [],
      phone: data.phone || '',
      restaurant_id: data.restaurant_id,
      location: data.city ? {
        address: data.city,
        city: data.city,
        lat: data.lat || 31.5204,
        lng: data.lng || 74.3587,
      } : undefined,
      saved_post_ids: [],
      name_changed_at: data.name_changed_at,
      username_changed_at: data.username_changed_at,
      city_changed_at: data.city_changed_at,
      created_at: data.created_at || new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[Supabase] Exception upserting profile:', err);
    return null;
  }
}

/**
 * Checks if a username is available across Supabase profiles and local accounts
 */
export async function checkUsernameAvailability(username: string, currentUserId?: string): Promise<boolean> {
  const cleanUsername = username.trim().toLowerCase();
  if (!cleanUsername || cleanUsername.length < 3) return false;

  // 1. Check local storage accounts for duplicates
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('cravedrop_user_profile_') || key === 'cravedrop_user_profile')) {
      try {
        const item = JSON.parse(localStorage.getItem(key) || '{}');
        if (item.username && item.username.toLowerCase() === cleanUsername) {
          if (!currentUserId || item.id !== currentUserId) {
            return false;
          }
        }
      } catch {
        // ignore parse error
      }
    }
  }

  // 2. Check Supabase profiles table
  if (isLiveSupabaseConfigured()) {
    try {
      let query = supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', cleanUsername);

      if (currentUserId) {
        query = query.neq('id', currentUserId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[Supabase] checkUsernameAvailability query error:', error.message);
        return true;
      }
      return !data || data.length === 0;
    } catch {
      return true;
    }
  }

  return true;
}

/**
 * Fetches available cities from Supabase (or falls back to Pakistan cities list)
 */
export async function fetchCitiesFromSupabase(): Promise<CityOption[]> {
  if (!isLiveSupabaseConfigured()) {
    return PAKISTAN_CITIES_LIST;
  }
  try {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error || !data || data.length === 0) {
      return PAKISTAN_CITIES_LIST;
    }
    return data as CityOption[];
  } catch {
    return PAKISTAN_CITIES_LIST;
  }
}

/**
 * Compresses an image file to a base64 Data URL (max 400x400 JPEG)
 */
export function compressImageToDataUrl(file: File, maxDimension = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image file.'));
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a profile avatar image to Supabase Storage (bucket: 'avatars'),
 * with a resilient fallback to compressed base64 data URI if storage fails.
 */
export async function uploadAvatarToSupabase(
  userId: string,
  file: File
): Promise<string | null> {
  // Always prepare compressed data URL first as guaranteed fallback
  let fallbackDataUrl = '';
  try {
    fallbackDataUrl = await compressImageToDataUrl(file);
  } catch {
    // ignore
  }

  try {
    if (!isLiveSupabaseConfigured()) {
      return fallbackDataUrl || null;
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${userId}/avatar_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      console.warn('[Supabase] Avatar upload error, using local data URL:', uploadError.message);
      return fallbackDataUrl || null;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl || fallbackDataUrl || null;
  } catch (err) {
    console.warn('[Supabase] Exception uploading avatar, using fallback:', err);
    return fallbackDataUrl || null;
  }
}

/**
 * Creates restaurant record on Supabase
 */
export async function createRestaurantInSupabase(
  ownerId: string,
  restaurant: Omit<Restaurant, 'id' | 'owner_id' | 'created_at'>
): Promise<Restaurant | null> {
  try {
    if (!isLiveSupabaseConfigured()) return null;

    const payload = {
      owner_id: ownerId,
      name: restaurant.name,
      slug: restaurant.slug || restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      logo_url: restaurant.logo_url,
      cover_url: restaurant.cover_url,
      bio: restaurant.bio,
      category: restaurant.category,
      cuisine: restaurant.cuisine,
      address: restaurant.address,
      city: restaurant.city,
      lat: restaurant.lat || 31.5204,
      lng: restaurant.lng || 74.3587,
      delivery_time_min: restaurant.delivery_time_min,
      delivery_time_max: restaurant.delivery_time_max,
      delivery_fee: restaurant.delivery_fee,
      min_order: restaurant.min_order,
      rating: 5.0,
      review_count: 0,
      followers_count: 0,
      is_verified: false,
      is_featured: false,
      is_approved: true,
      is_open: true,
      opening_hours: restaurant.opening_hours,
    };

    const { data, error } = await supabase
      .from('restaurants')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.warn('[Supabase] Error creating restaurant:', error.message);
      return null;
    }

    return data as Restaurant;
  } catch (err) {
    console.warn('[Supabase] Exception creating restaurant:', err);
    return null;
  }
}
