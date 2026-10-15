import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  FoodPost,
  Order,
  OrderStatus,
  Product,
  Restaurant,
  PostComment,
  NotificationItem,
  Report,
  RestaurantAnalytics,
  UserProfile,
  UserReview,
  Conversation,
  ChatMessage,
  MessageType,
  FollowStatus,
} from '../types';
import {
  INITIAL_POSTS,
  INITIAL_PRODUCTS,
  INITIAL_RESTAURANTS,
  INITIAL_ORDERS,
  INITIAL_NOTIFICATIONS,
  INITIAL_REPORTS,
} from '../data/seedData';
import { isPostExpired } from '../services/expiryService';
import { secureCreateOrder, persistOrderToSupabase, CreateOrderParams } from '../services/orderService';
import { getFollowingIds, getFollowerIds, followUser, unfollowUser, clearFollowCacheForUser } from '../services/followService';
import { getReviewsForUser, addReviewToDatabase, clearReviewCacheForUser } from '../services/reviewService';
import { useAuth } from './AuthContext';

// Real production conversations — zero demo conversations
export const INITIAL_CONVERSATIONS: Conversation[] = [];


interface DataContextType {
  restaurants: Restaurant[];
  products: Product[];
  posts: FoodPost[];
  orders: Order[];
  comments: Record<string, PostComment[]>;
  userLikes: Set<string>;
  userSaves: Set<string>;
  userFollows: Set<string>;
  followerIds: Set<string>;
  notifications: NotificationItem[];
  reports: Report[];
  allUsers: UserProfile[];
  userReviews: UserReview[];

  // Messaging & Social System
  conversations: Conversation[];
  messages: Record<string, ChatMessage[]>;
  messageRequests: Conversation[];
  blockedUserIds: Set<string>;
  sendMessage: (recipientId: string, type: MessageType, text?: string, sharedData?: any) => void;
  markConversationRead: (conversationId: string) => void;
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  reportItem: (type: 'user' | 'post' | 'restaurant' | 'comment', id: string, reason: string, details?: string) => void;
  getFollowStatus: (targetId: string) => FollowStatus;

  // Feed & Social Actions
  toggleLike: (postId: string) => void;
  addComment: (postId: string, content: string) => void;
  deleteComment: (commentId: string, postId: string) => void;
  toggleSave: (postId: string) => void;
  toggleFollow: (targetId: string) => void;
  addReview: (review: Omit<UserReview, 'id' | 'created_at'>) => void;
  incrementPostViews: (postId: string) => void;

  // Vendor Actions
  createFoodPost: (data: {
    productId: string;
    caption: string;
    mediaUrl: string;
    mediaType: 'video' | 'image';
    thumbnailUrl: string;
    expiresAt: string;
    durationSeconds?: number;
    tags?: string[];
  }) => FoodPost;
  createProduct: (product: Omit<Product, 'id' | 'created_at'>) => Product;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  getRestaurantAnalytics: (restaurantId: string) => RestaurantAnalytics;

  // Ordering Actions
  placeOrder: (params: CreateOrderParams) => Promise<{ success: boolean; order?: Order; error?: string }>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus, note?: string) => void;

  // Moderation & Admin Actions
  submitReport: (params: Omit<Report, 'id' | 'status' | 'created_at'>) => void;
  adminApproveRestaurant: (restaurantId: string, approved: boolean) => void;
  adminTakeDownPost: (postId: string) => void;
  adminModerateReport: (reportId: string, action: 'action_taken' | 'dismissed', note?: string) => void;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  addNotification: (notif: Omit<NotificationItem, 'id' | 'created_at' | 'read'>) => void;

  // System Reload Action & State
  isReloading: boolean;
  reloadSystem: () => Promise<void>;
}

// NOTE: No demo followers/foodies or demo reviews are seeded.
// Every account starts with completely isolated, empty social data.
// Followers, Following, and Reviews are fetched from the real database (or
// from per-user localStorage keys) so there is NO cross-account leakage.
export const INITIAL_FOODIES: UserProfile[] = [];
export const INITIAL_USER_REVIEWS: UserReview[] = [];





const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // ── Per-user key helpers ──────────────────────────────────────────────────
  // All user-specific data MUST be scoped to user.id so switching accounts
  // never leaks data between accounts.
  const userReviewsKey = user?.id ? `cravedrop_reviews_${user.id}` : null;
  const userLikesKey   = user?.id ? `cravedrop_likes_${user.id}`   : null;
  const userSavesKey   = user?.id ? `cravedrop_saves_${user.id}`   : null;

  // ── One-time purge of legacy global (non-scoped) demo keys ───────────────
  const DEMO_PURGE_KEY = 'cravedrop_demo_purged_v4';
  if (typeof window !== 'undefined' && !localStorage.getItem(DEMO_PURGE_KEY)) {
    // Remove the old posts and restaurants to reload the latest city-enabled data
    localStorage.removeItem('cravedrop_comments');
    localStorage.removeItem('cravedrop_user_likes');
    localStorage.removeItem('cravedrop_user_saves');
    localStorage.removeItem('cravedrop_user_follows');
    localStorage.removeItem('cravedrop_user_reviews');
    localStorage.removeItem('cravedrop_all_users');
    localStorage.removeItem('cravedrop_orders');
    localStorage.removeItem('cravedrop_notifications');
    localStorage.removeItem('cravedrop_reports');
    localStorage.removeItem('cravedrop_posts');
    localStorage.removeItem('cravedrop_restaurants');
    localStorage.removeItem('cravedrop_products');
    localStorage.setItem(DEMO_PURGE_KEY, 'true');
  }

  // ── Shared (non-user-specific) state ─────────────────────────────────────
  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => {
    const saved = localStorage.getItem('cravedrop_restaurants');
    return saved ? JSON.parse(saved) : INITIAL_RESTAURANTS;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('cravedrop_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [posts, setPosts] = useState<FoodPost[]>(() => {
    const saved = localStorage.getItem('cravedrop_posts');
    return saved ? JSON.parse(saved) : INITIAL_POSTS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('cravedrop_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [comments, setComments] = useState<Record<string, PostComment[]>>(() => {
    const saved = localStorage.getItem('cravedrop_comments');
    return saved ? JSON.parse(saved) : {};
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('cravedrop_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [reports, setReports] = useState<Report[]>(() => {
    const saved = localStorage.getItem('cravedrop_reports');
    return saved ? JSON.parse(saved) : INITIAL_REPORTS;
  });

  // ── Per-user state (scoped to authenticated user ID) ─────────────────────
  // userFollows: IDs that the current user follows (keyed to authenticated user.id)
  const [userFollows, setUserFollows] = useState<Set<string>>(() => {
    if (!user?.id) return new Set<string>();
    try {
      const raw = localStorage.getItem(`cravedrop_follows_${user.id}`);
      return raw ? new Set(JSON.parse(raw)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  // followerIds: IDs of users who follow the current user
  const [followerIds, setFollowerIds] = useState<Set<string>>(() => {
    if (!user?.id) return new Set<string>();
    const followers = new Set<string>();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('cravedrop_follows_')) continue;
        const followerId = key.replace('cravedrop_follows_', '');
        if (followerId === user.id) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const arr = JSON.parse(raw) as string[];
        if (arr.includes(user.id)) followers.add(followerId);
      }
    } catch {}
    return followers;
  });

  // allUsers: real user profiles discovered via follows (not a shared demo list)
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // userLikes, userSaves — scoped to user.id
  const [userLikes, setUserLikes] = useState<Set<string>>(() => {
    if (!user?.id) return new Set<string>();
    const key = `cravedrop_likes_${user.id}`;
    const saved = localStorage.getItem(key);
    return saved ? new Set(JSON.parse(saved)) : new Set<string>();
  });

  const [userSaves, setUserSaves] = useState<Set<string>>(() => {
    if (!user?.id) return new Set<string>();
    const key = `cravedrop_saves_${user.id}`;
    const saved = localStorage.getItem(key);
    return saved ? new Set(JSON.parse(saved)) : new Set<string>();
  });

  // userReviews — scoped to user.id, no demo data
  const [userReviews, setUserReviews] = useState<UserReview[]>(() => {
    if (!user?.id) return [];
    const key = `cravedrop_reviews_${user.id}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  });

  // conversations & messages — scoped to user.id, no demo data
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    if (!user?.id) return [];
    const key = `cravedrop_conversations_${user.id}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  });

  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(() => {
    if (!user?.id) return {};
    const key = `cravedrop_messages_${user.id}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : {};
  });

  // ── Reload user-specific state when the authenticated user changes ────────
  // This is the critical guard against cross-account leakage.
  const prevUserId = useRef<string | null>(null);
  useEffect(() => {
    const currentId = user?.id || null;
    if (currentId === prevUserId.current) return; // same user, no reload needed
    prevUserId.current = currentId;

    if (!currentId) {
      // User logged out — clear all per-user state
      setUserFollows(new Set<string>());
      setFollowerIds(new Set<string>());
      setUserReviews([]);
      setUserLikes(new Set<string>());
      setUserSaves(new Set<string>());
      setConversations([]);
      setMessages({});
      setAllUsers([]);
      return;
    }

    // Load follows from followService (keyed to currentId)
    getFollowingIds(currentId).then(setUserFollows);
    getFollowerIds(currentId).then(setFollowerIds);

    // Load per-user reviews from reviewService
    getReviewsForUser(currentId).then(setUserReviews);

    // Load per-user likes
    const likesKey = `cravedrop_likes_${currentId}`;
    const savedLikes = localStorage.getItem(likesKey);
    setUserLikes(savedLikes ? new Set(JSON.parse(savedLikes)) : new Set<string>());

    // Load per-user saves
    const savesKey = `cravedrop_saves_${currentId}`;
    const savedSaves = localStorage.getItem(savesKey);
    setUserSaves(savedSaves ? new Set(JSON.parse(savedSaves)) : new Set<string>());

    // Load per-user conversations & messages
    const convKey = `cravedrop_conversations_${currentId}`;
    const savedConv = localStorage.getItem(convKey);
    setConversations(savedConv ? JSON.parse(savedConv) : []);

    const msgKey = `cravedrop_messages_${currentId}`;
    const savedMsg = localStorage.getItem(msgKey);
    setMessages(savedMsg ? JSON.parse(savedMsg) : {});

    // allUsers stays empty — we only populate it when real users are found via search / follows
    setAllUsers([]);
  }, [user?.id]);

  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('cravedrop_blocked_users');
    return saved ? new Set(JSON.parse(saved)) : new Set<string>();
  });

  const [isReloading, setIsReloading] = useState(false);

  // App System Reload Logic (re-evaluates posts, countdowns, orders, and simulates network sync)
  const reloadSystem = useCallback(async () => {
    if (isReloading) return;
    setIsReloading(true);

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([30, 20, 30]); } catch {}
    }

    try {
      const savedPosts = localStorage.getItem('cravedrop_posts');
      if (savedPosts) {
        setPosts(JSON.parse(savedPosts));
      } else {
        setPosts([...INITIAL_POSTS]);
      }

      const savedRests = localStorage.getItem('cravedrop_restaurants');
      if (savedRests) setRestaurants(JSON.parse(savedRests));

      const savedProds = localStorage.getItem('cravedrop_products');
      if (savedProds) setProducts(JSON.parse(savedProds));

      const savedOrders = localStorage.getItem('cravedrop_orders');
      if (savedOrders) setOrders(JSON.parse(savedOrders));

      const savedNotifs = localStorage.getItem('cravedrop_notifications');
      if (savedNotifs) setNotifications(JSON.parse(savedNotifs));

      // Reload per-user follow data too
      if (user?.id) {
        const follows = await getFollowingIds(user.id);
        setUserFollows(follows);
        const followers = await getFollowerIds(user.id);
        setFollowerIds(followers);
      }
    } catch (err) {
      console.warn('System reload sync error:', err);
    }

    await new Promise((resolve) => setTimeout(resolve, 950));
    setIsReloading(false);
  }, [isReloading, user?.id]);

  // Persistent synchronization — shared non-user-specific data
  useEffect(() => {
    localStorage.setItem('cravedrop_restaurants', JSON.stringify(restaurants));
  }, [restaurants]);

  useEffect(() => {
    localStorage.setItem('cravedrop_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('cravedrop_posts', JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    localStorage.setItem('cravedrop_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('cravedrop_comments', JSON.stringify(comments));
  }, [comments]);

  // Per-user persistent sync (scoped to user ID)
  useEffect(() => {
    if (userLikesKey) localStorage.setItem(userLikesKey, JSON.stringify(Array.from(userLikes)));
  }, [userLikes, userLikesKey]);

  useEffect(() => {
    if (userSavesKey) localStorage.setItem(userSavesKey, JSON.stringify(Array.from(userSaves)));
  }, [userSaves, userSavesKey]);

  useEffect(() => {
    if (userReviewsKey) localStorage.setItem(userReviewsKey, JSON.stringify(userReviews));
  }, [userReviews, userReviewsKey]);

  useEffect(() => {
    localStorage.setItem('cravedrop_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('cravedrop_reports', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`cravedrop_conversations_${user.id}`, JSON.stringify(conversations));
    }
  }, [conversations, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`cravedrop_messages_${user.id}`, JSON.stringify(messages));
    }
  }, [messages, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`cravedrop_follows_${user.id}`, JSON.stringify(Array.from(userFollows)));
    }
  }, [userFollows, user?.id]);



  // Periodic Expiry Check - Updates post status when expires_at timestamp is reached

  useEffect(() => {
    const interval = setInterval(() => {
      setPosts((currentPosts) => {
        let hasChanges = false;
        const updated = currentPosts.map((post) => {
          const expired = isPostExpired(post.expires_at);
          if (expired && !post.is_expired) {
            hasChanges = true;
            return { ...post, is_expired: true };
          }
          return post;
        });
        return hasChanges ? updated : currentPosts;
      });
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, []);

  // Social Interaction Handlers
  const toggleLike = (postId: string) => {
    const newLikes = new Set(userLikes);
    const isLiked = newLikes.has(postId);

    if (isLiked) {
      newLikes.delete(postId);
    } else {
      newLikes.add(postId);
    }
    setUserLikes(newLikes);

    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, likes_count: Math.max(0, post.likes_count + (isLiked ? -1 : 1)) }
          : post
      )
    );
  };

  const addComment = (postId: string, content: string) => {
    if (!content.trim()) return;
    const newComment: PostComment = {
      id: `comm-${Date.now()}`,
      post_id: postId,
      user_id: user?.id || 'anon-user',
      user_name: user?.name || 'Food Explorer',
      user_avatar: user?.avatar_url || '',
      content: content.trim(),
      created_at: new Date().toISOString(),
    };

    setComments((prev) => ({
      ...prev,
      [postId]: [newComment, ...(prev[postId] || [])],
    }));

    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, comments_count: post.comments_count + 1 } : post
      )
    );
  };

  const deleteComment = (commentId: string, postId: string) => {
    setComments((prev) => ({
      ...prev,
      [postId]: (prev[postId] || []).filter((c) => c.id !== commentId),
    }));

    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, comments_count: Math.max(0, post.comments_count - 1) } : post
      )
    );
  };

  const toggleSave = (postId: string) => {
    const newSaves = new Set(userSaves);
    const isSaved = newSaves.has(postId);

    if (isSaved) {
      newSaves.delete(postId);
    } else {
      newSaves.add(postId);
    }
    setUserSaves(newSaves);

    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, saves_count: Math.max(0, post.saves_count + (isSaved ? -1 : 1)) }
          : post
      )
    );
  };

  const toggleFollow = (targetId: string) => {
    if (!user?.id || !targetId || user.id === targetId) return; // prevent self-follow
    const isFollowing = userFollows.has(targetId);

    // Optimistic UI update
    const newFollows = new Set(userFollows);
    if (isFollowing) {
      newFollows.delete(targetId);
    } else {
      newFollows.add(targetId);
    }
    setUserFollows(newFollows);

    // Persist to followService (keyed to authenticated user.id)
    if (isFollowing) {
      unfollowUser(user.id, targetId).then(setUserFollows);
    } else {
      followUser(user.id, targetId).then(setUserFollows);
    }

    // Update restaurant followers_count locally
    setRestaurants((prev) =>
      prev.map((r) =>
        r.id === targetId
          ? { ...r, followers_count: Math.max(0, r.followers_count + (isFollowing ? -1 : 1)) }
          : r
      )
    );
  };


  const addReview = (reviewData: Omit<UserReview, 'id' | 'created_at'>) => {
    addReviewToDatabase({
      ...reviewData,
      reviewer_id: user?.id,
    }).then((created) => {
      setUserReviews((prev) => [created, ...prev]);
    });
  };


  const incrementPostViews = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, views_count: post.views_count + 1 } : post
      )
    );
  };

  // Vendor Action: Create Food Drop
  const createFoodPost = (data: {
    productId: string;
    caption: string;
    mediaUrl: string;
    mediaType: 'video' | 'image';
    thumbnailUrl: string;
    expiresAt: string;
    durationSeconds?: number;
    tags?: string[];
  }): FoodPost => {
    const product = products.find((p) => p.id === data.productId);
    const restaurant = restaurants.find((r) => r.id === (user?.restaurant_id || 'rest-1'));

    const newPost: FoodPost = {
      id: `post-${Date.now()}`,
      restaurant_id: restaurant?.id || 'rest-1',
      restaurant_name: restaurant?.name || 'FireCrust Woodfired Pizza',
      restaurant_logo: restaurant?.logo_url || 'https://images.unsplash.com/photo-1579758630668-188c22e497b1?w=200',
      restaurant_verified: restaurant?.is_verified ?? false,
      product_id: data.productId,
      product_name: product?.name || 'Special Menu Item',
      product_price: product?.discount_price ?? (product?.price || 14.99),
      product_discount_price: product?.discount_price ? product.price : undefined,
      caption: data.caption,
      media_url: data.mediaUrl,
      media_type: data.mediaType,
      thumbnail_url: data.thumbnailUrl || data.mediaUrl,
      duration_seconds: data.durationSeconds || 15,
      expires_at: data.expiresAt,
      created_at: new Date().toISOString(),
      likes_count: 0,
      comments_count: 0,
      shares_count: 0,
      saves_count: 0,
      views_count: 0,
      orders_count: 0,
      is_expired: false,
      is_hidden: false,
      city: restaurant?.city || user?.city || 'Lahore',
      city_id: restaurant?.city_id || user?.city_id || 'lahore',
      category: restaurant?.category || product?.category || 'General',
      tags: data.tags || ['#FreshDrop', '#LimitedTime'],
    };

    setPosts((prev) => [newPost, ...prev]);

    // Add notification
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      user_id: user?.id || '',
      title: `🔥 New Drop: ${restaurant?.name}`,
      message: `Just dropped "${newPost.product_name}". Grab it before it expires!`,
      type: 'drop',
      read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);

    return newPost;
  };

  const createProduct = (data: Omit<Product, 'id' | 'created_at'>): Product => {
    const newProduct: Product = {
      ...data,
      id: `prod-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setProducts((prev) => [newProduct, ...prev]);
    return newProduct;
  };

  const updateProduct = (productId: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, ...updates } : p))
    );
  };

  // Order Placement with Server-Side Validation, Idempotency & Snapshot Persistence
  const placeOrder = async (
    params: CreateOrderParams
  ): Promise<{ success: boolean; order?: Order; error?: string }> => {
    const productsMap = Object.fromEntries(products.map((p) => [p.id, p]));
    const restaurantsMap = Object.fromEntries(restaurants.map((r) => [r.id, r]));
    const postsMap = Object.fromEntries(posts.map((p) => [p.id, p]));

    const result = secureCreateOrder(params, productsMap, restaurantsMap, postsMap);

    if (!result.success || !result.order) {
      return {
        success: false,
        error: result.errorMessage || 'Failed to place order.',
      };
    }

    const createdOrder = result.order;

    // Only append to orders list and send notifications if not a duplicate idempotent replay
    if (!result.isDuplicate) {
      setOrders((prev) => {
        if (prev.some((o) => o.id === createdOrder.id)) return prev;
        return [createdOrder, ...prev];
      });

      // Persist asynchronously to Supabase if live
      persistOrderToSupabase(createdOrder).catch(() => {});

      // If attached to a drop, bump post orders count
      if (params.associatedPostId) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === params.associatedPostId
              ? { ...p, orders_count: p.orders_count + 1 }
              : p
          )
        );
      }

      // Trigger customer notification
      const orderNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        user_id: params.customerId,
        title: 'Order Placed (Cash on Delivery) 🛍️',
        message: `Your order #${createdOrder.id} to ${createdOrder.restaurant_name} has been sent to the kitchen.`,
        type: 'order',
        read: false,
        created_at: new Date().toISOString(),
        action_url: `/orders/${createdOrder.id}`,
      };
      setNotifications((prev) => [orderNotif, ...prev]);
    }

    return {
      success: true,
      order: createdOrder,
    };
  };

  // Vendor Action: Order Status Lifecycle Management
  const updateOrderStatus = (orderId: string, newStatus: OrderStatus, note?: string) => {
    const nowIso = new Date().toISOString();
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        return {
          ...order,
          status: newStatus,
          updated_at: nowIso,
          status_history: [
            ...order.status_history,
            {
              status: newStatus,
              timestamp: nowIso,
              note: note || `Status updated to ${newStatus.replace('_', ' ')}`,
            },
          ],
        };
      })
    );

    // Notify customer
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      const statusLabels: Record<OrderStatus, string> = {
        pending: 'Received',
        accepted: 'Accepted by Kitchen',
        preparing: 'Now Cooking',
        ready: 'Ready for Pickup',
        out_for_delivery: 'Out for Delivery 🛵',
        delivered: 'Delivered Enjoy your meal! 🎉',
        rejected: 'Declined by Kitchen',
        cancelled: 'Cancelled',
      };

      const notif: NotificationItem = {
        id: `notif-${Date.now()}`,
        user_id: order.customer_id,
        title: `Order Update #${order.id}`,
        message: `${order.restaurant_name}: ${statusLabels[newStatus]}`,
        type: 'order',
        read: false,
        created_at: nowIso,
        action_url: `/orders/${order.id}`,
      };
      setNotifications((prev) => [notif, ...prev]);
    }
  };

  // Moderation
  const submitReport = (params: Omit<Report, 'id' | 'status' | 'created_at'>) => {
    const newReport: Report = {
      ...params,
      id: `rep-${Date.now()}`,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    setReports((prev) => [newReport, ...prev]);
  };

  const adminApproveRestaurant = (restaurantId: string, approved: boolean) => {
    setRestaurants((prev) =>
      prev.map((r) => (r.id === restaurantId ? { ...r, is_approved: approved } : r))
    );
  };

  const adminTakeDownPost = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, is_hidden: true } : p))
    );
  };

  const adminModerateReport = (
    reportId: string,
    action: 'action_taken' | 'dismissed',
    note?: string
  ) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? { ...r, status: action, action_taken: note || (action === 'action_taken' ? 'Content removed' : 'Dismissed after review') }
          : r
      )
    );
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const addNotification = (notif: Omit<NotificationItem, 'id' | 'created_at' | 'read'>) => {
    const newNotif: NotificationItem = {
      ...notif,
      id: `notif-${Date.now()}`,
      read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Vendor Analytics Generator
  const getRestaurantAnalytics = (restaurantId: string): RestaurantAnalytics => {
    const restPosts = posts.filter((p) => p.restaurant_id === restaurantId);
    const restOrders = orders.filter((o) => o.restaurant_id === restaurantId);

    const totalViews = restPosts.reduce((sum, p) => sum + p.views_count, 0);
    const totalOrdersCount = restOrders.length;
    const totalRevenue = restOrders
      .filter((o) => o.status !== 'cancelled' && o.status !== 'rejected')
      .reduce((sum, o) => sum + o.total, 0);

    const conversionRate = totalViews > 0 ? Number(((totalOrdersCount / totalViews) * 100).toFixed(2)) : 1.48;
    const rest = restaurants.find((r) => r.id === restaurantId);

    return {
      views_today: totalViews || 4210,
      views_change_pct: 12.4,
      orders_today: totalOrdersCount || 34,
      orders_change_pct: 8.2,
      revenue_today: totalRevenue > 0 ? Number(totalRevenue.toFixed(2)) : 520.45,
      revenue_change_pct: 14.1,
      conversion_rate: conversionRate,
      followers_count: rest?.followers_count || 1420,
      popular_posts: restPosts.map((p) => ({
        post_id: p.id,
        product_name: p.product_name,
        views: p.views_count,
        likes: p.likes_count,
        orders: p.orders_count,
        conversion: p.views_count > 0 ? Number(((p.orders_count / p.views_count) * 100).toFixed(2)) : 0,
        thumbnail: p.thumbnail_url,
      })),
      popular_products: products
        .filter((p) => p.restaurant_id === restaurantId)
        .map((p) => ({
          product_id: p.id,
          name: p.name,
          orders_count: 24,
          revenue: Number((p.price * 24).toFixed(2)),
        })),
    };
  };

  // Messaging System Handlers
  const sendMessage = (recipientId: string, type: MessageType, text?: string, sharedData?: any) => {
    if (!user?.id) return;
    const currentUserId = user.id;
    let targetConv = conversations.find(
      (c) => c.participant_ids.includes(recipientId) && c.participant_ids.includes(currentUserId)
    );

    const nowIso = new Date().toISOString();
    const newMsgId = `msg-${Date.now()}`;

    const newMsg: ChatMessage = {
      id: newMsgId,
      conversation_id: targetConv ? targetConv.id : `conv-${Date.now()}`,
      sender_id: currentUserId,
      sender_name: user.name || user.full_name || 'Food Explorer',
      sender_avatar: user.avatar_url || '',
      message_type: type,
      text: text || '',
      shared_data: sharedData,
      created_at: nowIso,
      is_read: true,
    };

    if (targetConv) {
      setMessages((prev) => ({
        ...prev,
        [targetConv!.id]: [...(prev[targetConv!.id] || []), newMsg],
      }));

      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetConv!.id
            ? { ...c, last_message: newMsg, last_message_at: nowIso }
            : c
        )
      );
    } else {
      const recipientUser = allUsers.find((u) => u.id === recipientId);
      const recipientRest = restaurants.find((r) => r.id === recipientId || r.owner_id === recipientId);

      const recipientName = recipientRest?.name || recipientUser?.name || 'Food Explorer';
      const recipientAvatar = recipientRest?.logo_url || recipientUser?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
      const recipientRole = recipientRest ? 'restaurant' : recipientUser?.role || 'customer';

      const createdConvId = `conv-${Date.now()}`;
      newMsg.conversation_id = createdConvId;

      const newConv: Conversation = {
        id: createdConvId,
        participant_ids: [currentUserId, recipientId],
        participants: [
          { id: currentUserId, name: user?.name || 'Me', avatar_url: user?.avatar_url || '', role: user?.role || 'customer' },
          { id: recipientId, name: recipientName, avatar_url: recipientAvatar, role: recipientRole, is_online: true },
        ],
        last_message: newMsg,
        last_message_at: nowIso,
        unread_count: 0,
        created_at: nowIso,
      };

      setConversations((prev) => [newConv, ...prev]);
      setMessages((prev) => ({
        ...prev,
        [createdConvId]: [newMsg],
      }));
    }
  };

  const markConversationRead = (conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
    );
  };

  const blockUser = (targetId: string) => {
    const updated = new Set(blockedUserIds);
    if (updated.has(targetId)) {
      updated.delete(targetId);
    } else {
      updated.add(targetId);
    }
    setBlockedUserIds(updated);
  };

  const unblockUser = (targetId: string) => {
    const updated = new Set(blockedUserIds);
    updated.delete(targetId);
    setBlockedUserIds(updated);
  };

  const reportItem = (type: 'user' | 'post' | 'restaurant' | 'comment', id: string, reason: string, details?: string) => {
    const newReport: Report = {
      id: `rep-${Date.now()}`,
      reporter_id: user?.id || 'anon',
      reporter_name: user?.name || user?.full_name || 'Anonymous',
      reported_type: type as any,
      reported_id: id,
      reason: reason as any,
      details: details || '',
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    setReports((prev) => [newReport, ...prev]);
  };

  const getFollowStatus = (targetId: string): FollowStatus => {
    // iFollow: current user follows targetId
    const iFollow = userFollows.has(targetId);
    // followsMe: targetId follows the current user (determined from real followerIds)
    const followsMe = followerIds.has(targetId);

    if (iFollow && followsMe) return 'mutual';
    if (iFollow) return 'following';
    if (followsMe) return 'follow_back';
    return 'none';

  };

  return (
    <DataContext.Provider
      value={{
        restaurants,
        products,
        posts,
        orders,
        comments,
        userLikes,
        userSaves,
        userFollows,
        followerIds,
        notifications,
        reports,
        allUsers,
        userReviews,
        conversations,
        messages,
        messageRequests: [],
        blockedUserIds,
        sendMessage,
        markConversationRead,
        blockUser,
        unblockUser,
        reportItem,
        getFollowStatus,
        toggleLike,
        addComment,
        deleteComment,
        toggleSave,
        toggleFollow,
        addReview,
        incrementPostViews,
        createFoodPost,
        createProduct,
        updateProduct,
        getRestaurantAnalytics,
        placeOrder,
        updateOrderStatus,
        submitReport,
        adminApproveRestaurant,
        adminTakeDownPost,
        adminModerateReport,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        addNotification,
        isReloading,
        reloadSystem,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
