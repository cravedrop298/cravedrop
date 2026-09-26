// Supabase Client Initialization & Helper

import { createClient } from '@supabase/supabase-js';
import { ENV } from '../config/env';

export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Checks if the configured Supabase client is connected to a live production instance
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    if (!ENV.SUPABASE_URL || ENV.SUPABASE_URL.includes('mock-cravedrop')) {
      return false;
    }
    const { error } = await supabase.from('restaurants').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
