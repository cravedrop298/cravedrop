// Order Creation & Security Validation Service
// Strictly enforces server-side price calculation and expiration guarantees.

import { CartItem, FoodPost, Order, Product, Restaurant } from '../types';
import { isPostExpired } from './expiryService';

export interface CreateOrderParams {
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  restaurantId: string;
  items: {
    productId: string;
    quantity: number;
    specialInstructions?: string;
  }[];
  deliveryNotes?: string;
  associatedPostId?: string;
}

export interface OrderValidationResult {
  success: boolean;
  order?: Order;
  errorMessage?: string;
}

/**
 * Server-side order calculation and security verification
 * Fetches authoritative database prices and checks post expiration.
 */
export function secureCreateOrder(
  params: CreateOrderParams,
  productsCatalog: Record<string, Product>,
  restaurantsCatalog: Record<string, Restaurant>,
  postsCatalog: Record<string, FoodPost>
): OrderValidationResult {
  const restaurant = restaurantsCatalog[params.restaurantId];
  if (!restaurant) {
    return { success: false, errorMessage: 'Restaurant not found or unavailable.' };
  }

  if (!restaurant.is_open) {
    return { success: false, errorMessage: 'This kitchen is currently closed for new orders.' };
  }

  // 1. Validate Expiration if linked to a limited-time food drop
  if (params.associatedPostId) {
    const post = postsCatalog[params.associatedPostId];
    if (post && isPostExpired(post.expires_at)) {
      return {
        success: false,
        errorMessage: 'This limited-time food drop has expired. Orders can no longer be accepted.',
      };
    }
  }

  if (!params.items || params.items.length === 0) {
    return { success: false, errorMessage: 'Your food bag is empty.' };
  }

  // 2. Server-side Price Re-calculation (Do NOT trust client prices)
  let verifiedSubtotal = 0;
  const verifiedOrderItems: Order['items'] = [];

  for (const item of params.items) {
    const product = productsCatalog[item.productId];
    if (!product) {
      return { success: false, errorMessage: `Product ID ${item.productId} is invalid.` };
    }

    if (!product.is_active || !product.is_available) {
      return {
        success: false,
        errorMessage: `Item "${product.name}" is currently out of stock.`,
      };
    }

    if (item.quantity <= 0) {
      return { success: false, errorMessage: 'Invalid item quantity.' };
    }

    // Authoritative price check
    const unitPrice = product.discount_price !== undefined ? product.discount_price : product.price;
    const itemTotal = unitPrice * item.quantity;
    verifiedSubtotal += itemTotal;

    verifiedOrderItems.push({
      product_id: product.id,
      product_name: product.name,
      price: unitPrice,
      quantity: item.quantity,
      image_url: product.image_url,
    });
  }

  const deliveryFee = restaurant.delivery_fee ?? 2.99;
  const discount = 0;
  const verifiedTotal = Number((verifiedSubtotal + deliveryFee - discount).toFixed(2));

  const orderId = `ord-${Math.floor(1000 + Math.random() * 9000)}`;
  const nowIso = new Date().toISOString();

  const newOrder: Order = {
    id: orderId,
    customer_id: params.customerId,
    customer_name: params.customerName,
    customer_phone: params.customerPhone,
    delivery_address: params.deliveryAddress,
    restaurant_id: restaurant.id,
    restaurant_name: restaurant.name,
    items: verifiedOrderItems,
    subtotal: Number(verifiedSubtotal.toFixed(2)),
    delivery_fee: deliveryFee,
    discount,
    total: verifiedTotal,
    payment_method: 'cash_on_delivery',
    status: 'pending',
    notes: params.deliveryNotes,
    associated_post_id: params.associatedPostId,
    created_at: nowIso,
    updated_at: nowIso,
    status_history: [
      {
        status: 'pending',
        timestamp: nowIso,
        note: 'Order submitted with Cash on Delivery.',
      },
    ],
  };

  return {
    success: true,
    order: newOrder,
  };
}
