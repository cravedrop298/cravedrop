// Environment variables helper with safe defaults for local preview

export const ENV = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://mock-cravedrop.supabase.co',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'mock-anon-key-cravedrop-2026',
  R2_ENDPOINT: import.meta.env.VITE_R2_ENDPOINT || 'https://crave-media.r2.cloudflarestorage.com',
  R2_BUCKET_NAME: import.meta.env.VITE_R2_BUCKET_NAME || 'cravedrop-media',
  R2_PUBLIC_URL: import.meta.env.VITE_R2_PUBLIC_URL || 'https://media.cravedrop.food',
  IS_PRODUCTION: import.meta.env.PROD,
};
