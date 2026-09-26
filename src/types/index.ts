// Complete Data Model & Types for CraveDrop Platform

export type UserRole = 'customer' | 'restaurant' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  username: string;
  avatar_url: string;
  role: UserRole;
  phone?: string;
  location?: {
    address: string;
    city: string;
    lat: number;
    lng: number;
  };
  restaurant_id?: string; // If role is restaurant
  saved_post_ids: string[];
  created_at: string;
}

export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  logo_url: string;
  cover_url: string;
  bio: string;
  category: string;
  cuisine: string[];
  address: string;
  city: string;
  lat: number;
  lng: number;
  delivery_time_min: number; // e.g., 25-35 mins
  delivery_time_max: number;
  delivery_fee: number;
  min_order: number;
  rating: number;
  review_count: number;
  followers_count: number;
  is_verified: boolean;
  is_featured: boolean;
  is_approved: boolean;
  is_open: boolean;
  opening_hours: string; // e.g. "11:00 AM - 11:30 PM"
  created_at: string;
}

export interface Product {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  price: number;
  discount_price?: number;
  category: string;
  image_url: string;
  is_available: boolean;
  prep_time_mins: number;
  is_active: boolean;
  created_at: string;
}

export type ExpiryDurationOption = '1h' | '3h' | '6h' | '12h' | '24h' | 'custom';

export interface FoodPost {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_logo: string;
  restaurant_verified: boolean;
  product_id: string;
  product_name: string;
  product_price: number;
  product_discount_price?: number;
  caption: string;
  media_url: string;
  media_type: 'video' | 'image';
  thumbnail_url: string;
  duration_seconds?: number;
  created_at: string;
  expires_at: string; // ISO 8601 string
  likes_count: number;
  comments_count: number;
  shares_count: number;
  saves_count: number;
  views_count: number;
  orders_count: number;
  is_expired?: boolean;
  is_hidden?: boolean;
  tags: string[];
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  content: string;
  created_at: string;
  is_reported?: boolean;
}

export interface PostLike {
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface RestaurantFollow {
  restaurant_id: string;
  user_id: string;
  created_at: string;
}

export interface CartItem {
  product: Product;
  restaurant: Restaurant;
  quantity: number;
  special_instructions?: string;
}

export interface Cart {
  restaurant_id: string | null;
  restaurant_name: string | null;
  items: CartItem[];
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
}

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'rejected'
  | 'cancelled';

export interface OrderStatusHistoryItem {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface Order {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  restaurant_id: string;
  restaurant_name: string;
  items: {
    product_id: string;
    product_name: string;
    price: number;
    quantity: number;
    image_url?: string;
  }[];
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  payment_method: 'cash_on_delivery';
  status: OrderStatus;
  notes?: string;
  associated_post_id?: string;
  created_at: string;
  updated_at: string;
  status_history: OrderStatusHistoryItem[];
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'order' | 'follow' | 'like' | 'comment' | 'drop' | 'system';
  read: boolean;
  created_at: string;
  action_url?: string;
  data?: any;
}

export type ReportType = 'post' | 'restaurant' | 'comment' | 'user';
export type ReportReason =
  | 'spam'
  | 'fake_information'
  | 'inappropriate_content'
  | 'fraud_scam'
  | 'copyright'
  | 'offensive'
  | 'other';

export interface Report {
  id: string;
  reporter_id: string;
  reporter_name: string;
  reported_type: ReportType;
  reported_id: string;
  reason: ReportReason;
  details?: string;
  status: 'pending' | 'reviewed' | 'action_taken' | 'dismissed';
  action_taken?: string;
  created_at: string;
}

export interface RestaurantAnalytics {
  views_today: number;
  views_change_pct: number;
  orders_today: number;
  orders_change_pct: number;
  revenue_today: number;
  revenue_change_pct: number;
  conversion_rate: number;
  followers_count: number;
  popular_posts: {
    post_id: string;
    product_name: string;
    views: number;
    likes: number;
    orders: number;
    conversion: number;
    thumbnail: string;
  }[];
  popular_products: {
    product_id: string;
    name: string;
    orders_count: number;
    revenue: number;
  }[];
}
