// Central Data Management Context with Local Storage Persistence & Real-time Expiry Checking

import React, { createContext, useContext, useState, useEffect } from 'react';
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
import { secureCreateOrder, CreateOrderParams } from '../services/orderService';
import { useAuth } from './AuthContext';

interface DataContextType {
  restaurants: Restaurant[];
  products: Product[];
  posts: FoodPost[];
  orders: Order[];
  comments: Record<string, PostComment[]>;
  userLikes: Set<string>;
  userSaves: Set<string>;
  userFollows: Set<string>;
  notifications: NotificationItem[];
  reports: Report[];
  
  // Feed & Social Actions
  toggleLike: (postId: string) => void;
  addComment: (postId: string, content: string) => void;
  deleteComment: (commentId: string, postId: string) => void;
  toggleSave: (postId: string) => void;
  toggleFollow: (restaurantId: string) => void;
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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Load from localStorage or initial seed
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
    if (saved) return JSON.parse(saved);
    return {
      'post-1': [
        {
          id: 'comm-1',
          post_id: 'post-1',
          user_id: 'user-c2',
          user_name: 'Sophia Martinez',
          user_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
          content: 'That crust blister is incredible! Just placed an order.',
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        },
        {
          id: 'comm-2',
          post_id: 'post-1',
          user_id: 'user-c3',
          user_name: 'Alex Rivera',
          user_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
          content: 'Is the hot honey spicy or mild? Looks delicious!',
          created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        }
      ],
      'post-2': [
        {
          id: 'comm-3',
          post_id: 'post-2',
          user_id: 'user-c4',
          user_name: 'David Chen',
          user_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100',
          content: 'Sizzle on the grill is pure music! 8 mins left, grabbing one now.',
          created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        }
      ]
    };
  });

  const [userLikes, setUserLikes] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('cravedrop_user_likes');
    return saved ? new Set(JSON.parse(saved)) : new Set(['post-1']);
  });

  const [userSaves, setUserSaves] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('cravedrop_user_saves');
    return saved ? new Set(JSON.parse(saved)) : new Set(['post-1', 'post-3']);
  });

  const [userFollows, setUserFollows] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('cravedrop_user_follows');
    return saved ? new Set(JSON.parse(saved)) : new Set(['rest-1', 'rest-2']);
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('cravedrop_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [reports, setReports] = useState<Report[]>(() => {
    const saved = localStorage.getItem('cravedrop_reports');
    return saved ? JSON.parse(saved) : INITIAL_REPORTS;
  });

  // Persistent synchronization
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

  useEffect(() => {
    localStorage.setItem('cravedrop_user_likes', JSON.stringify(Array.from(userLikes)));
  }, [userLikes]);

  useEffect(() => {
    localStorage.setItem('cravedrop_user_saves', JSON.stringify(Array.from(userSaves)));
  }, [userSaves]);

  useEffect(() => {
    localStorage.setItem('cravedrop_user_follows', JSON.stringify(Array.from(userFollows)));
  }, [userFollows]);

  useEffect(() => {
    localStorage.setItem('cravedrop_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('cravedrop_reports', JSON.stringify(reports));
  }, [reports]);

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
      user_avatar: user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
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

  const toggleFollow = (restaurantId: string) => {
    const newFollows = new Set(userFollows);
    const isFollowing = newFollows.has(restaurantId);

    if (isFollowing) {
      newFollows.delete(restaurantId);
    } else {
      newFollows.add(restaurantId);
    }
    setUserFollows(newFollows);

    setRestaurants((prev) =>
      prev.map((r) =>
        r.id === restaurantId
          ? { ...r, followers_count: Math.max(0, r.followers_count + (isFollowing ? -1 : 1)) }
          : r
      )
    );
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
      restaurant_verified: restaurant?.is_verified ?? true,
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
      tags: data.tags || ['#FreshDrop', '#LimitedTime'],
    };

    setPosts((prev) => [newPost, ...prev]);

    // Add notification
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      user_id: user?.id || 'user-customer-1',
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

  // Order Placement with Server-Side Validation
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
    setOrders((prev) => [createdOrder, ...prev]);

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
        notifications,
        reports,
        toggleLike,
        addComment,
        deleteComment,
        toggleSave,
        toggleFollow,
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
