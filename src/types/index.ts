// Complete Data Model & Types for CraveDrop Platform

export type UserRole = 'customer' | 'restaurant' | 'admin';

export interface UserAddress {
  id: string;
  user_id?: string;
  label: 'Home' | 'Work' | 'Other' | string;
  recipient_name: string;
  phone_number: string; // Normalized +923XXXXXXXXX
  country_code: string; // '+92'
  city_id: string; // Normalized city slug e.g. 'lahore', 'karachi'
  city_name: string; // City display name e.g. 'Lahore'
  area: string; // Area / Sector / Locality
  house_number: string; // House / Flat / Building Number
  street: string; // Street / Road Number
  block_or_phase?: string; // Block / Phase
  landmark?: string; // Nearby landmark
  delivery_instructions?: string; // Gate code, instructions
  latitude?: number | null;
  longitude?: number | null;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;

  // Backward-compatible aliases
  house_no: string;
  city: string;
  phone?: string;
  delivery_notes?: string;
  lat?: number;
  lng?: number;
}

export interface DeliveryAddressSnapshot {
  address_id?: string;
  label: string;
  recipient_name: string;
  phone_number: string;
  country_code: string;
  house_number: string;
  street: string;
  block_or_phase?: string;
  area: string;
  city_id: string;
  city_name: string;
  landmark?: string;
  delivery_instructions?: string;
  latitude?: number | null;
  longitude?: number | null;
  formatted_address: string;
}

export interface UserReview {
  id: string;
  order_id: string;
  restaurant_id: string;
  restaurant_name: string;
  product_name: string;
  rating: number; // 1-5 stars
  comment: string;
  created_at: string;
  dish_image?: string;
  reviewer_id?: string;
  reviewed_user_id?: string;
}

export interface CityOption {
  id: string;
  name: string;
  province?: string;
  country: string;
  lat: number;
  lng: number;
  is_active?: boolean;
}

export interface UserProfile {
  id: string;
  auth_user_id?: string;
  email: string;
  name: string;
  full_name?: string;
  username: string;
  bio?: string;
  city?: string;
  city_id?: string;
  avatar_url: string;
  role: UserRole;
  phone?: string;
  onboarding_completed: boolean;
  interests?: string[];
  taste_preferences?: string[];
  addresses?: UserAddress[];
  location?: {
    address: string;
    city: string;
    lat: number;
    lng: number;
  };
  restaurant_id?: string; // If role is restaurant
  saved_post_ids: string[];
  name_changed_at?: string;
  username_changed_at?: string;
  city_changed_at?: string;
  created_at: string;
  updated_at?: string;
}

export type AuthScreenView =
  | 'welcome'
  | 'signin'
  | 'signup'
  | 'forgot_password'
  | 'reset_password';

export type AuthStatus =
  | 'splash'
  | 'loading'
  | 'unauthenticated'
  | 'onboarding_required'
  | 'restaurant_setup_required'
  | 'authenticated';


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
  city_id?: string;
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
  city?: string;
  city_id?: string;
  category?: string;
}

export type InteractionEventType =
  | 'impression'
  | 'watch'
  | 'complete'
  | 'rewatch'
  | 'like'
  | 'save'
  | 'share'
  | 'comment'
  | 'follow'
  | 'order'
  | 'skip'
  | 'not_interested';

export interface PostInteraction {
  id?: string;
  user_id: string;
  post_id: string;
  event_type: InteractionEventType;
  watch_duration_ms?: number;
  completion_percentage?: number;
  category?: string;
  city_id?: string;
  created_at?: string;
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
  delivery_address_id?: string;
  delivery_address_snapshot?: DeliveryAddressSnapshot;
  restaurant_id: string;
  restaurant_name: string;
  items: {
    product_id: string;
    product_name: string;
    price: number;
    original_price?: number;
    quantity: number;
    image_url?: string;
    special_instructions?: string;
  }[];
  subtotal: number;
  delivery_fee: number;
  discount: number;
  tax?: number;
  total: number;
  payment_method: 'cash_on_delivery';
  status: OrderStatus;
  notes?: string;
  include_cutlery?: boolean;
  idempotency_key?: string;
  associated_post_id?: string;
  created_at: string;
  updated_at: string;
  status_history: OrderStatusHistoryItem[];
  rider_name?: string;
  rider_phone?: string;
  rider_vehicle?: string;
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

// ── SOCIAL MESSAGING & FOLLOW SYSTEM TYPES ──
export type MessageType = 'text' | 'shared_post' | 'shared_profile' | 'shared_order' | 'image';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string;
  message_type: MessageType;
  text?: string;
  shared_data?: {
    post?: FoodPost;
    restaurant?: Restaurant;
    user?: UserProfile;
    order?: Order;
    image_url?: string;
  };
  created_at: string;
  is_read?: boolean;
}

export interface ConversationParticipant {
  id: string;
  name: string;
  avatar_url: string;
  role: UserRole;
  is_online?: boolean;
}

export interface Conversation {
  id: string;
  participant_ids: string[];
  participants: ConversationParticipant[];
  last_message?: ChatMessage;
  last_message_at: string;
  unread_count: number;
  is_request?: boolean;
  created_at: string;
}

export type FollowStatus =
  | 'none'
  | 'following'
  | 'follow_back'
  | 'requested'
  | 'mutual';

