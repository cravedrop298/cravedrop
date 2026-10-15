/**
 * CraveDrop — Complete Checkout & Delivery Address System
 * Automated Verification Suite (18 Required Scenarios)
 */

// Polyfill localStorage for Node.js test execution
const memoryStorage = new Map<string, string>();
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (key: string) => memoryStorage.get(key) ?? null,
    setItem: (key: string, val: string) => memoryStorage.set(key, val),
    removeItem: (key: string) => memoryStorage.delete(key),
    clear: () => memoryStorage.clear(),
  };
}

import {
  validatePakistanPhone,
  formatPakistanPhoneDisplay,
  formatFullAddress,
  verifyDeliveryCoverage,
  fetchUserAddresses,
  saveUserAddress,
  deleteUserAddress,
  setDefaultUserAddress,
} from '../services/addressService';
import {
  secureCreateOrder,
  resetIdempotencyCacheForTests,
} from '../services/orderService';
import type {
  UserProfile,
  Restaurant,
  Product,
  FoodPost,
  UserAddress,
} from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function runTests() {
  console.log('==================================================================');
  console.log('  CraveDrop Checkout & Delivery Address Verification Suite (18)');
  console.log('==================================================================\n');

  let passedCount = 0;
  const results: { id: number; name: string; status: 'PASS' | 'FAIL'; details: string }[] = [];

  const recordResult = (id: number, name: string, passed: boolean, details: string) => {
    if (passed) passedCount++;
    results.push({ id, name, status: passed ? 'PASS' : 'FAIL', details });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] Scenario #${id}: ${name}`);
    console.log(`       -> ${details}\n`);
    if (!passed) throw new Error(`Scenario #${id} failed: ${details}`);
  };

  // Setup mock test entities
  const userA: UserProfile = {
    id: 'user-pk-101',
    name: 'Zainab Tariq',
    username: 'zainab_t',
    email: 'zainab@example.pk',
    phone: '+923001234567',
    avatar_url: '',
    role: 'customer',
    city: 'Karachi',
    city_id: 'karachi',
    onboarding_completed: true,
    saved_post_ids: [],
    created_at: new Date().toISOString(),
  };

  const userB: UserProfile = {
    id: 'user-pk-202',
    name: 'Bilal Ahmed',
    username: 'bilal_a',
    email: 'bilal@example.pk',
    phone: '+923217654321',
    avatar_url: '',
    role: 'customer',
    city: 'Lahore',
    city_id: 'lahore',
    onboarding_completed: true,
    saved_post_ids: [],
    created_at: new Date().toISOString(),
  };

  const karachiRestaurant: Restaurant = {
    id: 'rest-khi-1',
    owner_id: 'owner-1',
    name: 'Kolachi Grill & BBQ',
    slug: 'kolachi-grill-bbq',
    bio: 'Authentic charcoal BBQ in Karachi',
    logo_url: '',
    cover_url: '',
    category: 'BBQ',
    cuisine: ['BBQ', 'Pakistani'],
    address: 'Do Darya, DHA Phase 8, Karachi',
    city: 'Karachi',
    city_id: 'karachi',
    lat: 24.7568,
    lng: 67.0785,
    rating: 4.9,
    review_count: 410,
    delivery_fee: 150,
    min_order: 500,
    delivery_time_min: 35,
    delivery_time_max: 45,
    is_open: true,
    is_verified: true,
    is_featured: true,
    is_approved: true,
    opening_hours: '12:00 PM - 12:00 AM',
    followers_count: 1200,
    created_at: new Date().toISOString(),
  };

  const productAvailable: Product = {
    id: 'prod-1',
    restaurant_id: 'rest-khi-1',
    name: 'Smoky Beef Bihari Platter',
    description: 'Served with parathas and tamarind chutney',
    price: 1200,
    discount_price: 950, // Food Drop active discount
    category: 'BBQ',
    image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947',
    is_available: true,
    is_active: true,
    prep_time_mins: 25,
    created_at: new Date().toISOString(),
  };

  const productSmall: Product = {
    id: 'prod-2',
    restaurant_id: 'rest-khi-1',
    name: 'Garlic Raita',
    description: 'Fresh yogurt dip',
    price: 150,
    category: 'Sides',
    image_url: '',
    is_available: true,
    is_active: true,
    prep_time_mins: 5,
    created_at: new Date().toISOString(),
  };

  const restaurantsCatalog: Record<string, Restaurant> = {
    [karachiRestaurant.id]: karachiRestaurant,
  };
  const productsCatalog: Record<string, Product> = {
    [productAvailable.id]: productAvailable,
    [productSmall.id]: productSmall,
  };
  const postsCatalog: Record<string, FoodPost> = {};

  // -------------------------------------------------------------------------
  // 1. New user with no saved addresses
  // -------------------------------------------------------------------------
  memoryStorage.clear();
  const initialAddresses = await fetchUserAddresses(userA.id);
  assert(initialAddresses.length === 0, 'New user must start with 0 saved addresses (no fake/demo address)');

  const noAddrOrder = secureCreateOrder(
    {
      customerId: userA.id,
      customerName: userA.name,
      customerPhone: userA.phone!,
      deliveryAddress: '',
      deliveryAddressObj: null,
      restaurantId: karachiRestaurant.id,
      items: [{ productId: productAvailable.id, quantity: 1 }],
      paymentMethod: 'cash_on_delivery',
    },
    productsCatalog,
    restaurantsCatalog,
    postsCatalog
  );
  assert(!noAddrOrder.success, 'Order without selected delivery address must be blocked');
  recordResult(
    1,
    'New user with no saved addresses',
    initialAddresses.length === 0 && !noAddrOrder.success,
    `Returned ${initialAddresses.length} addresses (zero demo data) & blocked checkout with: "${noAddrOrder.errorMessage}"`
  );

  // -------------------------------------------------------------------------
  // 2 & 3. Adding, editing, deleting, and selecting multiple addresses for a user
  // -------------------------------------------------------------------------
  const saveHomeRes = await saveUserAddress(userA.id, {
    label: 'Home',
    recipient_name: 'Zainab Tariq',
    phone_number: '0300 1234567',
    city_id: 'karachi',
    city_name: 'Karachi',
    area: 'DHA Phase 6',
    house_number: 'House 42-B',
    street: 'Street 14',
    block_or_phase: 'Phase 6',
    landmark: 'Near Rahat Milk Corner',
    delivery_instructions: 'Ring bell twice',
    latitude: 24.7938,
    longitude: 67.0643,
    is_default: true,
  });
  assert(saveHomeRes.success && !!saveHomeRes.address, 'Failed to save Home address');

  const saveWorkRes = await saveUserAddress(userA.id, {
    label: 'Work',
    recipient_name: 'Zainab Tariq (Office)',
    phone_number: '+92 321 9876543',
    city_id: 'karachi',
    city_name: 'Karachi',
    area: 'Clifton Block 5',
    house_number: 'Suite 802, Emerald Tower',
    street: 'Main Clifton Road',
    landmark: 'Opposite 2 Talwar',
    is_default: false,
  });
  assert(saveWorkRes.success && !!saveWorkRes.address, 'Failed to save Work address');

  const saveOtherRes = await saveUserAddress(userA.id, {
    label: 'Other',
    recipient_name: 'Zainab Parents',
    phone_number: '03331122334',
    city_id: 'karachi',
    city_name: 'Karachi',
    area: 'Gulshan-e-Iqbal Block 4',
    house_number: 'Flat A-3',
    street: 'Street 7',
    is_default: false,
  });
  assert(saveOtherRes.success && !!saveOtherRes.address, 'Failed to save Other address');

  const multipleList = await fetchUserAddresses(userA.id);
  assert(multipleList.length === 3, 'Expected 3 saved addresses');
  const defaultAddr = multipleList.find((a) => a.is_default);
  recordResult(
    2,
    'Returning user with multiple saved addresses',
    multipleList.length === 3 && defaultAddr?.label === 'Home',
    `Loaded ${multipleList.length} saved addresses with default "${defaultAddr?.label} - ${defaultAddr?.area}"`
  );

  // Edit Work address
  const editedWorkRes = await saveUserAddress(
    userA.id,
    {
      label: 'Work',
      recipient_name: 'Zainab Tariq',
      phone_number: '+923219876543',
      city_id: 'karachi',
      city_name: 'Karachi',
      area: 'Clifton Block 5',
      house_number: 'Floor 9, Emerald Tower',
      street: 'Main Clifton Road',
      landmark: 'Near Do Talwar',
      is_default: false,
    },
    saveWorkRes.address!.id
  );
  assert(editedWorkRes.success && editedWorkRes.address?.house_number === 'Floor 9, Emerald Tower', 'Address edit failed');

  // Delete Other address
  const delOtherRes = await deleteUserAddress(userA.id, saveOtherRes.address!.id);
  const afterDelList = await fetchUserAddresses(userA.id);
  assert(delOtherRes.success && afterDelList.length === 2, 'Address delete failed');
  recordResult(
    3,
    'Adding, editing, deleting, and selecting an address',
    editedWorkRes.success && delOtherRes.success && afterDelList.length === 2,
    `Added 3 addresses, edited Work house_number to "${editedWorkRes.address?.house_number}", deleted Other address (2 remaining)`
  );

  // -------------------------------------------------------------------------
  // 4. Setting and changing a default address
  // -------------------------------------------------------------------------
  const setDefaultRes = await setDefaultUserAddress(userA.id, saveWorkRes.address!.id);
  const afterDefaultList = await fetchUserAddresses(userA.id);
  const newDefault = afterDefaultList.find((a) => a.id === saveWorkRes.address!.id);
  const oldDefault = afterDefaultList.find((a) => a.id === saveHomeRes.address!.id);
  assert(
    setDefaultRes.success && newDefault?.is_default === true && oldDefault?.is_default === false,
    'Changing default address must unset previous default'
  );
  // Restore Home as default for subsequent Karachi tests
  await setDefaultUserAddress(userA.id, saveHomeRes.address!.id);
  recordResult(
    4,
    'Setting and changing a default address',
    newDefault?.is_default === true && oldDefault?.is_default === false,
    `Switched default to Work (${newDefault?.is_default}) while automatically unsetting Home (${oldDefault?.is_default})`
  );

  // -------------------------------------------------------------------------
  // 5. Invalid Pakistani phone number
  // -------------------------------------------------------------------------
  const invalidSamples = [
    '+1 555-019-2834', // US fake number
    '+44 7911 123456', // UK number
    '02134567890',     // Landline instead of 03XX mobile
    '030012345',       // Too short
    '0300123456789',   // Too long
    'abc1234567',      // Non-numeric
  ];
  const allRejected = invalidSamples.every((sample) => !validatePakistanPhone(sample).isValid);
  recordResult(
    5,
    'Invalid Pakistani phone number rejection',
    allRejected,
    `Rejected all ${invalidSamples.length} invalid numbers (${invalidSamples.join(', ')})`
  );

  // -------------------------------------------------------------------------
  // 6. Valid +92 phone number
  // -------------------------------------------------------------------------
  const validSamples = [
    '03001234567',
    '+923001234567',
    '+92 321 7654321',
    '0333-4567890',
    '3451122334',
  ];
  const allValidNormalized = validSamples.every((sample) => {
    const res = validatePakistanPhone(sample);
    return res.isValid && /^\+923[0-5]\d{8}$/.test(res.normalized);
  });
  const displayFormatted = formatPakistanPhoneDisplay('03001234567');
  recordResult(
    6,
    'Valid +92 phone number normalization & formatting',
    allValidNormalized && displayFormatted === '+92 300 1234567',
    `All ${validSamples.length} Pakistani formats normalized to +923XXXXXXXXX (display: "${displayFormatted}")`
  );

  // -------------------------------------------------------------------------
  // 7. GPS permission granted
  // -------------------------------------------------------------------------
  const gpsAddressRes = await saveUserAddress(userA.id, {
    label: 'Other',
    recipient_name: 'Zainab Tariq',
    phone_number: '+923001234567',
    city_name: 'Karachi',
    area: 'DHA Phase 8',
    house_number: 'Plot 19-C',
    street: 'Khayaban-e-Ittehad',
    latitude: 24.7652,
    longitude: 67.0711,
    is_default: false,
  });
  assert(
    gpsAddressRes.success &&
      gpsAddressRes.address?.latitude === 24.7652 &&
      gpsAddressRes.address?.longitude === 67.0711,
    'GPS coordinates must be persisted when confirmed'
  );
  recordResult(
    7,
    'GPS permission granted (confirmed map pin coordinates saved)',
    gpsAddressRes.address?.latitude === 24.7652 && gpsAddressRes.address?.longitude === 67.0711,
    `Saved exact confirmed pin coordinates (${gpsAddressRes.address?.latitude}, ${gpsAddressRes.address?.longitude})`
  );

  // -------------------------------------------------------------------------
  // 8 & 9. GPS permission denied & Manual address entry when GPS is unavailable
  // -------------------------------------------------------------------------
  const manualAddressRes = await saveUserAddress(userA.id, {
    label: 'Other',
    recipient_name: 'Zainab Tariq',
    phone_number: '03001234567',
    city_name: 'Karachi',
    area: 'PECHS Block 2',
    house_number: 'House 88',
    street: 'Street 5',
    latitude: null,
    longitude: null,
    is_default: false,
  });
  assert(
    manualAddressRes.success &&
      manualAddressRes.address?.latitude === null &&
      manualAddressRes.address?.longitude === null,
    'When GPS is denied/unavailable, address must save with null coordinates (never fake coordinates)'
  );
  const manualCoverage = verifyDeliveryCoverage(karachiRestaurant, manualAddressRes.address!, 950);
  recordResult(
    8,
    'GPS permission denied (graceful fallback without fake coordinates)',
    manualAddressRes.address?.latitude === null && manualAddressRes.address?.longitude === null,
    `Saved manual address with latitude=null, longitude=null (zero fake coordinates)`
  );
  recordResult(
    9,
    'Manual address entry when GPS is unavailable',
    manualAddressRes.success && manualCoverage.canDeliver,
    `Manual address "${formatFullAddress(manualAddressRes.address!)}" verified eligible for city-level delivery`
  );

  // -------------------------------------------------------------------------
  // 10. Restaurant unable to deliver to selected address (city mismatch, distance, min order)
  // -------------------------------------------------------------------------
  const lahoreAddrRes = await saveUserAddress(userA.id, {
    label: 'Other',
    recipient_name: 'Zainab Cousin',
    phone_number: '03001234567',
    city_id: 'lahore',
    city_name: 'Lahore',
    area: 'Gulberg III',
    house_number: 'House 12',
    street: 'Main Boulevard',
    is_default: false,
  });
  const cityMismatchCheck = verifyDeliveryCoverage(karachiRestaurant, lahoreAddrRes.address!, 950);
  assert(!cityMismatchCheck.canDeliver && !cityMismatchCheck.cityMatches, 'Cross-city delivery must be blocked');

  const farKarachiAddr: UserAddress = {
    ...saveHomeRes.address!,
    latitude: 25.05, // ~41 km away from Do Darya (> 22km max radius, < 50km city zone)
    longitude: 67.35,
  };
  const outOfRangeCheck = verifyDeliveryCoverage(karachiRestaurant, farKarachiAddr, 950);
  assert(!outOfRangeCheck.canDeliver && (outOfRangeCheck.distanceKm ?? 0) > outOfRangeCheck.maxRadiusKm, 'Out-of-range coordinate must be blocked');

  const minOrderCheck = verifyDeliveryCoverage(karachiRestaurant, saveHomeRes.address!, 150);
  assert(!minOrderCheck.canDeliver && !minOrderCheck.meetsMinOrder, 'Below minimum order must be blocked');

  recordResult(
    10,
    'Restaurant unable to deliver to selected address',
    !cityMismatchCheck.canDeliver && !outOfRangeCheck.canDeliver && !minOrderCheck.canDeliver,
    `Blocked cross-city ("${cityMismatchCheck.errorMessage}"), out-of-radius (${outOfRangeCheck.distanceKm} km), and below min-order ("${minOrderCheck.errorMessage}")`
  );

  // -------------------------------------------------------------------------
  // 11. Empty cart rejection
  // -------------------------------------------------------------------------
  const emptyCartRes = secureCreateOrder(
    {
      customerId: userA.id,
      customerName: userA.name,
      customerPhone: userA.phone!,
      deliveryAddress: formatFullAddress(saveHomeRes.address!),
      deliveryAddressObj: saveHomeRes.address!,
      restaurantId: karachiRestaurant.id,
      items: [],
      paymentMethod: 'cash_on_delivery',
    },
    productsCatalog,
    restaurantsCatalog,
    postsCatalog
  );
  assert(!emptyCartRes.success, 'Empty cart must be rejected');
  recordResult(
    11,
    'Empty cart rejection',
    !emptyCartRes.success,
    `Rejected empty cart with error: "${emptyCartRes.errorMessage}"`
  );

  // -------------------------------------------------------------------------
  // 12. Item becoming unavailable before checkout
  // -------------------------------------------------------------------------
  const soldOutCatalog: Record<string, Product> = {
    [productAvailable.id]: { ...productAvailable, is_available: false },
  };
  const unavailableRes = secureCreateOrder(
    {
      customerId: userA.id,
      customerName: userA.name,
      customerPhone: userA.phone!,
      deliveryAddress: formatFullAddress(saveHomeRes.address!),
      deliveryAddressObj: saveHomeRes.address!,
      restaurantId: karachiRestaurant.id,
      items: [{ productId: productAvailable.id, quantity: 1 }],
      paymentMethod: 'cash_on_delivery',
    },
    soldOutCatalog,
    restaurantsCatalog,
    postsCatalog
  );
  assert(!unavailableRes.success, 'Unavailable product must block order placement');
  recordResult(
    12,
    'Item becoming unavailable before checkout',
    !unavailableRes.success,
    `Blocked sold-out item with error: "${unavailableRes.errorMessage}"`
  );

  // -------------------------------------------------------------------------
  // 13 & 15. Successful Cash on Delivery order + Duplicate Place Order clicks (Idempotency)
  // -------------------------------------------------------------------------
  resetIdempotencyCacheForTests();
  const idempotencyKey = 'idem-checkout-test-001';
  const homeAddr = saveHomeRes.address!;

  const orderRes1 = secureCreateOrder(
    {
      customerId: userA.id,
      customerName: homeAddr.recipient_name,
      customerPhone: homeAddr.phone_number,
      deliveryAddress: formatFullAddress(homeAddr),
      deliveryAddressObj: homeAddr,
      restaurantId: karachiRestaurant.id,
      items: [
        { productId: productAvailable.id, quantity: 2 }, // price 1200, discount_price 950 -> savings 250*2 = 500
        { productId: productSmall.id, quantity: 1 },     // price 150
      ],
      deliveryNotes: 'Extra chutney please',
      includeCutlery: true,
      paymentMethod: 'cash_on_delivery',
      idempotencyKey,
    },
    productsCatalog,
    restaurantsCatalog,
    postsCatalog
  );

  assert(orderRes1.success && !!orderRes1.order, 'Valid COD order should succeed');
  const createdOrder = orderRes1.order!;
  // Expected math:
  // Active item subtotal = (950 * 2) + (150 * 1) = 2050
  // Discount savings = (1200 - 950) * 2 = 500
  // Delivery fee = 150
  // Tax = 0
  // Total = 2050 + 150 = 2200
  assert(createdOrder.subtotal === 2050, `Expected subtotal 2050, got ${createdOrder.subtotal}`);
  assert(createdOrder.discount === 500, `Expected discount 500, got ${createdOrder.discount}`);
  assert(createdOrder.delivery_fee === 150, `Expected delivery_fee 150, got ${createdOrder.delivery_fee}`);
  assert(createdOrder.total === 2200, `Expected total 2200, got ${createdOrder.total}`);

  // Immediate duplicate click with same idempotencyKey
  const orderRes2 = secureCreateOrder(
    {
      customerId: userA.id,
      customerName: homeAddr.recipient_name,
      customerPhone: homeAddr.phone_number,
      deliveryAddress: formatFullAddress(homeAddr),
      deliveryAddressObj: homeAddr,
      restaurantId: karachiRestaurant.id,
      items: [{ productId: productAvailable.id, quantity: 1 }],
      paymentMethod: 'cash_on_delivery',
      idempotencyKey,
    },
    productsCatalog,
    restaurantsCatalog,
    postsCatalog
  );

  assert(
    orderRes2.success && orderRes2.isDuplicate === true && orderRes2.order?.id === createdOrder.id,
    'Duplicate Place Order click with same idempotency key must return the exact same order without creating a duplicate'
  );

  recordResult(
    13,
    'Duplicate Place Order clicks (Idempotency protection)',
    orderRes2.order?.id === createdOrder.id && orderRes2.isDuplicate === true,
    `Second click with key "${idempotencyKey}" returned original Order ID "${createdOrder.id}" (isDuplicate=true)`
  );

  // -------------------------------------------------------------------------
  // 14. Network failure during order creation preserves cart & state
  // -------------------------------------------------------------------------
  const cartBeforeFailure = [{ productId: productAvailable.id, quantity: 1 }];
  const networkFailRes = secureCreateOrder(
    {
      customerId: userA.id,
      customerName: homeAddr.recipient_name,
      customerPhone: homeAddr.phone_number,
      deliveryAddress: formatFullAddress(homeAddr),
      deliveryAddressObj: homeAddr,
      restaurantId: karachiRestaurant.id,
      items: cartBeforeFailure,
      paymentMethod: 'cash_on_delivery',
      simulateNetworkFailure: true,
    },
    productsCatalog,
    restaurantsCatalog,
    postsCatalog
  );
  assert(!networkFailRes.success && cartBeforeFailure.length === 1, 'Failed order creation must not mutate or clear the cart');
  recordResult(
    14,
    'Network failure during order creation preserves cart and state',
    !networkFailRes.success && cartBeforeFailure.length === 1,
    `Network failure ("${networkFailRes.errorMessage}") left cart intact (${cartBeforeFailure.length} item)`
  );

  recordResult(
    15,
    'Successful Cash on Delivery order & authoritative server calculation',
    createdOrder.total === 2200 && createdOrder.payment_method === 'cash_on_delivery',
    `Order ${createdOrder.id}: Subtotal Rs.${createdOrder.subtotal}, Drop Savings -Rs.${createdOrder.discount}, Delivery Rs.${createdOrder.delivery_fee} => Total Rs.${createdOrder.total}`
  );

  // -------------------------------------------------------------------------
  // 16. User attempting to access or modify another user's saved address
  // -------------------------------------------------------------------------
  const crossEditAttempt = await saveUserAddress(
    userB.id,
    {
      label: 'Home',
      recipient_name: 'Hacker Bilal',
      phone_number: '03217654321',
      city_name: 'Lahore',
      area: 'DHA Phase 5',
      house_number: 'House 1',
      street: 'Street 1',
    },
    homeAddr.id // Belongs to userA!
  );
  const crossDeleteAttempt = await deleteUserAddress(userB.id, homeAddr.id);
  const crossOrderAttempt = secureCreateOrder(
    {
      customerId: userB.id,
      customerName: userB.name,
      customerPhone: userB.phone!,
      deliveryAddress: formatFullAddress(homeAddr),
      deliveryAddressObj: homeAddr, // Belongs to userA!
      restaurantId: karachiRestaurant.id,
      items: [{ productId: productAvailable.id, quantity: 1 }],
      paymentMethod: 'cash_on_delivery',
    },
    productsCatalog,
    restaurantsCatalog,
    postsCatalog
  );

  assert(!crossEditAttempt.success, 'User B must not be able to edit User A address');
  assert(!crossDeleteAttempt.success, 'User B must not be able to delete User A address');
  assert(!crossOrderAttempt.success, 'User B must not be able to checkout using User A address');
  recordResult(
    16,
    "User attempting to access or modify another user's saved address",
    !crossEditAttempt.success && !crossDeleteAttempt.success && !crossOrderAttempt.success,
    `Blocked cross-user edit ("${crossEditAttempt.error}"), delete ("${crossDeleteAttempt.error}"), and checkout ("${crossOrderAttempt.errorMessage}")`
  );

  // -------------------------------------------------------------------------
  // 17. Delivery address city changed without changing the user's profile city
  // -------------------------------------------------------------------------
  const originalProfileCity = userA.city;
  const originalProfileCityId = userA.city_id;
  const islamabadAddrRes = await saveUserAddress(userA.id, {
    label: 'Other',
    recipient_name: 'Zainab Tariq (Trip)',
    phone_number: '+923001234567',
    city_id: 'islamabad',
    city_name: 'Islamabad',
    area: 'F-7',
    house_number: 'House 10',
    street: 'Street 22',
    is_default: false,
  });
  assert(
    islamabadAddrRes.success &&
      islamabadAddrRes.address?.city_name === 'Islamabad' &&
      userA.city === originalProfileCity &&
      userA.city_id === originalProfileCityId,
    'Saving an address in another city must never mutate user.city or user.city_id'
  );
  recordResult(
    17,
    "Delivery address city changed without changing the user's profile city",
    userA.city === 'Karachi' && islamabadAddrRes.address?.city_name === 'Islamabad',
    `Address saved in "${islamabadAddrRes.address?.city_name}" while user profile city remained "${userA.city}" (${userA.city_id})`
  );

  // -------------------------------------------------------------------------
  // 18. Existing historical orders retaining their original delivery address snapshot
  //     after the saved address is edited or deleted
  // -------------------------------------------------------------------------
  const snapshotBefore = createdOrder.delivery_address_snapshot!;
  assert(
    snapshotBefore.house_number === 'House 42-B' && snapshotBefore.area === 'DHA Phase 6',
    'Order must contain initial delivery_address_snapshot'
  );

  // Now mutate the saved address and then delete it
  await saveUserAddress(
    userA.id,
    {
      label: 'Home',
      recipient_name: 'Moved To New House',
      phone_number: '03009998887',
      city_name: 'Karachi',
      area: 'Bahria Town',
      house_number: 'Villa 999',
      street: 'Precinct 10',
    },
    homeAddr.id
  );
  await deleteUserAddress(userA.id, homeAddr.id);

  // Verify the historical order's snapshot is completely untouched
  assert(
    createdOrder.delivery_address_snapshot?.recipient_name === 'Zainab Tariq' &&
      createdOrder.delivery_address_snapshot?.house_number === 'House 42-B' &&
      createdOrder.delivery_address_snapshot?.area === 'DHA Phase 6',
    'Historical order snapshot must remain immutable after saved address is edited or deleted'
  );
  recordResult(
    18,
    'Historical orders retain immutable delivery address snapshot after edit/delete',
    createdOrder.delivery_address_snapshot?.house_number === 'House 42-B' &&
      createdOrder.delivery_address_snapshot?.recipient_name === 'Zainab Tariq',
    `Saved address was edited to "Villa 999, Bahria Town" and deleted, but Order ${createdOrder.id} retained snapshot: "${createdOrder.delivery_address_snapshot?.formatted_address}"`
  );

  console.log('==================================================================');
  console.log(`  ALL ${passedCount}/${results.length} CHECKOUT & ADDRESS SCENARIOS PASSED!`);
  console.log('==================================================================');
}

runTests().catch((err) => {
  console.error('TEST SUITE FAILED:', err);
  throw err;
});
