// ============================================================
// CRAVEDROP PLATFORM - ORDER CREATION & SECURITY VALIDATION SERVICE
// Enforces authoritative price calculation, Pakistani phone validation,
// delivery coverage verification, idempotency protection, and
// immutable delivery address snapshots.
// ============================================================

import {
  DeliveryAddressSnapshot,
  FoodPost,
  Order,
  Product,
  Restaurant,
  UserAddress,
} from '../types';
import { isPostExpired } from './expiryService';
import {
  validatePakistanPhone,
  verifyDeliveryCoverage,
  createAddressSnapshot,
  formatFullAddress,
} from './addressService';
import { supabase } from '../lib/supabase';
import { isLiveSupabaseConfigured } from '../config/env';

const IS_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CreateOrderParams {
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryAddressObj?: UserAddress | DeliveryAddressSnapshot | null;
  restaurantId: string;
  items: {
    productId: string;
    quantity: number;
    specialInstructions?: string;
  }[];
  deliveryNotes?: string;
  includeCutlery?: boolean;
  paymentMethod?: 'cash_on_delivery' | string;
  idempotencyKey?: string;
  associatedPostId?: string;
  simulateNetworkFailure?: boolean; // For automated testing of network failure resilience
}

export interface OrderValidationResult {
  success: boolean;
  order?: Order;
  isDuplicate?: boolean;
  errorMessage?: string;
}

// Track processed idempotency keys to prevent duplicate orders from double-taps or retries
const processedIdempotencyMap = new Map<string, Order>();
const inFlightIdempotencyKeys = new Set<string>();

export function resetIdempotencyCacheForTests(): void {
  processedIdempotencyMap.clear();
  inFlightIdempotencyKeys.clear();
}

/**
 * Authoritative order validation, coverage verification, and price calculation
 */
export function secureCreateOrder(
  params: CreateOrderParams,
  productsCatalog: Record<string, Product>,
  restaurantsCatalog: Record<string, Restaurant>,
  postsCatalog: Record<string, FoodPost>
): OrderValidationResult {
  // 0. Check simulated network failure
  if (params.simulateNetworkFailure) {
    return {
      success: false,
      errorMessage: 'Network error while communicating with server. Your bag and details have been preserved — please try again.',
    };
  }

  // 1. Idempotency Guard (Prevent duplicate orders from repeated clicks)
  if (params.idempotencyKey) {
    if (inFlightIdempotencyKeys.has(params.idempotencyKey)) {
      return {
        success: false,
        isDuplicate: true,
        errorMessage: 'Order is already being processed. Please wait.',
      };
    }
    const existingOrder = processedIdempotencyMap.get(params.idempotencyKey);
    if (existingOrder) {
      return {
        success: true,
        order: existingOrder,
        isDuplicate: true,
      };
    }
  }

  // 2. Validate Authenticated User
  if (!params.customerId || !params.customerId.trim() || params.customerId === 'guest-customer') {
    return {
      success: false,
      errorMessage: 'Please sign in to your account to place an order.',
    };
  }

  // 3. Validate Recipient Name & Pakistani Phone Number (+92)
  if (!params.customerName || params.customerName.trim().length < 2) {
    return {
      success: false,
      errorMessage: 'Recipient full name is required.',
    };
  }

  const phoneCheck = validatePakistanPhone(params.customerPhone);
  if (!phoneCheck.isValid) {
    return {
      success: false,
      errorMessage: phoneCheck.error || 'A valid Pakistani mobile number (+92) is required.',
    };
  }

  // 4. Validate Cart Items Not Empty
  if (!params.items || params.items.length === 0) {
    return {
      success: false,
      errorMessage: 'Your food bag is empty. Add items before placing an order.',
    };
  }

  // 5. Validate Restaurant Existence & Open Status
  const restaurant = restaurantsCatalog[params.restaurantId];
  if (!restaurant) {
    return {
      success: false,
      errorMessage: 'Restaurant not found or currently unavailable.',
    };
  }

  if (!restaurant.is_open) {
    return {
      success: false,
      errorMessage: `${restaurant.name} is currently closed for new orders.`,
    };
  }

  // 6. Validate Expiration if linked to a limited-time Food Drop
  if (params.associatedPostId) {
    const post = postsCatalog[params.associatedPostId];
    if (post && isPostExpired(post.expires_at)) {
      return {
        success: false,
        errorMessage: 'This limited-time food drop has expired and can no longer be ordered.',
      };
    }
  }

  // 7. Server-Side Price Recalculation & Item Availability Check
  let verifiedSubtotal = 0;
  let totalDiscountSavings = 0;
  const verifiedOrderItems: Order['items'] = [];

  for (const item of params.items) {
    const product = productsCatalog[item.productId];
    if (!product) {
      return {
        success: false,
        errorMessage: `Item (${item.productId}) is no longer available in the menu.`,
      };
    }

    if (product.restaurant_id !== restaurant.id) {
      return {
        success: false,
        errorMessage: `Item "${product.name}" does not belong to ${restaurant.name}.`,
      };
    }

    if (!product.is_active || !product.is_available) {
      return {
        success: false,
        errorMessage: `Sorry, "${product.name}" just went out of stock or became unavailable.`,
      };
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return {
        success: false,
        errorMessage: `Invalid quantity for "${product.name}".`,
      };
    }

    const basePrice = Number(product.price);
    const unitPrice =
      product.discount_price !== undefined && product.discount_price !== null
        ? Number(product.discount_price)
        : basePrice;

    const itemLineSubtotal = Number((unitPrice * item.quantity).toFixed(2));
    const itemDiscount =
      basePrice > unitPrice
        ? Number(((basePrice - unitPrice) * item.quantity).toFixed(2))
        : 0;

    verifiedSubtotal += itemLineSubtotal;
    totalDiscountSavings += itemDiscount;

    verifiedOrderItems.push({
      product_id: product.id,
      product_name: product.name,
      price: unitPrice,
      original_price: basePrice,
      quantity: item.quantity,
      image_url: product.image_url,
      special_instructions: item.specialInstructions?.trim() || '',
    });
  }

  verifiedSubtotal = Number(verifiedSubtotal.toFixed(2));
  totalDiscountSavings = Number(totalDiscountSavings.toFixed(2));

  // 8. Validate Selected Delivery Address & Restaurant Coverage
  if (!params.deliveryAddressObj && (!params.deliveryAddress || !params.deliveryAddress.trim())) {
    return {
      success: false,
      errorMessage: 'Please select or add a valid delivery address.',
    };
  }

  if (params.deliveryAddressObj) {
    const addrOwnerId = (params.deliveryAddressObj as UserAddress).user_id;
    if (addrOwnerId && addrOwnerId !== params.customerId) {
      return {
        success: false,
        errorMessage: 'Unauthorized: You cannot use another user\'s saved delivery address.',
      };
    }

    const coverage = verifyDeliveryCoverage(restaurant, params.deliveryAddressObj, verifiedSubtotal);
    if (!coverage.canDeliver) {
      return {
        success: false,
        errorMessage: coverage.errorMessage || `${restaurant.name} cannot deliver to the selected address.`,
      };
    }
  } else {
    // Minimum order check even if fallback string address was passed
    const minOrder = restaurant.min_order ?? 0;
    if (verifiedSubtotal < minOrder) {
      const shortfall = Number((minOrder - verifiedSubtotal).toFixed(2));
      return {
        success: false,
        errorMessage: `Minimum order for ${restaurant.name} is Rs. ${minOrder.toFixed(2)}. Add Rs. ${shortfall.toFixed(2)} more to proceed.`,
      };
    }
  }

  // 9. Validate Payment Method
  const paymentMethod = params.paymentMethod || 'cash_on_delivery';
  if (paymentMethod !== 'cash_on_delivery') {
    return {
      success: false,
      errorMessage: 'Unsupported payment method selected. Only Cash on Delivery (COD) is currently enabled.',
    };
  }

  // 10. Build Immutable Delivery Address Snapshot
  let addressSnapshot: DeliveryAddressSnapshot;
  let deliveryAddressId: string | undefined;

  if (params.deliveryAddressObj) {
    if ('house_no' in params.deliveryAddressObj || 'is_default' in params.deliveryAddressObj) {
      const baseSnap = createAddressSnapshot(params.deliveryAddressObj as UserAddress);
      addressSnapshot = {
        ...baseSnap,
        recipient_name: params.customerName.trim() || baseSnap.recipient_name,
        phone_number: phoneCheck.normalized,
        delivery_instructions:
          params.deliveryNotes !== undefined
            ? params.deliveryNotes.trim()
            : baseSnap.delivery_instructions,
      };
      deliveryAddressId = (params.deliveryAddressObj as UserAddress).id;
    } else {
      const snap = params.deliveryAddressObj as DeliveryAddressSnapshot;
      addressSnapshot = {
        ...snap,
        recipient_name: params.customerName.trim() || snap.recipient_name,
        phone_number: phoneCheck.normalized,
        delivery_instructions:
          params.deliveryNotes !== undefined
            ? params.deliveryNotes.trim()
            : snap.delivery_instructions,
        formatted_address: snap.formatted_address || formatFullAddress(snap),
      };
      deliveryAddressId = snap.address_id;
    }
  } else {
    addressSnapshot = {
      label: 'Delivery Address',
      recipient_name: params.customerName.trim(),
      phone_number: phoneCheck.normalized,
      country_code: '+92',
      house_number: '',
      street: params.deliveryAddress.trim(),
      area: '',
      city_id: (restaurant.city_id || restaurant.city || '').toLowerCase(),
      city_name: restaurant.city || '',
      delivery_instructions: params.deliveryNotes?.trim() || '',
      latitude: null,
      longitude: null,
      formatted_address: params.deliveryAddress.trim(),
    };
  }

  const deliveryFee = Number((restaurant.delivery_fee ?? 2.99).toFixed(2));
  const tax = 0;
  const verifiedTotal = Number((verifiedSubtotal + deliveryFee + tax).toFixed(2));

  const orderId = `ord-${Math.floor(100000 + Math.random() * 900000)}`;
  const nowIso = new Date().toISOString();

  const newOrder: Order = {
    id: orderId,
    customer_id: params.customerId,
    customer_name: addressSnapshot.recipient_name,
    customer_phone: addressSnapshot.phone_number,
    delivery_address: addressSnapshot.formatted_address || params.deliveryAddress.trim(),
    delivery_address_id: deliveryAddressId,
    delivery_address_snapshot: { ...addressSnapshot },
    restaurant_id: restaurant.id,
    restaurant_name: restaurant.name,
    items: verifiedOrderItems,
    subtotal: verifiedSubtotal,
    delivery_fee: deliveryFee,
    discount: totalDiscountSavings,
    tax,
    total: verifiedTotal,
    payment_method: 'cash_on_delivery',
    status: 'pending',
    notes: addressSnapshot.delivery_instructions || params.deliveryNotes?.trim() || '',
    include_cutlery: params.includeCutlery ?? true,
    idempotency_key: params.idempotencyKey,
    associated_post_id: params.associatedPostId,
    created_at: nowIso,
    updated_at: nowIso,
    status_history: [
      {
        status: 'pending',
        timestamp: nowIso,
        note: 'Order verified and submitted via Cash on Delivery (COD).',
      },
    ],
  };

  if (params.idempotencyKey) {
    processedIdempotencyMap.set(params.idempotencyKey, newOrder);
  }

  return {
    success: true,
    order: newOrder,
  };
}

/**
 * Persists a verified order and its items to Supabase when live DB is active and IDs are UUIDs
 */
export async function persistOrderToSupabase(order: Order): Promise<void> {
  if (!isLiveSupabaseConfigured()) return;
  if (!IS_UUID.test(order.customer_id) || !IS_UUID.test(order.restaurant_id)) return;

  try {
    const orderPayload: any = {
      customer_id: order.customer_id,
      restaurant_id: order.restaurant_id,
      associated_post_id:
        order.associated_post_id && IS_UUID.test(order.associated_post_id)
          ? order.associated_post_id
          : null,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      delivery_address: order.delivery_address,
      delivery_address_id:
        order.delivery_address_id && IS_UUID.test(order.delivery_address_id)
          ? order.delivery_address_id
          : null,
      delivery_address_snapshot: order.delivery_address_snapshot || null,
      subtotal: order.subtotal,
      delivery_fee: order.delivery_fee,
      discount: order.discount || 0,
      tax: order.tax || 0,
      total: order.total,
      payment_method: order.payment_method,
      status: order.status,
      notes: order.notes || '',
      include_cutlery: order.include_cutlery ?? true,
      idempotency_key: order.idempotency_key || null,
    };

    const { data: insertedOrder, error: orderError } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select()
      .maybeSingle();

    if (orderError || !insertedOrder) {
      return;
    }

    const validItems = order.items
      .filter((i) => IS_UUID.test(i.product_id))
      .map((i) => ({
        order_id: insertedOrder.id,
        product_id: i.product_id,
        product_name: i.product_name,
        price: i.price,
        original_price: i.original_price ?? i.price,
        quantity: i.quantity,
        special_instructions: i.special_instructions || '',
        image_url: i.image_url || '',
      }));

    if (validItems.length > 0) {
      await supabase.from('order_items').insert(validItems);
    }
  } catch (err) {
    console.warn('[OrderService] Supabase order persistence warning:', err);
  }
}
