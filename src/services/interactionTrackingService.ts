// ============================================================
// CRAVEDROP PLATFORM - VIDEO & FEED INTERACTION TRACKING SERVICE
// Isolated per authenticated user. Buffers and batches events.
// Supports both Supabase post_interactions and isolated localStorage caching.
// ============================================================

import { supabase } from '../lib/supabase';
import { isLiveSupabaseConfigured } from '../config/env';
import { InteractionEventType, PostInteraction } from '../types';

export interface InteractionEventPayload {
  userId: string;
  postId: string;
  eventType: InteractionEventType;
  watchDurationMs?: number;
  completionPercentage?: number;
  category?: string;
  cityId?: string;
}

export interface UserCategoryAffinityMap {
  [category: string]: number;
}

const getStorageKey = (userId: string) => `cravedrop_interactions_${userId}`;
const FLUSH_INTERVAL_MS = 3000;
const MAX_BUFFER_SIZE = 25;

class InteractionTrackingService {
  private buffer: InteractionEventPayload[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private isFlushing = false;

  constructor() {
    // Flush on page beforeunload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushImmediate();
      });
    }
  }

  /**
   * Log an interaction event (buffered and debounced)
   */
  public track(payload: InteractionEventPayload): void {
    if (!payload.userId || !payload.postId) return;

    // Normalize category
    const cleanPayload: InteractionEventPayload = {
      ...payload,
      category: (payload.category || '').toLowerCase().trim(),
      cityId: (payload.cityId || '').toLowerCase().trim(),
    };

    // Save immediately into per-user local cache for real-time reactivity
    this.recordLocalEvent(cleanPayload);

    // Queue for remote DB flush
    this.buffer.push(cleanPayload);

    if (this.buffer.length >= MAX_BUFFER_SIZE) {
      this.flush();
    } else if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        this.flush();
      }, FLUSH_INTERVAL_MS);
    }
  }

  /**
   * Convenience helpers for specific signals
   */
  public trackImpression(userId: string, postId: string, category?: string, cityId?: string): void {
    this.track({ userId, postId, eventType: 'impression', category, cityId });
  }

  public trackWatch(
    userId: string,
    postId: string,
    durationMs: number,
    completionPercentage: number,
    category?: string,
    cityId?: string
  ): void {
    this.track({
      userId,
      postId,
      eventType: 'watch',
      watchDurationMs: Math.round(durationMs),
      completionPercentage: Math.round(completionPercentage),
      category,
      cityId,
    });
  }

  public trackComplete(userId: string, postId: string, category?: string, cityId?: string): void {
    this.track({
      userId,
      postId,
      eventType: 'complete',
      completionPercentage: 100,
      category,
      cityId,
    });
  }

  public trackRewatch(userId: string, postId: string, category?: string, cityId?: string): void {
    this.track({
      userId,
      postId,
      eventType: 'rewatch',
      category,
      cityId,
    });
  }

  public trackLike(userId: string, postId: string, category?: string, cityId?: string): void {
    this.track({ userId, postId, eventType: 'like', category, cityId });
  }

  public trackSave(userId: string, postId: string, category?: string, cityId?: string): void {
    this.track({ userId, postId, eventType: 'save', category, cityId });
  }

  public trackShare(userId: string, postId: string, category?: string, cityId?: string): void {
    this.track({ userId, postId, eventType: 'share', category, cityId });
  }

  public trackComment(userId: string, postId: string, category?: string, cityId?: string): void {
    this.track({ userId, postId, eventType: 'comment', category, cityId });
  }

  public trackFollow(userId: string, postId: string, category?: string, cityId?: string): void {
    this.track({ userId, postId, eventType: 'follow', category, cityId });
  }

  public trackOrder(userId: string, postId: string, category?: string, cityId?: string): void {
    this.track({ userId, postId, eventType: 'order', category, cityId });
  }

  public trackSkip(
    userId: string,
    postId: string,
    durationMs: number,
    category?: string,
    cityId?: string
  ): void {
    this.track({
      userId,
      postId,
      eventType: 'skip',
      watchDurationMs: Math.round(durationMs),
      category,
      cityId,
    });
  }

  public trackNotInterested(userId: string, postId: string, category?: string, cityId?: string): void {
    this.track({ userId, postId, eventType: 'not_interested', category, cityId });
  }

  /**
   * Flushes queued interactions to Supabase
   */
  public async flush(): Promise<void> {
    if (this.buffer.length === 0 || this.isFlushing) return;
    this.isFlushing = true;

    const itemsToSend = [...this.buffer];
    this.buffer = [];

    if (!isLiveSupabaseConfigured()) {
      this.isFlushing = false;
      return;
    }

    try {
      const IS_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const records = itemsToSend
        .filter((item) => IS_UUID.test(item.userId) && IS_UUID.test(item.postId))
        .map((item) => ({
          user_id: item.userId,
          post_id: item.postId,
          event_type: item.eventType,
          watch_duration_ms: item.watchDurationMs || 0,
          completion_percentage: item.completionPercentage || 0,
          category: item.category || null,
          city_id: item.cityId || null,
        }));

      if (records.length > 0) {
        const { error } = await supabase.from('post_interactions').insert(records);
        if (error) {
          console.warn('[TrackingService] Supabase insert warning:', error.message);
        }
      }
    } catch (err) {
      console.warn('[TrackingService] Flush exception:', err);
    } finally {
      this.isFlushing = false;
    }
  }

  private flushImmediate(): void {
    if (this.buffer.length === 0) return;
    this.flush();
  }

  /**
   * Stores event in user's isolated localStorage history
   */
  private recordLocalEvent(payload: InteractionEventPayload): void {
    try {
      const key = getStorageKey(payload.userId);
      const raw = localStorage.getItem(key);
      const history: (InteractionEventPayload & { timestamp: number })[] = raw ? JSON.parse(raw) : [];

      history.push({
        ...payload,
        timestamp: Date.now(),
      });

      // Keep recent 200 interaction records per user to bound memory
      const trimmed = history.slice(-200);
      localStorage.setItem(key, JSON.stringify(trimmed));
    } catch {
      // Local storage failure safely ignored
    }
  }

  /**
   * Retrieves aggregated category affinities for an authenticated user.
   * Enables immediate real-time feedback loop without waiting for DB roundtrip.
   */
  public getUserCategoryAffinities(userId?: string): UserCategoryAffinityMap {
    if (!userId) return {};
    const affinities: UserCategoryAffinityMap = {};

    try {
      const key = getStorageKey(userId);
      const raw = localStorage.getItem(key);
      if (!raw) return {};

      const history: (InteractionEventPayload & { timestamp: number })[] = JSON.parse(raw);
      const now = Date.now();
      const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;

      for (const item of history) {
        if (!item.category) continue;
        if (now - item.timestamp > fourteenDaysMs) continue;

        let delta = 0;
        switch (item.eventType) {
          case 'complete':
            delta = 25;
            break;
          case 'rewatch':
            delta = 30;
            break;
          case 'like':
            delta = 20;
            break;
          case 'save':
            delta = 25;
            break;
          case 'share':
            delta = 30;
            break;
          case 'comment':
            delta = 25;
            break;
          case 'order':
            delta = 45;
            break;
          case 'watch':
            if ((item.completionPercentage || 0) >= 60) delta = 15;
            break;
          case 'skip':
            delta = -20;
            break;
          case 'not_interested':
            delta = -50;
            break;
          default:
            break;
        }

        affinities[item.category] = (affinities[item.category] || 0) + delta;
      }
    } catch {
      return {};
    }

    return affinities;
  }

  /**
   * Returns Set of post IDs marked as 'not_interested' by user
   */
  public getNotInterestedPostIds(userId?: string): Set<string> {
    if (!userId) return new Set();
    const result = new Set<string>();

    try {
      const key = getStorageKey(userId);
      const raw = localStorage.getItem(key);
      if (!raw) return result;

      const history: (InteractionEventPayload & { timestamp: number })[] = JSON.parse(raw);
      for (const item of history) {
        if (item.eventType === 'not_interested') {
          result.add(item.postId);
        }
      }
    } catch {}

    return result;
  }

  /**
   * Returns Set of post IDs skipped by user (< 2.5s)
   */
  public getSkippedPostIds(userId?: string): Set<string> {
    if (!userId) return new Set();
    const result = new Set<string>();

    try {
      const key = getStorageKey(userId);
      const raw = localStorage.getItem(key);
      if (!raw) return result;

      const history: (InteractionEventPayload & { timestamp: number })[] = JSON.parse(raw);
      for (const item of history) {
        if (item.eventType === 'skip') {
          result.add(item.postId);
        }
      }
    } catch {}

    return result;
  }

  /**
   * Returns impression counts per post ID for user fatigue mitigation
   */
  public getImpressionCounts(userId?: string): Record<string, number> {
    if (!userId) return {};
    const counts: Record<string, number> = {};

    try {
      const key = getStorageKey(userId);
      const raw = localStorage.getItem(key);
      if (!raw) return counts;

      const history: (InteractionEventPayload & { timestamp: number })[] = JSON.parse(raw);
      for (const item of history) {
        if (item.eventType === 'impression') {
          counts[item.postId] = (counts[item.postId] || 0) + 1;
        }
      }
    } catch {}

    return counts;
  }
}

export const interactionTracker = new InteractionTrackingService();
