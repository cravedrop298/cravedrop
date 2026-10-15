// ============================================================
// CraveDrop Recommendation Engine Automated Verification Suite
// Tests A, B, C, D, E
// ============================================================

import { INITIAL_POSTS, INITIAL_RESTAURANTS } from '../data/seedData';
import {
  rankFoodPostsStrict,
  calculatePostRecommendationScore,
  isPostEligibleForCity,
} from '../services/recommendationService';
import { interactionTracker } from '../services/interactionTrackingService';
import { UserProfile } from '../types';

// Mock localStorage for Node test runner environment
if (typeof window === 'undefined' || !globalThis.localStorage) {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    key: (idx: number) => Object.keys(store)[idx] || null,
    length: Object.keys(store).length,
  };
}

const restaurantsMap = Object.fromEntries(INITIAL_RESTAURANTS.map((r) => [r.id, r]));

console.log('----------------------------------------------------');
console.log('CRAVEDROP RECOMMENDATION ENGINE VERIFICATION SUITE');
console.log('----------------------------------------------------');

let allPassed = true;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
  } else {
    console.error(`❌ [FAIL] ${testName}${detail ? ': ' + detail : ''}`);
    allPassed = false;
  }
}

// -----------------------------------------------------------------
// TEST A: Karachi user interested in Burgers & BBQ
// -----------------------------------------------------------------
console.log('\n--- Running Test A: Karachi User (Interests: Burgers, BBQ) ---');

const karachiUser: UserProfile = {
  id: 'user-karachi-test-1',
  email: 'karachi.test@cravedrop.pk',
  name: 'Ahmed Khan',
  username: 'ahmed_khi',
  avatar_url: '',
  role: 'customer',
  city: 'Karachi',
  city_id: 'karachi',
  onboarding_completed: true,
  interests: ['Burgers', 'BBQ'],
  taste_preferences: ['Burgers', 'BBQ'],
  saved_post_ids: [],
  created_at: new Date().toISOString(),
};

const karachiFeed = rankFoodPostsStrict(INITIAL_POSTS, restaurantsMap, karachiUser);

assert(karachiFeed.length > 0, 'Karachi feed returns drops');

// Check STRICT city partitioning: Zero Lahore, Rawalpindi, Islamabad or Peshawar posts
const nonKarachiPosts = karachiFeed.filter((p) => {
  const city = (p.city || restaurantsMap[p.restaurant_id]?.city || '').toLowerCase();
  return city !== 'karachi';
});
assert(
  nonKarachiPosts.length === 0,
  'Strict City Partitioning: Zero non-Karachi posts in Karachi Home Feed',
  `Found non-Karachi posts: ${nonKarachiPosts.map((p) => p.restaurant_name + ' (' + p.city + ')').join(', ')}`
);

// Check that top posts match user interests (Burgers or BBQ)
const topKarachiPost = karachiFeed[0];
const isTopPostMatchingInterests =
  topKarachiPost.category?.toLowerCase() === 'burgers' ||
  topKarachiPost.category?.toLowerCase() === 'bbq' ||
  topKarachiPost.tags.some((t) => t.toLowerCase().includes('burger') || t.toLowerCase().includes('bbq'));

assert(
  isTopPostMatchingInterests,
  `Top Karachi post (${topKarachiPost.product_name} - ${topKarachiPost.category}) matches onboarding interests`
);

// -----------------------------------------------------------------
// TEST B: Lahore user interested in Biryani
// -----------------------------------------------------------------
console.log('\n--- Running Test B: Lahore User (Interest: Biryani) ---');

const lahoreUser: UserProfile = {
  id: 'user-lahore-test-2',
  email: 'lahore.test@cravedrop.pk',
  name: 'Bilal Tariq',
  username: 'bilal_lhe',
  avatar_url: '',
  role: 'customer',
  city: 'Lahore',
  city_id: 'lahore',
  onboarding_completed: true,
  interests: ['Biryani', 'Desi Food'],
  taste_preferences: ['Biryani', 'Desi Food'],
  saved_post_ids: [],
  created_at: new Date().toISOString(),
};

const lahoreFeed = rankFoodPostsStrict(INITIAL_POSTS, restaurantsMap, lahoreUser);

assert(lahoreFeed.length > 0, 'Lahore feed returns drops');

// Check STRICT city partitioning: Zero Karachi, Rawalpindi, Islamabad or Peshawar posts
const nonLahorePosts = lahoreFeed.filter((p) => {
  const city = (p.city || restaurantsMap[p.restaurant_id]?.city || '').toLowerCase();
  return city !== 'lahore';
});
assert(
  nonLahorePosts.length === 0,
  'Strict City Partitioning: Zero non-Lahore posts in Lahore Home Feed',
  `Found non-Lahore posts: ${nonLahorePosts.map((p) => p.restaurant_name + ' (' + p.city + ')').join(', ')}`
);

// Check that top post is Butt Karahi & Dum (Lakshmi Chowk Biryani)
const topLahorePost = lahoreFeed[0];
assert(
  topLahorePost.restaurant_name.includes('Butt Karahi') ||
    topLahorePost.product_name.toLowerCase().includes('biryani') ||
    topLahorePost.category?.toLowerCase() === 'desi',
  `Top Lahore post (${topLahorePost.product_name}) prioritizes Biryani / Desi Food`
);

// -----------------------------------------------------------------
// TEST C: Cold-Start Karachi user & City with zero drops
// -----------------------------------------------------------------
console.log('\n--- Running Test C: Cold-Start & Zero-Drops Empty State ---');

const coldStartUser: UserProfile = {
  id: 'user-cold-start-3',
  email: 'coldstart@cravedrop.pk',
  name: 'Sara Farooq',
  username: 'sara_cold',
  avatar_url: '',
  role: 'customer',
  city: 'Karachi',
  city_id: 'karachi',
  onboarding_completed: true,
  interests: ['Pizza'],
  saved_post_ids: [],
  created_at: new Date().toISOString(),
};

const coldStartFeed = rankFoodPostsStrict(INITIAL_POSTS, restaurantsMap, coldStartUser);
assert(
  coldStartFeed.every((p) => (p.city || '').toLowerCase() === 'karachi'),
  'Cold-start user receives only valid Karachi drops'
);

// User in Quetta (no drops exist yet): must return [] and NOT fallback to Lahore
const quettaUser: UserProfile = {
  id: 'user-quetta-4',
  email: 'quetta.user@cravedrop.pk',
  name: 'Zahid Khan',
  username: 'zahid_qta',
  avatar_url: '',
  role: 'customer',
  city: 'Quetta',
  city_id: 'quetta',
  onboarding_completed: true,
  interests: ['BBQ'],
  saved_post_ids: [],
  created_at: new Date().toISOString(),
};

const quettaFeed = rankFoodPostsStrict(INITIAL_POSTS, restaurantsMap, quettaUser);
assert(
  quettaFeed.length === 0,
  'City with zero drops returns empty array [] without silent fallback to another city'
);

// -----------------------------------------------------------------
// TEST D: Real-Time Preference Adaptation
// -----------------------------------------------------------------
console.log('\n--- Running Test D: Real-Time Behavioral Adaptation ---');

// Fresh user with no initial preference
const adaptiveUser: UserProfile = {
  id: 'user-adaptive-5',
  email: 'adaptive@cravedrop.pk',
  name: 'Hamza Ali',
  username: 'hamza_adapt',
  avatar_url: '',
  role: 'customer',
  city: 'Karachi',
  city_id: 'karachi',
  onboarding_completed: true,
  interests: [], // No onboarding preference
  saved_post_ids: [],
  created_at: new Date().toISOString(),
};

// Initial rank before any behavior
const initialRank = rankFoodPostsStrict(INITIAL_POSTS, restaurantsMap, adaptiveUser);

// Simulate user heavily watching and liking BBQ video (post-7)
interactionTracker.trackComplete(adaptiveUser.id, 'post-7', 'BBQ', 'karachi');
interactionTracker.trackRewatch(adaptiveUser.id, 'post-7', 'BBQ', 'karachi');
interactionTracker.trackLike(adaptiveUser.id, 'post-7', 'BBQ', 'karachi');
interactionTracker.trackSave(adaptiveUser.id, 'post-7', 'BBQ', 'karachi');

// Check user affinities immediately updated
const affinities = interactionTracker.getUserCategoryAffinities(adaptiveUser.id);
assert(
  (affinities['bbq'] || 0) > 50,
  `User category affinity for BBQ updated dynamically: ${affinities['bbq']} pts`
);

// Next ranking call without reload:
const adaptedRank = rankFoodPostsStrict(INITIAL_POSTS, restaurantsMap, adaptiveUser);
assert(
  adaptedRank[0].id === 'post-7',
  `BBQ drop (post-7) immediately elevated to #1 recommendation due to real-time interactions`
);

// -----------------------------------------------------------------
// TEST E: Negative Signals (Quick Skip & "Not Interested")
// -----------------------------------------------------------------
console.log('\n--- Running Test E: Negative Signals Suppression ---');

// 1. Quick Skip penalty test
interactionTracker.trackSkip(adaptiveUser.id, 'post-8', 1200, 'Burgers', 'karachi');
const skippedIds = interactionTracker.getSkippedPostIds(adaptiveUser.id);
assert(skippedIds.has('post-8'), 'Skipped post recorded in user interaction profile');

// 2. Explicit "Not Interested" dismissal test
interactionTracker.trackNotInterested(adaptiveUser.id, 'post-3', 'Desi', 'karachi');
const notInterestedIds = interactionTracker.getNotInterestedPostIds(adaptiveUser.id);
assert(notInterestedIds.has('post-3'), 'Not interested post recorded in user interaction profile');

const feedAfterNegativeSignals = rankFoodPostsStrict(INITIAL_POSTS, restaurantsMap, adaptiveUser);
assert(
  !feedAfterNegativeSignals.some((p) => p.id === 'post-3'),
  'Post marked "Not interested" (post-3) is completely excluded from the user feed'
);

console.log('\n----------------------------------------------------');
if (allPassed) {
  console.log('🎉 ALL 5 RECOMMENDATION ENGINE TESTS PASSED SUCCESSFULLY!');
} else {
  console.error('❌ SOME TESTS FAILED. PLEASE REVIEW LOGS.');
}
console.log('----------------------------------------------------');
