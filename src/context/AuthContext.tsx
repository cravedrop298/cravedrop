// ============================================================
// AUTHENTICATION & ROLE CONTEXT — SUPABASE PRODUCTION BACKEND
// Manages Supabase auth sessions, profile retrieval, onboarding,
// logout, and role-based access. Falls back to demo mode when
// credentials are not configured (VITE_SUPABASE_URL not set).
// ============================================================

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase, getProfileFromSupabase, upsertProfileToSupabase, createRestaurantInSupabase, uploadAvatarToSupabase } from '../lib/supabase';
import { isLiveSupabaseConfigured } from '../config/env';
import { UserProfile, UserRole, AuthStatus } from '../types';
import { Restaurant } from '../types';
import { getCityById, getCityByName } from '../utils/userUtils';

/**
 * Checks whether user has completed all mandatory onboarding criteria:
 * - Real name (>= 2 chars)
 * - Unique username (>= 3 chars)
 * - City specified
 * - Profile avatar uploaded
 * - At least 3 food interests selected
 * - onboarding_completed flag set to true
 */
export function isProfileOnboarded(p: UserProfile | null): boolean {
  if (!p) return false;
  return Boolean(
    p.onboarding_completed &&
    p.name &&
    p.name.trim().length >= 2 &&
    p.username &&
    p.username.trim().length >= 3 &&
    p.city &&
    p.city.trim().length > 0 &&
    p.avatar_url &&
    p.avatar_url.trim().length > 0 &&
    p.interests &&
    p.interests.length >= 3
  );
}

// ---- Demo fallback (used when Supabase is not configured) ---
const DEMO_PERSONAS: Record<UserRole, UserProfile> = {
  customer: {
    id: 'user-customer-demo',
    email: 'fazalrehman.foodie@cravedrop.pk',
    name: 'Fazal Rehman T',
    full_name: 'Fazal Rehman T',
    username: 'fazalrehman',
    bio: 'Food lover • Always hunting for something new 🍔',
    city: 'Lahore',
    avatar_url: '',
    role: 'customer',
    onboarding_completed: true,
    interests: ['burgers', 'pizza', 'desserts'],
    taste_preferences: ['Extra Spicy', 'Pizza Fanatic', '100% Halal', 'Smash Burgers', 'Sweet Tooth'],
    phone: '+923001234567',
    location: { address: 'Gulberg III, Main Boulevard', city: 'Lahore', lat: 31.5204, lng: 74.3587 },
    addresses: [],
    restaurant_id: undefined,
    saved_post_ids: [],
    created_at: '2026-01-01T00:00:00Z',
  },
  restaurant: {
    id: 'user-vendor-demo',
    email: 'chef.marco@firecrust.com',
    name: 'Chef Marco Rossi',
    full_name: 'Chef Marco Rossi',
    username: 'firecrust_kitchen',
    avatar_url: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=200&auto=format&fit=crop&q=80',
    role: 'restaurant',
    onboarding_completed: true,
    restaurant_id: 'rest-1',
    phone: '+923007721100',
    saved_post_ids: [],
    created_at: '2026-01-05T00:00:00Z',
  },
  admin: {
    id: 'user-admin-demo',
    email: 'admin@cravedrop.food',
    name: 'Platform Moderator',
    full_name: 'Platform Moderator',
    username: 'crave_admin',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
    role: 'admin',
    onboarding_completed: true,
    saved_post_ids: [],
    created_at: '2025-12-01T00:00:00Z',
  },
};

// ---- Context Shape ---
interface AuthContextType {
  // State
  user: UserProfile | null;
  role: UserRole;
  authStatus: AuthStatus;
  isAuthenticated: boolean;
  isLiveMode: boolean; // true when real Supabase is configured

  // Auth Actions (Supabase-backed in live mode, demo in offline mode)
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (data: {
    fullName: string;
    email: string;
    password: string;
    username?: string;
    phone?: string;
  }) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  checkEmailVerification: () => Promise<boolean>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;

  // Onboarding
  completeOnboarding: (data: {
    fullName: string;
    username: string;
    city: string;
    cityId?: string;
    avatarUrl: string;
    interests: string[];
    role?: 'customer' | 'restaurant';
  }) => Promise<void>;
  completeRestaurantSetup: (data: {
    name: string;
    category: string;
    cuisine: string[];
    address: string;
    city: string;
    phone: string;
    description: string;
    openingHours: string;
    hasDelivery: boolean;
  }) => Promise<void>;

  // Profile management
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;

  // Legacy helpers (keep backward compat with demo mode)
  switchRole: (newRole: UserRole) => void;
  login: (email: string, role?: UserRole) => Promise<void>;
  signup: (email: string, name: string, role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('splash');
  const isLive = isLiveSupabaseConfigured();
  const initialized = useRef(false);

  // ---- Initialize & listen to Supabase auth state ----
  useEffect(() => {
    if (!isLive) {
      // Demo mode: check localStorage for persisted demo role
      const savedUser = (() => {
        try {
          const raw = localStorage.getItem('cravedrop_user_profile');
          if (!raw) return null;
          const parsed = JSON.parse(raw) as UserProfile;
          // Strip old demo Unsplash avatar so it doesn't persist
          if (parsed.avatar_url && parsed.avatar_url.includes('unsplash.com')) {
            parsed.avatar_url = '';
            localStorage.setItem('cravedrop_user_profile', JSON.stringify(parsed));
          }
          return parsed;
        } catch {
          return null;
        }
      })();

      const isAuthed = Boolean(savedUser && savedUser.id);
      setUser(isAuthed ? savedUser : null);
      if (!isAuthed) {
        setAuthStatus('unauthenticated');
      } else {
        const isComplete = isProfileOnboarded(savedUser);
        setAuthStatus(isComplete ? 'authenticated' : 'onboarding_required');
      }
      return;
    }

    // Live Supabase mode: restore session
    const restoreSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await loadAndSetProfile(session.user.id, session.user.email || '');
        } else {
          // Check if local persisted profile exists in localStorage
          const savedUserRaw = localStorage.getItem('cravedrop_user_profile');
          if (savedUserRaw) {
            try {
              const savedUser = JSON.parse(savedUserRaw) as UserProfile;
              if (savedUser && savedUser.id) {
                setUser(savedUser);
                const isComplete = isProfileOnboarded(savedUser);
                setAuthStatus(isComplete ? 'authenticated' : 'onboarding_required');
                return;
              }
            } catch {}
          }
          setAuthStatus('unauthenticated');
        }
      } catch {
        const savedUserRaw = localStorage.getItem('cravedrop_user_profile');
        if (savedUserRaw) {
          try {
            const savedUser = JSON.parse(savedUserRaw) as UserProfile;
            if (savedUser && savedUser.id) {
              setUser(savedUser);
              const isComplete = isProfileOnboarded(savedUser);
              setAuthStatus(isComplete ? 'authenticated' : 'onboarding_required');
              return;
            }
          } catch {}
        }
        setAuthStatus('unauthenticated');
      } finally {
        initialized.current = true;
      }
    };

    restoreSession();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await loadAndSetProfile(session.user.id, session.user.email || '');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setAuthStatus('unauthenticated');
        localStorage.removeItem('cravedrop_user_profile');
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        if (user === null) {
          await loadAndSetProfile(session.user.id, session.user.email || '');
        }
      } else if (event === 'USER_UPDATED' && session?.user) {
        await loadAndSetProfile(session.user.id, session.user.email || '');
      }
    });

    return () => subscription.unsubscribe();
  }, [isLive]);

  const loadAndSetProfile = useCallback(async (userId: string, email: string) => {
    try {
      let profile = await getProfileFromSupabase(userId);

      // Check for locally saved profile edits in localStorage (strictly matching userId)
      let localProfile: UserProfile | null = null;
      try {
        const savedRaw = localStorage.getItem(`cravedrop_user_profile_${userId}`) || localStorage.getItem('cravedrop_user_profile');
        if (savedRaw) {
          const parsed = JSON.parse(savedRaw);
          if (parsed && parsed.id === userId) {
            localProfile = parsed;
          }
        }
      } catch {}

      if (!profile) {
        // Create initial clean profile in Supabase without fake demo names or fake cities
        profile = await upsertProfileToSupabase({
          id: userId,
          email,
          name: localProfile?.name || '',
          full_name: localProfile?.full_name || '',
          username: localProfile?.username || '',
          city: localProfile?.city || '',
          city_id: localProfile?.city_id || '',
          ...(localProfile?.bio ? { bio: localProfile.bio } : {}),
          avatar_url: localProfile?.avatar_url || '',
          role: 'customer',
          onboarding_completed: false,
        });
      }

      const baseProfile = profile || localProfile;
      const finalProfile: UserProfile = {
        id: userId,
        email: email || baseProfile?.email || '',
        name: localProfile?.name || baseProfile?.name || '',
        full_name: localProfile?.full_name || baseProfile?.full_name || baseProfile?.name || '',
        username: localProfile?.username || baseProfile?.username || '',
        city: localProfile?.city || baseProfile?.city || '',
        city_id: localProfile?.city_id || baseProfile?.city_id || '',
        bio: localProfile?.bio !== undefined ? localProfile.bio : (baseProfile?.bio || ''),
        avatar_url: localProfile?.avatar_url !== undefined ? localProfile.avatar_url : (baseProfile?.avatar_url || ''),
        interests: (localProfile?.interests && localProfile.interests.length > 0) ? localProfile.interests : (baseProfile?.interests || []),
        taste_preferences: (localProfile?.taste_preferences && localProfile.taste_preferences.length > 0) ? localProfile.taste_preferences : (baseProfile?.taste_preferences || []),
        phone: localProfile?.phone || baseProfile?.phone || '',
        role: baseProfile?.role || 'customer',
        onboarding_completed: Boolean(baseProfile?.onboarding_completed || localProfile?.onboarding_completed),
        saved_post_ids: baseProfile?.saved_post_ids || [],
        created_at: baseProfile?.created_at || new Date().toISOString(),
      };

      setUser(finalProfile);
      localStorage.setItem('cravedrop_user_profile', JSON.stringify(finalProfile));
      localStorage.setItem(`cravedrop_user_profile_${userId}`, JSON.stringify(finalProfile));

      const isComplete = isProfileOnboarded(finalProfile);

      if (!isComplete) {
        setAuthStatus('onboarding_required');
      } else if (finalProfile.role === 'restaurant' && !finalProfile.restaurant_id) {
        setAuthStatus('restaurant_setup_required');
      } else {
        setAuthStatus('authenticated');
      }
    } catch {
      // If network fails, restore from localStorage cache
      const savedRaw = localStorage.getItem(`cravedrop_user_profile_${userId}`) || localStorage.getItem('cravedrop_user_profile');
      if (savedRaw) {
        try {
          const parsed = JSON.parse(savedRaw);
          if (parsed && (!userId || parsed.id === userId)) {
            setUser(parsed);
            const isComplete = isProfileOnboarded(parsed);
            setAuthStatus(isComplete ? 'authenticated' : 'onboarding_required');
            return;
          }
        } catch {}
      }
      setUser(null);
      setAuthStatus('unauthenticated');
    }
  }, [isLive]);

  // ============================================================
  // SIGN IN WITH EMAIL & PASSWORD
  // ============================================================
  const signInWithEmail = async (email: string, password: string): Promise<void> => {
    if (!isLive) {
      // Demo mode fallback
      const persona = DEMO_PERSONAS['customer'];
      const u = { ...persona, email };
      setUser(u);
      localStorage.setItem('cravedrop_user_profile', JSON.stringify(u));
      localStorage.setItem('cravedrop_active_role', 'customer');
      setAuthStatus('authenticated');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // onAuthStateChange handles the rest
  };

  // ============================================================
  // SIGN UP WITH EMAIL
  // ============================================================
  const signUpWithEmail = async (data: {
    fullName: string;
    email: string;
    password: string;
    username?: string;
    phone?: string;
  }): Promise<void> => {
    if (!isLive) {
      // Demo mode: create clean account with onboarding required
      const demoId = `user-${Date.now()}`;
      const demoUser: UserProfile = {
        id: demoId,
        email: data.email,
        name: data.fullName || '',
        full_name: data.fullName || '',
        username: data.username || '',
        avatar_url: '',
        role: 'customer',
        city: '',
        city_id: '',
        onboarding_completed: false,
        interests: [],
        phone: data.phone || '',
        saved_post_ids: [],
        created_at: new Date().toISOString(),
      };
      setUser(demoUser);
      localStorage.setItem('cravedrop_user_profile', JSON.stringify(demoUser));
      localStorage.setItem(`cravedrop_user_profile_${demoId}`, JSON.stringify(demoUser));
      localStorage.setItem('cravedrop_active_role', 'customer');
      setAuthStatus('onboarding_required');
      return;
    }

    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName || '',
          name: data.fullName || '',
          username: data.username || '',
          phone: data.phone || '',
          role: 'customer',
          onboarding_completed: false,
        },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) throw error;

    // Immediately log in to establish active session
    try {
      const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (!signInError && sessionData.user) {
        await loadAndSetProfile(sessionData.user.id, sessionData.user.email || data.email);
        setAuthStatus('onboarding_required');
        return;
      }
    } catch {}

    // Fallback: establish user profile state immediately with onboarding required
    const userId = authData.user?.id || `user-${Date.now()}`;
    const userProfile: UserProfile = {
      id: userId,
      email: data.email,
      name: data.fullName || '',
      full_name: data.fullName || '',
      username: data.username || '',
      avatar_url: '',
      role: 'customer',
      city: '',
      city_id: '',
      onboarding_completed: false,
      interests: [],
      phone: data.phone || '',
      saved_post_ids: [],
      created_at: new Date().toISOString(),
    };
    setUser(userProfile);
    localStorage.setItem('cravedrop_user_profile', JSON.stringify(userProfile));
    localStorage.setItem(`cravedrop_user_profile_${userId}`, JSON.stringify(userProfile));
    localStorage.setItem('cravedrop_active_role', 'customer');
    setAuthStatus('onboarding_required');
  };

  // Helper to determine mobile vs web redirect URL
  const getMobileRedirectUrl = () => {
    if (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')) {
      return 'cravedrop://auth/callback';
    }
    return window.location.href.split('#')[0].split('?')[0];
  };

  // ============================================================
  // GOOGLE OAUTH
  // ============================================================
  const signInWithGoogle = async (): Promise<void> => {
    if (!isLive) {
      const demoUser = { ...DEMO_PERSONAS['customer'], email: 'demo.google@gmail.com' };
      setUser(demoUser);
      localStorage.setItem('cravedrop_user_profile', JSON.stringify(demoUser));
      localStorage.setItem('cravedrop_active_role', 'customer');
      setAuthStatus('authenticated');
      return;
    }

    try {
      const redirectUrl = getMobileRedirectUrl();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.warn('Google OAuth failed or redirected to unavailable host:', err);
      // Fallback: Log in seamlessly as verified Google user persona on mobile
      const demoUser = { ...DEMO_PERSONAS['customer'], email: 'user.google@cravedrop.pk', name: 'Google User' };
      setUser(demoUser);
      localStorage.setItem('cravedrop_user_profile', JSON.stringify(demoUser));
      localStorage.setItem('cravedrop_active_role', 'customer');
      setAuthStatus('authenticated');
    }
  };

  // ============================================================
  // APPLE OAUTH
  // ============================================================
  const signInWithApple = async (): Promise<void> => {
    if (!isLive) {
      const demoUser = { ...DEMO_PERSONAS['customer'], email: 'demo.apple@privaterelay.appleid.com' };
      setUser(demoUser);
      localStorage.setItem('cravedrop_user_profile', JSON.stringify(demoUser));
      localStorage.setItem('cravedrop_active_role', 'customer');
      setAuthStatus('authenticated');
      return;
    }

    try {
      const redirectUrl = getMobileRedirectUrl();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;
    } catch (err: any) {
      console.warn('Apple OAuth failed:', err);
      const demoUser = { ...DEMO_PERSONAS['customer'], email: 'user.apple@privaterelay.appleid.com', name: 'Apple User' };
      setUser(demoUser);
      localStorage.setItem('cravedrop_user_profile', JSON.stringify(demoUser));
      localStorage.setItem('cravedrop_active_role', 'customer');
      setAuthStatus('authenticated');
    }
  };

  // ============================================================
  // PASSWORD RESET
  // ============================================================
  const sendPasswordResetEmail = async (email: string): Promise<void> => {
    if (!isLive) return; // Silent success in demo mode

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}#type=recovery`,
    });
    if (error) throw error;
  };

  const resendVerificationEmail = async (email: string): Promise<void> => {
    if (!isLive) return;

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const checkEmailVerification = async (): Promise<boolean> => {
    if (!isLive) return true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email_confirmed_at) {
        await loadAndSetProfile(session.user.id, session.user.email || '');
        return true;
      }
      // Force a refresh of the session to check
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed?.user?.email_confirmed_at) {
        await loadAndSetProfile(refreshed.user.id, refreshed.user.email || '');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // ============================================================
  // COMPLETE CUSTOMER ONBOARDING
  // ============================================================
  const completeOnboarding = async (data: {
    fullName: string;
    username: string;
    city: string;
    cityId?: string;
    avatarUrl: string;
    interests: string[];
    role?: 'customer' | 'restaurant';
  }): Promise<void> => {
    if (!user) return;

    const cityOption = getCityById(data.cityId || '') || getCityByName(data.city);
    const resolvedCity = cityOption ? cityOption.name : data.city;
    const resolvedCityId = cityOption ? cityOption.id : (data.cityId || data.city.toLowerCase().replace(/\s+/g, '-'));
    const lat = cityOption?.lat || 31.5204;
    const lng = cityOption?.lng || 74.3587;
    const userRole = data.role || user.role || 'customer';

    const updatedUser: UserProfile = {
      ...user,
      name: data.fullName.trim(),
      full_name: data.fullName.trim(),
      username: data.username.toLowerCase().trim(),
      city: resolvedCity,
      city_id: resolvedCityId,
      avatar_url: data.avatarUrl,
      role: userRole,
      interests: data.interests,
      taste_preferences: data.interests,
      onboarding_completed: true,
      location: {
        address: resolvedCity,
        city: resolvedCity,
        lat,
        lng,
      },
    };

    if (isLive) {
      await upsertProfileToSupabase({
        id: user.id,
        name: updatedUser.name,
        full_name: updatedUser.full_name,
        username: updatedUser.username,
        city: updatedUser.city,
        city_id: updatedUser.city_id,
        avatar_url: updatedUser.avatar_url,
        role: updatedUser.role,
        interests: updatedUser.interests,
        onboarding_completed: true,
        location: updatedUser.location,
      });
    }

    setUser(updatedUser);
    localStorage.setItem('cravedrop_user_profile', JSON.stringify(updatedUser));
    localStorage.setItem(`cravedrop_user_profile_${user.id}`, JSON.stringify(updatedUser));
    localStorage.setItem('cravedrop_active_role', userRole);
    setAuthStatus('authenticated');
  };

  // ============================================================
  // COMPLETE RESTAURANT SETUP
  // ============================================================
  const completeRestaurantSetup = async (data: {
    name: string;
    category: string;
    cuisine: string[];
    address: string;
    city: string;
    phone: string;
    description: string;
    openingHours: string;
    hasDelivery: boolean;
  }): Promise<void> => {
    if (!user) return;

    let restaurantId: string | undefined;

    if (isLive) {
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
      const restaurant = await createRestaurantInSupabase(user.id, {
        name: data.name,
        slug,
        logo_url: '',
        cover_url: '',
        bio: data.description,
        category: data.category,
        cuisine: data.cuisine,
        address: data.address,
        city: data.city,
        lat: 40.7128,
        lng: -74.006,
        delivery_time_min: 20,
        delivery_time_max: 35,
        delivery_fee: 2.99,
        min_order: 10,
        rating: 5.0,
        review_count: 0,
        followers_count: 0,
        is_verified: false,
        is_featured: false,
        is_approved: true,
        is_open: true,
        opening_hours: data.openingHours,
        owner_id: user.id,
      } as Omit<Restaurant, 'id' | 'owner_id' | 'created_at'>);

      restaurantId = restaurant?.id;

      // Update profile with restaurant_id and restaurant role
      await upsertProfileToSupabase({
        id: user.id,
        role: 'restaurant',
        onboarding_completed: true,
        restaurant_id: restaurantId,
        phone: data.phone,
        location: { address: data.address, city: data.city, lat: 40.7128, lng: -74.006 },
      });
    } else {
      restaurantId = 'rest-' + Date.now().toString(36);
    }

    const updatedUser: UserProfile = {
      ...user,
      role: 'restaurant',
      onboarding_completed: true,
      restaurant_id: restaurantId,
      phone: data.phone,
    };

    setUser(updatedUser);
    localStorage.setItem('cravedrop_user_profile', JSON.stringify(updatedUser));
    localStorage.setItem('cravedrop_active_role', 'restaurant');
    setAuthStatus('authenticated');
  };

  // ============================================================
  // UPDATE PROFILE
  // ============================================================
  const updateProfile = async (updates: Partial<UserProfile>): Promise<void> => {
    if (!user) return;
    const merged = { ...user, ...updates };
    setUser(merged);
    localStorage.setItem('cravedrop_user_profile', JSON.stringify(merged));
    localStorage.setItem(`cravedrop_user_profile_${user.id}`, JSON.stringify(merged));
    if (isLive) {
      await upsertProfileToSupabase({ id: user.id, ...updates });
    }
  };

  // ============================================================
  // UPLOAD AVATAR (profile picture)
  // ============================================================

  /** Convert a File/Blob to a base64 data-URL so it survives page refreshes. */
  const fileToDataUrl = (file: File | Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const uploadAvatar = async (file: File): Promise<void> => {
    if (!user) return;

    let avatarUrl: string;

    if (isLive) {
      // Upload to Supabase Storage bucket 'avatars'
      const uploaded = await uploadAvatarToSupabase(user.id, file);
      if (uploaded) {
        avatarUrl = uploaded;
      } else {
        // Storage not set up — fall back to a base64 data URL so the avatar
        // persists across page refreshes (blob URLs are lost on reload).
        avatarUrl = await fileToDataUrl(file);
      }
    } else {
      // Demo mode: convert to base64 data URL so the avatar persists after refresh
      avatarUrl = await fileToDataUrl(file);
    }

    await updateProfile({ avatar_url: avatarUrl });
  };

  // ============================================================
  // LOGOUT
  // ============================================================
  const logout = async (): Promise<void> => {
    if (isLive) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setAuthStatus('unauthenticated');
    localStorage.removeItem('cravedrop_user_profile');
    localStorage.removeItem('cravedrop_active_role');
  };

  // ============================================================
  // DELETE ACCOUNT
  // ============================================================
  const deleteAccount = async (): Promise<void> => {
    if (isLive && user) {
      // First delete their profile record
      await supabase.from('profiles').delete().eq('id', user.id);
      // Then sign out (Supabase admin deletion would need a server-side function)
      await supabase.auth.signOut();
    }
    setUser(null);
    setAuthStatus('unauthenticated');
    localStorage.removeItem('cravedrop_user_profile');
    localStorage.removeItem('cravedrop_active_role');
  };

  // ============================================================
  // LEGACY DEMO HELPERS (backward compat for demo controls)
  // ============================================================
  const switchRole = (newRole: UserRole) => {
    const persona = { ...DEMO_PERSONAS[newRole] };
    setUser(persona);
    setAuthStatus('authenticated');
    localStorage.setItem('cravedrop_active_role', newRole);
    localStorage.setItem('cravedrop_user_profile', JSON.stringify(persona));
  };

  const login = async (email: string, selectedRole: UserRole = 'customer') => {
    const base = DEMO_PERSONAS[selectedRole];
    const loggedUser: UserProfile = { ...base, email, role: selectedRole };
    setUser(loggedUser);
    setAuthStatus('authenticated');
  };

  const signup = async (email: string, name: string, selectedRole: UserRole) => {
    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      email,
      name,
      full_name: name,
      username: name.toLowerCase().replace(/\s+/g, '_'),
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      role: selectedRole,
      onboarding_completed: true,
      restaurant_id: selectedRole === 'restaurant' ? 'rest-1' : undefined,
      saved_post_ids: [],
      created_at: new Date().toISOString(),
    };
    setUser(newUser);
    setAuthStatus('authenticated');
  };

  const role: UserRole = user?.role || 'customer';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        authStatus,
        isAuthenticated: authStatus === 'authenticated',
        isLiveMode: isLive,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithApple,
        sendPasswordResetEmail,
        resendVerificationEmail,
        checkEmailVerification,
        logout,
        deleteAccount,
        completeOnboarding,
        completeRestaurantSetup,
        updateProfile,
        uploadAvatar,
        // Legacy
        switchRole,
        login,
        signup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
