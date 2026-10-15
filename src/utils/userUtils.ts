// Utilities for User Profile Validation, Username Generation, and 14-Day Cooldowns

import { UserProfile, CityOption } from '../types';

export const PAKISTAN_CITIES_LIST: CityOption[] = [
  { id: 'lahore', name: 'Lahore', province: 'Punjab', country: 'Pakistan', lat: 31.5204, lng: 74.3587, is_active: true },
  { id: 'karachi', name: 'Karachi', province: 'Sindh', country: 'Pakistan', lat: 24.8607, lng: 67.0011, is_active: true },
  { id: 'islamabad', name: 'Islamabad', province: 'Federal Capital', country: 'Pakistan', lat: 33.6844, lng: 73.0479, is_active: true },
  { id: 'rawalpindi', name: 'Rawalpindi', province: 'Punjab', country: 'Pakistan', lat: 33.5651, lng: 73.0169, is_active: true },
  { id: 'peshawar', name: 'Peshawar', province: 'Khyber Pakhtunkhwa', country: 'Pakistan', lat: 34.0151, lng: 71.5249, is_active: true },
  { id: 'faisalabad', name: 'Faisalabad', province: 'Punjab', country: 'Pakistan', lat: 31.4504, lng: 73.1350, is_active: true },
  { id: 'multan', name: 'Multan', province: 'Punjab', country: 'Pakistan', lat: 30.1575, lng: 71.5249, is_active: true },
  { id: 'gujranwala', name: 'Gujranwala', province: 'Punjab', country: 'Pakistan', lat: 32.1877, lng: 74.1945, is_active: true },
  { id: 'sialkot', name: 'Sialkot', province: 'Punjab', country: 'Pakistan', lat: 32.4945, lng: 74.5229, is_active: true },
  { id: 'quetta', name: 'Quetta', province: 'Balochistan', country: 'Pakistan', lat: 30.1798, lng: 66.9750, is_active: true },
  { id: 'hyderabad', name: 'Hyderabad', province: 'Sindh', country: 'Pakistan', lat: 25.3960, lng: 68.3578, is_active: true },
  { id: 'bahawalpur', name: 'Bahawalpur', province: 'Punjab', country: 'Pakistan', lat: 29.3544, lng: 71.6911, is_active: true },
  { id: 'sargodha', name: 'Sargodha', province: 'Punjab', country: 'Pakistan', lat: 32.0836, lng: 72.6711, is_active: true },
  { id: 'abbottabad', name: 'Abbottabad', province: 'Khyber Pakhtunkhwa', country: 'Pakistan', lat: 34.1688, lng: 73.2215, is_active: true },
  { id: 'sukkur', name: 'Sukkur', province: 'Sindh', country: 'Pakistan', lat: 27.7052, lng: 68.8574, is_active: true },
  { id: 'mardan', name: 'Mardan', province: 'Khyber Pakhtunkhwa', country: 'Pakistan', lat: 34.1989, lng: 72.0404, is_active: true },
  { id: 'gujrat', name: 'Gujrat', province: 'Punjab', country: 'Pakistan', lat: 32.5742, lng: 74.0754, is_active: true },
];

export const PAKISTAN_CITIES: string[] = PAKISTAN_CITIES_LIST.map((c) => c.name);

export function getCityById(id: string): CityOption | undefined {
  const cleanId = id.trim().toLowerCase();
  return PAKISTAN_CITIES_LIST.find((c) => c.id.toLowerCase() === cleanId);
}

export function getCityByName(name: string): CityOption | undefined {
  const cleanName = name.trim().toLowerCase();
  return PAKISTAN_CITIES_LIST.find(
    (c) => c.name.toLowerCase() === cleanName || c.id.toLowerCase() === cleanName
  );
}

/**
 * Calculates remaining 14-day cooldown for name, username, or city changes
 */
export function getCooldownStatus(lastChangedAtIso?: string, daysLimit = 14): {
  isLocked: boolean;
  days: number;
  hours: number;
  formatted: string;
} {
  if (!lastChangedAtIso) {
    return { isLocked: false, days: 0, hours: 0, formatted: '' };
  }

  const lastTime = new Date(lastChangedAtIso).getTime();
  if (isNaN(lastTime)) {
    return { isLocked: false, days: 0, hours: 0, formatted: '' };
  }

  const cooldownMs = daysLimit * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const diffMs = cooldownMs - (now - lastTime);

  if (diffMs <= 0) {
    return { isLocked: false, days: 0, hours: 0, formatted: '' };
  }

  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  const formatted = `${days}d ${hours.toString().padStart(2, '0')}h remaining`;
  return { isLocked: true, days, hours, formatted };
}

/**
 * Normalizes and validates username format (a-z, 0-9, _, .)
 */
export function normalizeUsername(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9_.]/g, '');
}

export function validateUsernameRules(username: string): { isValid: boolean; error?: string } {
  const u = username.toLowerCase().trim();
  if (!u) return { isValid: false, error: 'Username is required.' };
  if (u.length < 3) return { isValid: false, error: 'Username must be at least 3 characters.' };
  if (u.length > 30) return { isValid: false, error: 'Username cannot exceed 30 characters.' };
  if (!/^[a-z0-9_.]+$/.test(u)) return { isValid: false, error: 'Letters, numbers, underscores, and dots only.' };
  if (u.startsWith('.') || u.startsWith('_') || u.endsWith('.') || u.endsWith('_')) {
    return { isValid: false, error: 'Cannot start or end with a dot or underscore.' };
  }
  if (u.includes('..') || u.includes('__') || u.includes('._') || u.includes('_.')) {
    return { isValid: false, error: 'Cannot contain consecutive special characters.' };
  }
  return { isValid: true };
}

/**
 * Checks if username is valid format
 */
export function isValidUsernameFormat(username: string): boolean {
  return validateUsernameRules(username).isValid;
}

/**
 * Generates a guaranteed unique username based on full name
 */
export function generateUniqueUsername(fullName: string, existingUsers: UserProfile[]): string {
  const base = fullName.toLowerCase().trim().replace(/[^a-z0-9]/g, '') || 'foodie';
  const takenUsernames = new Set(existingUsers.map((u) => (u.username || '').toLowerCase()));

  if (!takenUsernames.has(base)) {
    return base;
  }

  // Try appending numbers: 72, 482, 101, etc.
  const randomSuffixes = [72, 482, 101, 88, 305, 999, Math.floor(100 + Math.random() * 900)];
  for (const num of randomSuffixes) {
    const candidate = `${base}${num}`;
    if (!takenUsernames.has(candidate)) {
      return candidate;
    }
  }

  return `${base}_${Date.now().toString().slice(-4)}`;
}

/**
 * Validates Pakistan mobile phone format (+92 3XX XXXXXXX)
 * Accepts inputs like: "+923001234567", "03001234567", "3001234567"
 * Returns normalized string "+923XXXXXXXXX" or null if invalid
 */
export function normalizePakistanPhone(phoneInput: string): { valid: boolean; normalized: string; error?: string } {
  if (!phoneInput) {
    return { valid: false, normalized: '', error: 'Phone number is required.' };
  }

  let cleaned = phoneInput.replace(/[\s\-\(\)]/g, '');

  if (cleaned.startsWith('0092')) {
    cleaned = '+' + cleaned.slice(2);
  } else if (cleaned.startsWith('03')) {
    cleaned = '+92' + cleaned.slice(1);
  } else if (cleaned.startsWith('3') && cleaned.length === 10) {
    cleaned = '+92' + cleaned;
  } else if (!cleaned.startsWith('+92') && cleaned.startsWith('92')) {
    cleaned = '+' + cleaned;
  }

  if (!cleaned.startsWith('+92')) {
    return { valid: false, normalized: cleaned, error: 'Only Pakistani phone numbers (+92) are allowed.' };
  }

  // Check pattern: +92 followed by 3 and 9 digits (total 13 chars)
  const pkPattern = /^\+923\d{9}$/;
  if (!pkPattern.test(cleaned)) {
    return { valid: false, normalized: cleaned, error: 'Invalid Pakistani mobile number. Must be format: +92 3XX XXXXXXX' };
  }

  return { valid: true, normalized: cleaned };
}
