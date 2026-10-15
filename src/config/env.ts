// Environment configuration with production-grade Supabase integration
// Safely reads from Vite import.meta.env with support for local and cloud environments

const envMeta = (typeof import.meta !== 'undefined' && import.meta.env)
  ? import.meta.env
  : ((globalThis as any)?.process?.env || {});

const rawUrl = (envMeta.VITE_SUPABASE_URL as string | undefined)?.trim();
const rawKey = (envMeta.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const ENV = {
  SUPABASE_URL: rawUrl || 'https://demo-cravedrop.supabase.co',
  SUPABASE_ANON_KEY: rawKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.mock_cravedrop_anon_key_2026',
  R2_ENDPOINT: (envMeta.VITE_R2_ENDPOINT as string | undefined) || 'https://crave-media.r2.cloudflarestorage.com',
  R2_BUCKET_NAME: (envMeta.VITE_R2_BUCKET_NAME as string | undefined) || 'cravedrop-media',
  R2_PUBLIC_URL: (envMeta.VITE_R2_PUBLIC_URL as string | undefined) || 'https://media.cravedrop.food',
  APP_URL: (envMeta.VITE_APP_URL as string | undefined)?.trim() || 'https://cravedrop.app',
  IS_PRODUCTION: Boolean(envMeta.PROD),
};

/**
 * Returns true if real, valid Supabase credentials have been configured
 * in the environment (.env / .env.local).
 */
export function isLiveSupabaseConfigured(): boolean {
  if (!rawUrl || !rawKey) return false;
  if (rawUrl.includes('demo-cravedrop') || rawUrl.includes('mock-cravedrop') || rawUrl.includes('your-project-id')) {
    return false;
  }
  if (rawKey.includes('mock_cravedrop') || rawKey.includes('your-anon-public-key')) {
    return false;
  }
  return rawUrl.startsWith('https://') && rawKey.length > 20;
}
