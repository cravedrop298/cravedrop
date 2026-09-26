// Expiry Calculation & Validation Service for Food Posts

import { ExpiryDurationOption, FoodPost, Product } from '../types';

export interface ExpiryDisplayInfo {
  isExpired: boolean;
  statusText: string;
  urgencyLevel: 'normal' | 'moderate' | 'urgent' | 'critical' | 'expired';
  remainingMs: number;
  formattedCountdown: string;
}

/**
 * Calculates future ISO string based on preset duration or custom date
 */
export function calculateExpiryTimestamp(
  option: ExpiryDurationOption,
  customDate?: string
): string {
  const now = new Date();

  if (option === 'custom' && customDate) {
    const custom = new Date(customDate);
    if (custom.getTime() > now.getTime()) {
      return custom.toISOString();
    }
  }

  const hoursMap: Record<Exclude<ExpiryDurationOption, 'custom'>, number> = {
    '1h': 1,
    '3h': 3,
    '6h': 6,
    '12h': 12,
    '24h': 24,
  };

  const hoursToAdd = option !== 'custom' ? hoursMap[option] || 6 : 6;
  const target = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
  return target.toISOString();
}

/**
 * Checks if a post is expired based on current server/client time
 */
export function isPostExpired(expiresAt: string | Date): boolean {
  const expiryTime = new Date(expiresAt).getTime();
  const currentTime = Date.now();
  return currentTime >= expiryTime;
}

/**
 * Formats the countdown badge according to specification rules:
 * - Expired: "Expired"
 * - < 10 mins: "Ends in 08m" (critical)
 * - < 1 hour: "Ends in 42m" (urgent)
 * - < 6 hours: "Ends in 5h 32m" (moderate)
 * - > 6 hours: "Available today" (normal)
 */
export function getExpiryDisplayInfo(expiresAt: string | Date): ExpiryDisplayInfo {
  const expiryTime = new Date(expiresAt).getTime();
  const now = Date.now();
  const remainingMs = expiryTime - now;

  if (remainingMs <= 0) {
    return {
      isExpired: true,
      statusText: 'Expired',
      urgencyLevel: 'expired',
      remainingMs: 0,
      formattedCountdown: 'Expired',
    };
  }

  const totalMinutes = Math.floor(remainingMs / (1000 * 60));
  const totalHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

  // Less than 10 minutes: critical urgency
  if (totalMinutes < 10) {
    const paddedMins = totalMinutes.toString().padStart(2, '0');
    const paddedSecs = seconds.toString().padStart(2, '0');
    return {
      isExpired: false,
      statusText: `Ends in ${paddedMins}m ${paddedSecs}s`,
      urgencyLevel: 'critical',
      remainingMs,
      formattedCountdown: `${paddedMins}:${paddedSecs} left`,
    };
  }

  // Less than 1 hour: urgent
  if (totalHours < 1) {
    const paddedMins = minutes.toString().padStart(2, '0');
    return {
      isExpired: false,
      statusText: `Ends in ${paddedMins}m`,
      urgencyLevel: 'urgent',
      remainingMs,
      formattedCountdown: `${paddedMins}m left`,
    };
  }

  // Less than 6 hours: moderate
  if (totalHours < 6) {
    return {
      isExpired: false,
      statusText: `Ends in ${totalHours}h ${minutes}m`,
      urgencyLevel: 'moderate',
      remainingMs,
      formattedCountdown: `${totalHours}h ${minutes}m left`,
    };
  }

  // More than 6 hours
  return {
    isExpired: false,
    statusText: 'Available today',
    urgencyLevel: 'normal',
    remainingMs,
    formattedCountdown: `${totalHours}h remaining`,
  };
}

/**
 * Server-side / Business Logic Validation:
 * Prevents ordering if a post or product is expired or inactive.
 */
export function validateOrderDropEligibility(
  post?: FoodPost | null,
  product?: Product | null
): { valid: boolean; error?: string } {
  if (post) {
    if (isPostExpired(post.expires_at)) {
      return {
        valid: false,
        error: 'This limited-time food drop has expired and is no longer available for order.',
      };
    }
  }

  if (product) {
    if (!product.is_active || !product.is_available) {
      return {
        valid: false,
        error: 'This food item is currently out of stock or unavailable.',
      };
    }
  }

  return { valid: true };
}
