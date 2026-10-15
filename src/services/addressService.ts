// ============================================================
// CRAVEDROP PLATFORM - DELIVERY ADDRESS & COVERAGE SERVICE
// Manages saved user addresses (Supabase + isolated per-user cache),
// Pakistani (+92) phone validation, structured city/area data,
// and restaurant delivery coverage verification.
// ============================================================

import { supabase } from '../lib/supabase';
import { isLiveSupabaseConfigured } from '../config/env';
import {
  UserAddress,
  DeliveryAddressSnapshot,
  Restaurant,
  CityOption,
} from '../types';
import {
  PAKISTAN_CITIES_LIST,
  getCityById,
  getCityByName,
} from '../utils/userUtils';

const IS_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Structured initial areas/sectors for Pakistani cities
// Additional cities and areas can be added in Supabase public.cities & public.city_areas
export const INITIAL_CITY_AREAS: Record<string, string[]> = {
  islamabad: [
    'F-6',
    'F-7',
    'F-8',
    'F-10',
    'F-11',
    'G-6',
    'G-7',
    'G-8',
    'G-9',
    'G-10',
    'G-11',
    'G-13',
    'I-8',
    'I-9',
    'I-10',
    'E-7',
    'E-11',
    'Blue Area',
    'DHA Islamabad',
    'Bahria Enclave',
    'Bani Gala',
    'Chak Shahzad',
  ],
  rawalpindi: [
    'Saddar',
    'Satellite Town',
    'Bahria Town Phase 1-6',
    'Bahria Town Phase 7-8',
    'Chaklala Scheme 3',
    'Commercial Market',
    'Peshawar Road',
    'Westridge',
    'Lalazar',
    'Askari 14',
    'Gulraiz Housing Scheme',
    'PWD Housing Scheme',
    'Adiala Road',
  ],
  lahore: [
    'Gulberg',
    'Johar Town',
    'DHA Phase 1-5',
    'DHA Phase 6-8',
    'Model Town',
    'Bahria Town',
    'Cantt',
    'Garden Town',
    'Faisal Town',
    'Wapda Town',
    'Cavalry Ground',
    'Allama Iqbal Town',
    'Valencia Town',
    'Lakshmi Chowk',
    'Shadman',
  ],
  karachi: [
    'Clifton',
    'DHA Phase 1-8',
    'Gulshan-e-Iqbal',
    'North Nazimabad',
    'PECHS',
    'Bahadurabad',
    'Gulistan-e-Johar',
    'Tariq Road',
    'Saddar / Burns Road',
    'Malir Cantt',
    'Defence View',
    'Nazimabad',
    'Federal B Area',
    'Korangi',
  ],
  faisalabad: [
    'Peoples Colony',
    'Madina Town',
    'D Ground',
    'Kohinoor City',
    'Canal Road',
    'Civil Lines',
    'Samanabad',
    'Gulberg',
  ],
  multan: [
    'Cantt',
    'Gulgasht Colony',
    'Model Town',
    'Bosan Road',
    'DHA Multan',
    'Wapda Town',
    'New Multan',
    'Shah Rukn-e-Alam',
  ],
  peshawar: [
    'Hayatabad',
    'University Town',
    'Cantt',
    'Saddar',
    'Warsak Road',
    'Defence Colony',
    'Gulbahar',
    'Ring Road',
  ],
  quetta: [
    'Jinnah Town',
    'Cantt',
    'Satellite Town',
    'Samungli Road',
    'Model Town',
    'Zarghoon Road',
    'Shahbaz Town',
  ],
  sialkot: [
    'Cantt',
    'Model Town',
    'Citi Housing',
    'Defence Road',
    'Kashmir Road',
    'Rangpura',
  ],
  gujranwala: [
    'Citi Housing',
    'Model Town',
    'Peoples Colony',
    'Master City',
    'Wapda Town',
    'DC Colony',
    'Satellite Town',
  ],
  hyderabad: [
    'Latifabad',
    'Qasimabad',
    'Cantt',
    'Auto Bhan Road',
    'Citizen Colony',
    'Hirabad',
  ],
  bahawalpur: [
    'Model Town A',
    'Model Town B',
    'Satellite Town',
    'Cantt',
    'University Road',
  ],
  sargodha: [
    'Satellite Town',
    'University Road',
    'Cantt',
    'Civil Lines',
    'Queens Road',
  ],
  abbottabad: [
    'Jinnahabad',
    'Supply',
    'Mandian',
    'PMA Road',
    'Habibullah Colony',
  ],
  sukkur: [
    'Military Road',
    'Barrage Colony',
    'New Sukkur',
    'Minara Road',
  ],
  mardan: [
    'Sheikh Maltoon Town',
    'Cantt',
    'Nowshera Road',
    'Baghdada',
  ],
  gujrat: [
    'Model Town',
    'Bhimber Road',
    'GT Road',
    'Shadman Colony',
  ],
};

// Runtime cache for dynamic DB cities & areas
let dynamicCitiesCache: CityOption[] = [...PAKISTAN_CITIES_LIST];
const dynamicAreasCache: Record<string, string[]> = { ...INITIAL_CITY_AREAS };

export function getSupportedCitiesSync(): CityOption[] {
  return dynamicCitiesCache;
}

export async function fetchSupportedCities(): Promise<CityOption[]> {
  if (!isLiveSupabaseConfigured()) {
    return dynamicCitiesCache;
  }
  try {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (!error && data && data.length > 0) {
      const mergedMap = new Map<string, CityOption>();
      for (const c of PAKISTAN_CITIES_LIST) {
        mergedMap.set(c.id.toLowerCase(), c);
      }
      for (const row of data) {
        const id = (row.id || row.name.toLowerCase().replace(/\s+/g, '-')).toLowerCase();
        mergedMap.set(id, {
          id,
          name: row.name,
          province: row.province || '',
          country: row.country || 'Pakistan',
          lat: Number(row.lat) || 31.5204,
          lng: Number(row.lng) || 74.3587,
          is_active: row.is_active !== false,
        });
      }
      dynamicCitiesCache = Array.from(mergedMap.values());
    }
  } catch {
    // Fallback to static list
  }
  return dynamicCitiesCache;
}

export function getAreasForCitySync(cityIdOrName: string): string[] {
  if (!cityIdOrName) return [];
  const cityObj = getCityById(cityIdOrName) || getCityByName(cityIdOrName);
  const key = (cityObj?.id || cityIdOrName).toLowerCase().trim();
  return dynamicAreasCache[key] || [];
}

export async function fetchAreasForCity(cityIdOrName: string): Promise<string[]> {
  const cityObj = getCityById(cityIdOrName) || getCityByName(cityIdOrName);
  const key = (cityObj?.id || cityIdOrName).toLowerCase().trim();
  const baseAreas = dynamicAreasCache[key] || [];

  if (!isLiveSupabaseConfigured()) {
    return baseAreas;
  }

  try {
    const { data, error } = await supabase
      .from('city_areas')
      .select('name')
      .eq('city_id', key)
      .order('name', { ascending: true });

    if (!error && data && data.length > 0) {
      const merged = Array.from(new Set([...baseAreas, ...data.map((d: any) => d.name)]));
      dynamicAreasCache[key] = merged;
      return merged;
    }
  } catch {
    // Fallback to initial areas
  }
  return baseAreas;
}

// ============================================================
// PAKISTANI PHONE NUMBER VALIDATION & NORMALIZATION (+92)
// ============================================================

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string; // e.g. '+923001234567'
  formatted: string;  // e.g. '+92 300 1234567'
  error?: string;
}

export function validatePakistanPhone(input: string): PhoneValidationResult {
  if (!input || !input.trim()) {
    return {
      isValid: false,
      normalized: '',
      formatted: '',
      error: 'Mobile phone number is required.',
    };
  }

  const raw = input.trim();

  // Reject foreign country codes explicitly (e.g. +1, +44, +971)
  if (raw.startsWith('+') && !raw.startsWith('+92')) {
    return {
      isValid: false,
      normalized: raw,
      formatted: raw,
      error: 'Only Pakistani mobile numbers (+92) are supported.',
    };
  }

  // Strip spaces, hyphens, parentheses
  let cleaned = raw.replace(/[\s\-\(\)\.]/g, '');

  if (cleaned.startsWith('0092')) {
    cleaned = '+92' + cleaned.slice(4);
  } else if (cleaned.startsWith('+9203')) {
    // Common user entry: +92 0300 1234567 -> strip leading 0 after +92
    cleaned = '+92' + cleaned.slice(4);
  } else if (cleaned.startsWith('9203') && cleaned.length === 13) {
    cleaned = '+92' + cleaned.slice(3);
  } else if (cleaned.startsWith('923') && cleaned.length === 12) {
    cleaned = '+' + cleaned;
  } else if (cleaned.startsWith('03') && cleaned.length === 11) {
    cleaned = '+92' + cleaned.slice(1);
  } else if (cleaned.startsWith('3') && cleaned.length === 10) {
    cleaned = '+92' + cleaned;
  }

  if (!cleaned.startsWith('+92')) {
    return {
      isValid: false,
      normalized: cleaned,
      formatted: raw,
      error: 'Phone number must start with +92 or 03 (e.g. +92 300 1234567).',
    };
  }

  // Valid Pakistani mobile prefixes start with 3 (e.g. 300-359) followed by 7 digits = 10 digits after +92
  const pkMobileRegex = /^\+92(3[0-5]\d)(\d{7})$/;
  const match = cleaned.match(pkMobileRegex);

  if (!match) {
    return {
      isValid: false,
      normalized: cleaned,
      formatted: raw,
      error: 'Enter a valid 10-digit Pakistani mobile number after +92 (e.g. +92 300 1234567).',
    };
  }

  const operatorCode = match[1];
  const subscriberNumber = match[2];
  const normalized = `+92${operatorCode}${subscriberNumber}`;
  const formatted = `+92 ${operatorCode} ${subscriberNumber}`;

  return {
    isValid: true,
    normalized,
    formatted,
  };
}

export function formatPakistanPhoneDisplay(phone?: string): string {
  if (!phone) return '';
  const res = validatePakistanPhone(phone);
  return res.isValid ? res.formatted : phone;
}

// ============================================================
// ADDRESS FORMATTING & SNAPSHOT HELPERS
// ============================================================

export function formatFullAddress(addr: Partial<UserAddress | DeliveryAddressSnapshot>): string {
  const house = (addr as UserAddress).house_number || (addr as UserAddress).house_no || '';
  const street = addr.street || '';
  const block = addr.block_or_phase || '';
  const area = addr.area || '';
  const city = (addr as UserAddress).city_name || (addr as UserAddress).city || '';
  const landmark = addr.landmark ? `Near ${addr.landmark.replace(/^Near\s+/i, '')}` : '';

  return [house, street, block, area, city, landmark]
    .map((s) => (s || '').trim())
    .filter(Boolean)
    .join(', ');
}

export function createAddressSnapshot(addr: UserAddress): DeliveryAddressSnapshot {
  const cityObj = getCityById(addr.city_id || addr.city) || getCityByName(addr.city_name || addr.city);
  const cityId = addr.city_id || cityObj?.id || (addr.city_name || addr.city || '').toLowerCase().trim();
  const cityName = addr.city_name || addr.city || cityObj?.name || '';
  const houseNumber = addr.house_number || addr.house_no || '';
  const phoneVal = validatePakistanPhone(addr.phone_number || addr.phone || '');

  const snapshot: DeliveryAddressSnapshot = {
    address_id: addr.id,
    label: addr.label || 'Home',
    recipient_name: (addr.recipient_name || '').trim(),
    phone_number: phoneVal.isValid ? phoneVal.normalized : (addr.phone_number || addr.phone || '').trim(),
    country_code: '+92',
    house_number: houseNumber.trim(),
    street: (addr.street || '').trim(),
    block_or_phase: (addr.block_or_phase || '').trim(),
    area: (addr.area || '').trim(),
    city_id: cityId,
    city_name: cityName,
    landmark: (addr.landmark || '').trim(),
    delivery_instructions: (addr.delivery_instructions || addr.delivery_notes || '').trim(),
    latitude: typeof addr.latitude === 'number' ? addr.latitude : (typeof addr.lat === 'number' ? addr.lat : null),
    longitude: typeof addr.longitude === 'number' ? addr.longitude : (typeof addr.lng === 'number' ? addr.lng : null),
    formatted_address: '',
  };

  snapshot.formatted_address = formatFullAddress(snapshot);
  return snapshot;
}

export function normalizeAddressRecord(raw: any, fallbackUserId?: string): UserAddress {
  const cityObj =
    getCityById(raw.city_id || raw.city || '') ||
    getCityByName(raw.city_name || raw.city || '');
  const cityId = (raw.city_id || cityObj?.id || (raw.city_name || raw.city || '')).toLowerCase().trim();
  const cityName = raw.city_name || cityObj?.name || raw.city || '';
  const houseNumber = raw.house_number ?? raw.house_no ?? '';
  const phoneRaw = raw.phone_number ?? raw.phone ?? '';
  const phoneCheck = validatePakistanPhone(phoneRaw);
  const normalizedPhone = phoneCheck.isValid ? phoneCheck.normalized : phoneRaw;
  const instructions = raw.delivery_instructions ?? raw.delivery_notes ?? '';

  const lat =
    raw.latitude !== undefined && raw.latitude !== null
      ? Number(raw.latitude)
      : raw.lat !== undefined && raw.lat !== null
      ? Number(raw.lat)
      : null;
  const lng =
    raw.longitude !== undefined && raw.longitude !== null
      ? Number(raw.longitude)
      : raw.lng !== undefined && raw.lng !== null
      ? Number(raw.lng)
      : null;

  return {
    id: raw.id || `addr-${Date.now()}`,
    user_id: raw.user_id || fallbackUserId,
    label: raw.label || 'Home',
    recipient_name: raw.recipient_name || '',
    phone_number: normalizedPhone,
    country_code: raw.country_code || '+92',
    city_id: cityId,
    city_name: cityName,
    area: raw.area || '',
    house_number: houseNumber,
    street: raw.street || '',
    block_or_phase: raw.block_or_phase || '',
    landmark: raw.landmark || '',
    delivery_instructions: instructions,
    latitude: !isNaN(Number(lat)) && lat !== null ? Number(lat) : null,
    longitude: !isNaN(Number(lng)) && lng !== null ? Number(lng) : null,
    is_default: Boolean(raw.is_default),
    created_at: raw.created_at || new Date().toISOString(),
    updated_at: raw.updated_at || new Date().toISOString(),
    // Backward-compatible aliases
    house_no: houseNumber,
    city: cityName,
    phone: normalizedPhone,
    delivery_notes: instructions,
    lat: !isNaN(Number(lat)) && lat !== null ? Number(lat) : undefined,
    lng: !isNaN(Number(lng)) && lng !== null ? Number(lng) : undefined,
  };
}

// ============================================================
// INPUT VALIDATION FOR SAVING ADDRESS
// ============================================================

export interface AddressInputPayload {
  label: string;
  recipient_name: string;
  phone_number: string;
  city_id?: string;
  city_name: string;
  area: string;
  house_number: string;
  street: string;
  block_or_phase?: string;
  landmark?: string;
  delivery_instructions?: string;
  latitude?: number | null;
  longitude?: number | null;
  is_default?: boolean;
}

export function validateAddressPayload(
  payload: AddressInputPayload
): { isValid: boolean; errors: Record<string, string>; normalizedPhone?: string } {
  const errors: Record<string, string> = {};

  if (!payload.recipient_name || payload.recipient_name.trim().length < 2) {
    errors.recipient_name = 'Recipient full name is required (at least 2 characters).';
  }

  const phoneValidation = validatePakistanPhone(payload.phone_number);
  if (!phoneValidation.isValid) {
    errors.phone_number = phoneValidation.error || 'Invalid Pakistani mobile number.';
  }

  if (!payload.city_name || !payload.city_name.trim()) {
    errors.city_name = 'City is required.';
  }

  if (!payload.area || payload.area.trim().length < 2) {
    errors.area = 'Area / Sector / Locality is required.';
  }

  if (!payload.house_number || !payload.house_number.trim()) {
    errors.house_number = 'House, Flat, or Building number is required.';
  }

  if (!payload.street || !payload.street.trim()) {
    errors.street = 'Street or Road name/number is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalizedPhone: phoneValidation.normalized,
  };
}

// ============================================================
// RESTAURANT DELIVERY COVERAGE & AVAILABILITY CHECK
// ============================================================

export interface DeliveryCoverageResult {
  canDeliver: boolean;
  meetsMinOrder: boolean;
  isRestaurantOpen: boolean;
  cityMatches: boolean;
  distanceKm: number | null;
  maxRadiusKm: number;
  deliveryFee: number;
  minOrder: number;
  shortfallAmount: number;
  estimatedTime: string;
  errorMessage?: string;
  coverageNote: string;
}

function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

export function verifyDeliveryCoverage(
  restaurant: Restaurant | null | undefined,
  address: UserAddress | DeliveryAddressSnapshot | null | undefined,
  cartSubtotal: number
): DeliveryCoverageResult {
  const maxRadiusKm = 22; // Standard city-wide delivery zone in km

  if (!restaurant) {
    return {
      canDeliver: false,
      meetsMinOrder: false,
      isRestaurantOpen: false,
      cityMatches: false,
      distanceKm: null,
      maxRadiusKm,
      deliveryFee: 0,
      minOrder: 0,
      shortfallAmount: 0,
      estimatedTime: 'N/A',
      errorMessage: 'Restaurant information is unavailable.',
      coverageNote: 'Restaurant unavailable',
    };
  }

  const deliveryFee = restaurant.delivery_fee ?? 2.99;
  const minOrder = restaurant.min_order ?? 0;
  const estimatedTime = `${restaurant.delivery_time_min || 25}–${restaurant.delivery_time_max || 35} mins`;
  const shortfallAmount = Math.max(0, Number((minOrder - cartSubtotal).toFixed(2)));
  const meetsMinOrder = cartSubtotal >= minOrder;

  if (!restaurant.is_open) {
    return {
      canDeliver: false,
      meetsMinOrder,
      isRestaurantOpen: false,
      cityMatches: false,
      distanceKm: null,
      maxRadiusKm,
      deliveryFee,
      minOrder,
      shortfallAmount,
      estimatedTime,
      errorMessage: `${restaurant.name} is currently closed and not accepting orders.`,
      coverageNote: 'Kitchen closed',
    };
  }

  if (!address) {
    return {
      canDeliver: false,
      meetsMinOrder,
      isRestaurantOpen: true,
      cityMatches: false,
      distanceKm: null,
      maxRadiusKm,
      deliveryFee,
      minOrder,
      shortfallAmount,
      estimatedTime,
      errorMessage: 'Please select or add a delivery address to continue.',
      coverageNote: 'Select delivery address',
    };
  }

  const restCityObj = getCityById(restaurant.city_id || '') || getCityByName(restaurant.city || '');
  const restCityId = (restaurant.city_id || restCityObj?.id || restaurant.city || '').toLowerCase().trim();
  const restCityName = restCityObj?.name || restaurant.city || 'Restaurant City';

  const addrCityRaw = (address as UserAddress).city_id || (address as UserAddress).city_name || (address as UserAddress).city || '';
  const addrCityObj = getCityById(addrCityRaw) || getCityByName((address as UserAddress).city_name || (address as UserAddress).city || addrCityRaw);
  const addrCityId = (addrCityObj?.id || addrCityRaw).toLowerCase().trim();
  const addrCityName = (address as UserAddress).city_name || (address as UserAddress).city || addrCityObj?.name || 'Selected City';

  const cityMatches = Boolean(restCityId && addrCityId && restCityId === addrCityId);

  if (!cityMatches) {
    return {
      canDeliver: false,
      meetsMinOrder,
      isRestaurantOpen: true,
      cityMatches: false,
      distanceKm: null,
      maxRadiusKm,
      deliveryFee,
      minOrder,
      shortfallAmount,
      estimatedTime,
      errorMessage: `${restaurant.name} only delivers within ${restCityName}. Your selected address is in ${addrCityName}. Please select or add an address in ${restCityName}.`,
      coverageNote: `Out of coverage (${restCityName} only)`,
    };
  }

  // Check coordinate distance if both restaurant and address have valid coordinates
  let distanceKm: number | null = null;
  const addrLat = (address as UserAddress).latitude ?? (address as UserAddress).lat ?? null;
  const addrLng = (address as UserAddress).longitude ?? (address as UserAddress).lng ?? null;

  if (
    typeof addrLat === 'number' &&
    typeof addrLng === 'number' &&
    typeof restaurant.lat === 'number' &&
    typeof restaurant.lng === 'number'
  ) {
    const computedDist = calculateHaversineKm(restaurant.lat, restaurant.lng, addrLat, addrLng);
    // Only enforce radius if coordinates actually fall within ~50km of the city center
    if (computedDist <= 50) {
      distanceKm = computedDist;
      if (distanceKm > maxRadiusKm) {
        return {
          canDeliver: false,
          meetsMinOrder,
          isRestaurantOpen: true,
          cityMatches: true,
          distanceKm,
          maxRadiusKm,
          deliveryFee,
          minOrder,
          shortfallAmount,
          estimatedTime,
          errorMessage: `Selected location is ${distanceKm} km away from ${restaurant.name}, which exceeds their ${maxRadiusKm} km delivery zone in ${restCityName}.`,
          coverageNote: `Beyond ${maxRadiusKm} km delivery radius`,
        };
      }
    }
  }

  if (!meetsMinOrder) {
    return {
      canDeliver: false,
      meetsMinOrder: false,
      isRestaurantOpen: true,
      cityMatches: true,
      distanceKm,
      maxRadiusKm,
      deliveryFee,
      minOrder,
      shortfallAmount,
      estimatedTime,
      errorMessage: `Minimum order for ${restaurant.name} is Rs. ${minOrder.toFixed(2)}. Please add Rs. ${shortfallAmount.toFixed(2)} more to place your order.`,
      coverageNote: `Min. order Rs. ${minOrder.toFixed(2)} required`,
    };
  }

  return {
    canDeliver: true,
    meetsMinOrder: true,
    isRestaurantOpen: true,
    cityMatches: true,
    distanceKm,
    maxRadiusKm,
    deliveryFee,
    minOrder,
    shortfallAmount: 0,
    estimatedTime,
    coverageNote: `Delivers to ${address.area ? `${address.area}, ` : ''}${addrCityName} (${estimatedTime})`,
  };
}

// ============================================================
// PER-USER ISOLATED STORAGE & SUPABASE CRUD OPERATIONS
// ============================================================

const getAddressStorageKey = (userId: string) => `cravedrop_addresses_${userId}`;

function isDemoOrLegacyAddress(addr: any): boolean {
  const street = (addr.street || '').toLowerCase();
  const city = (addr.city || addr.city_name || '').toLowerCase();
  const phone = (addr.phone || addr.phone_number || '').toLowerCase();
  if (
    city === 'metropolis' ||
    street.includes('riverside crescent') ||
    phone.includes('+1 555') ||
    phone.includes('+1555')
  ) {
    return true;
  }
  return false;
}

export function getLocalUserAddresses(userId: string, fallbackAddresses?: UserAddress[]): UserAddress[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(getAddressStorageKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw) as any[];
      const valid = parsed
        .filter((a) => !isDemoOrLegacyAddress(a) && (!a.user_id || a.user_id === userId))
        .map((a) => normalizeAddressRecord(a, userId));
      return ensureConsistentDefault(valid);
    }

    if (fallbackAddresses && fallbackAddresses.length > 0) {
      const cleaned = fallbackAddresses
        .filter((a) => !isDemoOrLegacyAddress(a) && (!a.user_id || a.user_id === userId))
        .map((a) => normalizeAddressRecord(a, userId));
      const consistent = ensureConsistentDefault(cleaned);
      localStorage.setItem(getAddressStorageKey(userId), JSON.stringify(consistent));
      return consistent;
    }
  } catch {
    // Ignore storage read error
  }
  return [];
}

function saveLocalUserAddresses(userId: string, addresses: UserAddress[]): UserAddress[] {
  if (!userId) return [];
  const consistent = ensureConsistentDefault(
    addresses.map((a) => normalizeAddressRecord(a, userId))
  );
  try {
    localStorage.setItem(getAddressStorageKey(userId), JSON.stringify(consistent));
  } catch {
    // Ignore storage write error
  }
  return consistent;
}

function ensureConsistentDefault(addresses: UserAddress[]): UserAddress[] {
  if (addresses.length === 0) return [];
  const defaultIdx = addresses.findIndex((a) => a.is_default);
  return addresses.map((addr, idx) => ({
    ...addr,
    is_default: defaultIdx === -1 ? idx === 0 : idx === defaultIdx,
  }));
}

export async function fetchUserAddresses(
  userId: string,
  fallbackProfileAddresses?: UserAddress[]
): Promise<UserAddress[]> {
  if (!userId) return [];

  const local = getLocalUserAddresses(userId, fallbackProfileAddresses);

  if (!isLiveSupabaseConfigured() || !IS_UUID.test(userId)) {
    return local;
  }

  try {
    const { data, error } = await supabase
      .from('delivery_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      if (data.length > 0) {
        const mapped = data.map((row: any) => normalizeAddressRecord(row, userId));
        return saveLocalUserAddresses(userId, mapped);
      }
    }
  } catch {
    // Fallback to local cache
  }

  return local;
}

export async function saveUserAddress(
  requestingUserId: string,
  payload: AddressInputPayload,
  existingAddressId?: string
): Promise<{
  success: boolean;
  address?: UserAddress;
  addresses?: UserAddress[];
  error?: string;
  fieldErrors?: Record<string, string>;
}> {
  if (!requestingUserId) {
    return { success: false, error: 'You must be signed in to save a delivery address.' };
  }

  const validation = validateAddressPayload(payload);
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0] || 'Please check the required address fields.';
    return {
      success: false,
      error: firstError,
      fieldErrors: validation.errors,
    };
  }

  const currentList = getLocalUserAddresses(requestingUserId);

  // If editing an existing address, verify ownership strictly
  if (existingAddressId) {
    const existing = currentList.find((a) => a.id === existingAddressId);
    if (!existing || (existing.user_id && existing.user_id !== requestingUserId)) {
      return {
        success: false,
        error: 'Unauthorized: You cannot modify another user\'s saved address.',
      };
    }
  }

  const cityObj = getCityById(payload.city_id || '') || getCityByName(payload.city_name);
  const resolvedCityId = (payload.city_id || cityObj?.id || payload.city_name.toLowerCase().replace(/\s+/g, '-')).toLowerCase().trim();
  const resolvedCityName = cityObj?.name || payload.city_name.trim();
  const normalizedPhone = validation.normalizedPhone!;
  const isDefault = Boolean(payload.is_default || currentList.length === 0);
  const nowIso = new Date().toISOString();

  let recordId = existingAddressId || `addr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Sync with Supabase if configured and userId is UUID
  if (isLiveSupabaseConfigured() && IS_UUID.test(requestingUserId)) {
    try {
      const dbRow: any = {
        user_id: requestingUserId,
        label: (payload.label || 'Home').trim(),
        recipient_name: payload.recipient_name.trim(),
        phone_number: normalizedPhone,
        country_code: '+92',
        city_id: resolvedCityId,
        city_name: resolvedCityName,
        area: payload.area.trim(),
        house_number: payload.house_number.trim(),
        street: payload.street.trim(),
        block_or_phase: (payload.block_or_phase || '').trim(),
        landmark: (payload.landmark || '').trim(),
        delivery_instructions: (payload.delivery_instructions || '').trim(),
        latitude: typeof payload.latitude === 'number' ? payload.latitude : null,
        longitude: typeof payload.longitude === 'number' ? payload.longitude : null,
        is_default: isDefault,
        updated_at: nowIso,
      };

      if (existingAddressId && IS_UUID.test(existingAddressId)) {
        const { data, error } = await supabase
          .from('delivery_addresses')
          .update(dbRow)
          .eq('id', existingAddressId)
          .eq('user_id', requestingUserId)
          .select()
          .maybeSingle();

        if (!error && data) {
          recordId = data.id;
        }
      } else if (!existingAddressId) {
        const { data, error } = await supabase
          .from('delivery_addresses')
          .insert(dbRow)
          .select()
          .maybeSingle();

        if (!error && data) {
          recordId = data.id;
        }
      }
    } catch (err) {
      console.warn('[AddressService] Supabase sync warning:', err);
    }
  }

  const savedRecord = normalizeAddressRecord(
    {
      id: recordId,
      user_id: requestingUserId,
      label: (payload.label || 'Home').trim(),
      recipient_name: payload.recipient_name.trim(),
      phone_number: normalizedPhone,
      country_code: '+92',
      city_id: resolvedCityId,
      city_name: resolvedCityName,
      area: payload.area.trim(),
      house_number: payload.house_number.trim(),
      street: payload.street.trim(),
      block_or_phase: (payload.block_or_phase || '').trim(),
      landmark: (payload.landmark || '').trim(),
      delivery_instructions: (payload.delivery_instructions || '').trim(),
      latitude: typeof payload.latitude === 'number' ? payload.latitude : null,
      longitude: typeof payload.longitude === 'number' ? payload.longitude : null,
      is_default: isDefault,
      created_at: nowIso,
      updated_at: nowIso,
    },
    requestingUserId
  );

  let nextAddresses: UserAddress[];
  if (existingAddressId) {
    nextAddresses = currentList.map((a) => {
      if (a.id === existingAddressId) return savedRecord;
      return isDefault ? { ...a, is_default: false } : a;
    });
  } else {
    nextAddresses = [
      ...(isDefault ? currentList.map((a) => ({ ...a, is_default: false })) : currentList),
      savedRecord,
    ];
  }

  const finalAddresses = saveLocalUserAddresses(requestingUserId, nextAddresses);
  const finalSaved = finalAddresses.find((a) => a.id === savedRecord.id) || savedRecord;

  return {
    success: true,
    address: finalSaved,
    addresses: finalAddresses,
  };
}

export async function deleteUserAddress(
  requestingUserId: string,
  addressId: string,
  targetOwnerId?: string
): Promise<{ success: boolean; addresses?: UserAddress[]; error?: string }> {
  if (!requestingUserId) {
    return { success: false, error: 'Authentication required.' };
  }

  if (targetOwnerId && targetOwnerId !== requestingUserId) {
    return {
      success: false,
      error: 'Unauthorized: You cannot delete another user\'s saved address.',
    };
  }

  const currentList = getLocalUserAddresses(requestingUserId);
  const target = currentList.find((a) => a.id === addressId);
  if (!target) {
    return {
      success: false,
      error: 'Address not found or you do not have permission to delete it.',
    };
  }

  if (target.user_id && target.user_id !== requestingUserId) {
    return {
      success: false,
      error: 'Unauthorized: You cannot delete another user\'s saved address.',
    };
  }

  if (isLiveSupabaseConfigured() && IS_UUID.test(requestingUserId) && IS_UUID.test(addressId)) {
    try {
      await supabase
        .from('delivery_addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', requestingUserId);
    } catch (err) {
      console.warn('[AddressService] Supabase delete warning:', err);
    }
  }

  const remaining = currentList.filter((a) => a.id !== addressId);
  const finalAddresses = saveLocalUserAddresses(requestingUserId, remaining);

  return {
    success: true,
    addresses: finalAddresses,
  };
}

export async function setDefaultUserAddress(
  requestingUserId: string,
  addressId: string
): Promise<{ success: boolean; addresses?: UserAddress[]; error?: string }> {
  if (!requestingUserId) {
    return { success: false, error: 'Authentication required.' };
  }

  const currentList = getLocalUserAddresses(requestingUserId);
  const target = currentList.find((a) => a.id === addressId);
  if (!target) {
    return { success: false, error: 'Address not found.' };
  }

  if (target.user_id && target.user_id !== requestingUserId) {
    return { success: false, error: 'Unauthorized access.' };
  }

  if (isLiveSupabaseConfigured() && IS_UUID.test(requestingUserId) && IS_UUID.test(addressId)) {
    try {
      await supabase
        .from('delivery_addresses')
        .update({ is_default: false })
        .eq('user_id', requestingUserId);

      await supabase
        .from('delivery_addresses')
        .update({ is_default: true })
        .eq('id', addressId)
        .eq('user_id', requestingUserId);
    } catch (err) {
      console.warn('[AddressService] Supabase set default warning:', err);
    }
  }

  const updated = currentList.map((a) => ({
    ...a,
    is_default: a.id === addressId,
  }));

  const finalAddresses = saveLocalUserAddresses(requestingUserId, updated);
  return {
    success: true,
    addresses: finalAddresses,
  };
}
