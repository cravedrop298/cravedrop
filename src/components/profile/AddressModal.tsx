import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal';
import { UserAddress, CityOption } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  getSupportedCitiesSync,
  fetchSupportedCities,
  getAreasForCitySync,
  fetchAreasForCity,
  validatePakistanPhone,
  validateAddressPayload,
  saveUserAddress,
} from '../../services/addressService';
import L from 'leaflet';
import {
  MapPin,
  Home,
  Briefcase,
  Navigation,
  CheckCircle2,
  Compass,
  Plus,
  Minus,
  Check,
  Search,
  Loader2,
  AlertTriangle,
  User as UserIcon,
  Phone,
  Building2,
} from 'lucide-react';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (address: UserAddress, saveToAddressBook?: boolean) => void;
  initialAddress?: UserAddress | null;
  autoTriggerGps?: boolean;
  preferredCity?: string;
}

export const AddressModal: React.FC<AddressModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialAddress,
  autoTriggerGps = false,
  preferredCity,
}) => {
  const { user } = useAuth();

  // Cities & Areas catalog (loaded from static + Supabase DB)
  const [cities, setCities] = useState<CityOption[]>(() => getSupportedCitiesSync());
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);
  const [showAreaSuggestions, setShowAreaSuggestions] = useState(false);

  // Form fields
  const [label, setLabel] = useState<'Home' | 'Work' | 'Other' | string>('Home');
  const [customLabel, setCustomLabel] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [street, setStreet] = useState('');
  const [blockOrPhase, setBlockOrPhase] = useState('');
  const [landmark, setLandmark] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [saveToAddressBook, setSaveToAddressBook] = useState(true);
  const [isDefault, setIsDefault] = useState(false);

  // Validation & Submission state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Real Map & Geolocation state
  const [mapLat, setMapLat] = useState(31.5204);
  const [mapLng, setMapLng] = useState(74.3587);
  const [hasValidCoordinates, setHasValidCoordinates] = useState(false);
  const [isPinConfirmed, setIsPinConfirmed] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState('');
  const [locationErrorMsg, setLocationErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Leaflet refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);

  // Load dynamic cities from Supabase on open
  useEffect(() => {
    if (!isOpen) return;
    fetchSupportedCities().then(setCities);
  }, [isOpen]);

  // Load areas when selected city changes
  useEffect(() => {
    if (!city) {
      setAvailableAreas([]);
      return;
    }
    setAvailableAreas(getAreasForCitySync(city));
    fetchAreasForCity(city).then(setAvailableAreas);
  }, [city]);

  // Initialize form state when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const defaultUserCity = preferredCity || user?.city || user?.location?.city || 'Lahore';
    const cityMatch =
      cities.find((c) => c.name.toLowerCase() === defaultUserCity.toLowerCase()) ||
      cities[0];

    if (initialAddress) {
      const initLabel = initialAddress.label || 'Home';
      if (['Home', 'Work', 'Work / Office', 'Other'].includes(initLabel)) {
        setLabel(initLabel === 'Work / Office' ? 'Work' : initLabel);
        setCustomLabel('');
      } else {
        setLabel('Other');
        setCustomLabel(initLabel);
      }

      setRecipientName(
        initialAddress.recipient_name || user?.full_name || user?.name || ''
      );
      setPhoneNumber(
        initialAddress.phone_number || initialAddress.phone || user?.phone || ''
      );
      setCity(initialAddress.city_name || initialAddress.city || cityMatch?.name || 'Lahore');
      setArea(initialAddress.area || '');
      setHouseNumber(initialAddress.house_number || initialAddress.house_no || '');
      setStreet(initialAddress.street || '');
      setBlockOrPhase(initialAddress.block_or_phase || '');
      setLandmark(initialAddress.landmark || '');
      setDeliveryInstructions(
        initialAddress.delivery_instructions || initialAddress.delivery_notes || ''
      );
      setIsDefault(Boolean(initialAddress.is_default));
      setSaveToAddressBook(true);

      const lat = initialAddress.latitude ?? initialAddress.lat;
      const lng = initialAddress.longitude ?? initialAddress.lng;
      if (typeof lat === 'number' && typeof lng === 'number') {
        setMapLat(lat);
        setMapLng(lng);
        setHasValidCoordinates(true);
        setIsPinConfirmed(true);
      } else {
        setMapLat(cityMatch?.lat || 31.5204);
        setMapLng(cityMatch?.lng || 74.3587);
        setHasValidCoordinates(false);
        setIsPinConfirmed(false);
      }
    } else {
      setLabel('Home');
      setCustomLabel('');
      setRecipientName(user?.full_name || user?.name || '');
      setPhoneNumber(user?.phone || '');
      setCity(cityMatch?.name || 'Lahore');
      setArea('');
      setHouseNumber('');
      setStreet('');
      setBlockOrPhase('');
      setLandmark('');
      setDeliveryInstructions('');
      setSaveToAddressBook(true);
      setIsDefault((user?.addresses || []).length === 0);
      setMapLat(cityMatch?.lat || 31.5204);
      setMapLng(cityMatch?.lng || 74.3587);
      setHasValidCoordinates(false);
      setIsPinConfirmed(false);
    }

    setFieldErrors({});
    setFormError('');
    setLocationSuccessMsg('');
    setLocationErrorMsg('');
    setSearchQuery('');
  }, [initialAddress, isOpen, user, preferredCity]);

  // Auto-trigger GPS if opened via "Use Current Location / Map Pin"
  useEffect(() => {
    if (isOpen && autoTriggerGps && !initialAddress) {
      const timer = setTimeout(() => {
        handleUseCurrentLocation();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoTriggerGps, initialAddress]);

  const createPinIcon = () => {
    return L.divIcon({
      className: 'cravedrop-map-pin',
      html: `
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: #E24B36;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(226, 75, 54, 0.45);
          border: 3px solid #FFFFFF;
          color: white;
          cursor: grab;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });
  };

  // Real Reverse Geocoding via OpenStreetMap Nominatim API
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      setIsDetectingLocation(true);
      setLocationErrorMsg('');

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );

      if (!response.ok) throw new Error('Reverse geocoding response failed');

      const data = await response.json();

      if (data && data.address) {
        const addr = data.address;

        const road =
          addr.road ||
          addr.pedestrian ||
          addr.street ||
          addr.highway ||
          addr.path ||
          addr.footway ||
          '';

        const areaName =
          addr.suburb ||
          addr.neighbourhood ||
          addr.quarter ||
          addr.residential ||
          addr.district ||
          addr.county ||
          '';

        const cityName =
          addr.city ||
          addr.town ||
          addr.municipality ||
          addr.state_district ||
          addr.state ||
          '';

        const houseNo = addr.house_number || addr.building || '';
        const landmarkName =
          addr.amenity || addr.shop || addr.tourism || addr.leisure || '';

        if (road) setStreet(road);
        if (areaName) setArea(areaName);
        if (houseNo && !houseNumber) setHouseNumber(`House / Building ${houseNo}`);
        if (landmarkName && !landmark) setLandmark(landmarkName);

        // Auto-match supported Pakistani city
        const matchedCity = cities.find(
          (c) =>
            cityName.toLowerCase().includes(c.name.toLowerCase()) ||
            (data.display_name &&
              data.display_name.toLowerCase().includes(c.name.toLowerCase()))
        );

        if (matchedCity) {
          setCity(matchedCity.name);
        }

        const summary = [road, areaName, matchedCity?.name || cityName]
          .filter(Boolean)
          .join(', ');
        setLocationSuccessMsg(
          `Pin placed at ${summary || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}. Adjust pin if needed and confirm.`
        );
      }
    } catch {
      setLocationSuccessMsg(
        `Pin placed at (${lat.toFixed(4)}, ${lng.toFixed(4)}). Please complete your house and street details below.`
      );
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Initialize & render Leaflet map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [mapLat, mapLng],
          zoom: 15,
          zoomControl: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap',
        }).addTo(map);

        const marker = L.marker([mapLat, mapLng], {
          icon: createPinIcon(),
          draggable: true,
        }).addTo(map);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          const lat = Number(pos.lat.toFixed(5));
          const lng = Number(pos.lng.toFixed(5));
          setMapLat(lat);
          setMapLng(lng);
          setHasValidCoordinates(true);
          setIsPinConfirmed(false);
          reverseGeocode(lat, lng);
        });

        map.on('click', (e: L.LeafletMouseEvent) => {
          const lat = Number(e.latlng.lat.toFixed(5));
          const lng = Number(e.latlng.lng.toFixed(5));
          marker.setLatLng([lat, lng]);
          setMapLat(lat);
          setMapLng(lng);
          setHasValidCoordinates(true);
          setIsPinConfirmed(false);
          reverseGeocode(lat, lng);
        });

        mapInstanceRef.current = map;
        markerInstanceRef.current = marker;
      } else {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.setView([mapLat, mapLng], 15);
        if (markerInstanceRef.current) {
          markerInstanceRef.current.setLatLng([mapLat, mapLng]);
        }
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current && !isOpen) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  const updateMapPosition = (lat: number, lng: number, zoom = 16) => {
    setMapLat(lat);
    setMapLng(lng);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], zoom, { duration: 1.0 });
    }
    if (markerInstanceRef.current) {
      markerInstanceRef.current.setLatLng([lat, lng]);
    }
  };

  // Handle city change -> recenter map if user hasn't pinned a custom GPS spot yet
  const handleCityChange = (newCityName: string) => {
    setCity(newCityName);
    setArea('');
    setFieldErrors((prev) => ({ ...prev, city_name: '', area: '' }));
    const found = cities.find((c) => c.name.toLowerCase() === newCityName.toLowerCase());
    if (found && !hasValidCoordinates) {
      updateMapPosition(found.lat, found.lng, 13);
    }
  };

  // Real GPS Geolocation Handler
  const handleUseCurrentLocation = () => {
    setIsDetectingLocation(true);
    setLocationSuccessMsg('');
    setLocationErrorMsg('');

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(5));
          const lng = Number(pos.coords.longitude.toFixed(5));
          setHasValidCoordinates(true);
          setIsPinConfirmed(true);
          updateMapPosition(lat, lng, 17);
          reverseGeocode(lat, lng);
        },
        (err) => {
          setIsDetectingLocation(false);
          setHasValidCoordinates(false);
          setIsPinConfirmed(false);
          if (err.code === 1) {
            setLocationErrorMsg(
              'Location permission was denied. Please enter your address manually below, or drag the map pin to your delivery entrance.'
            );
          } else {
            setLocationErrorMsg(
              'GPS signal is currently unavailable on this device. You can search your area on the map or enter your address manually below.'
            );
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setIsDetectingLocation(false);
      setHasValidCoordinates(false);
      setLocationErrorMsg(
        'Geolocation is not supported by your browser. Please enter your delivery address manually below.'
      );
    }
  };

  // Search Location on Map via Nominatim (Pakistan-scoped)
  const handleSearchLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      setLocationErrorMsg('');

      const q = searchQuery.trim().toLowerCase().includes(city.toLowerCase())
        ? `${searchQuery.trim()}, Pakistan`
        : `${searchQuery.trim()}, ${city}, Pakistan`;

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=pk&limit=1&q=${encodeURIComponent(
          q
        )}`,
        {
          headers: { 'Accept-Language': 'en' },
        }
      );

      if (!response.ok) throw new Error('Location search failed');
      const data = await response.json();

      if (data && data.length > 0) {
        const first = data[0];
        const lat = Number(parseFloat(first.lat).toFixed(5));
        const lng = Number(parseFloat(first.lon).toFixed(5));
        setHasValidCoordinates(true);
        setIsPinConfirmed(false);
        updateMapPosition(lat, lng, 17);
        reverseGeocode(lat, lng);
      } else {
        setLocationErrorMsg(
          `Could not find "${searchQuery}" on the map. You can still type your address manually below.`
        );
      }
    } catch {
      setLocationErrorMsg(
        'Map search is temporarily unavailable. Please fill in the address fields manually below.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  // Live phone validation state for UI feedback
  const phoneStatus = phoneNumber.trim() ? validatePakistanPhone(phoneNumber) : null;

  // Filter area suggestions based on user input
  const filteredAreas = availableAreas.filter((a) =>
    !area.trim() ? true : a.toLowerCase().includes(area.trim().toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const finalLabel =
      label === 'Other' && customLabel.trim() ? customLabel.trim() : label;

    const payload = {
      label: finalLabel,
      recipient_name: recipientName.trim(),
      phone_number: phoneNumber.trim(),
      city_name: city.trim(),
      area: area.trim(),
      house_number: houseNumber.trim(),
      street: street.trim(),
      block_or_phase: blockOrPhase.trim(),
      landmark: landmark.trim(),
      delivery_instructions: deliveryInstructions.trim(),
      latitude: hasValidCoordinates ? mapLat : null,
      longitude: hasValidCoordinates ? mapLng : null,
      is_default: isDefault,
    };

    const validation = validateAddressPayload(payload);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setFormError('Please correct the highlighted fields before saving.');
      return;
    }

    setFieldErrors({});
    setIsSaving(true);

    try {
      if (user?.id && saveToAddressBook) {
        const res = await saveUserAddress(user.id, payload, initialAddress?.id);
        if (!res.success || !res.address) {
          setFormError(res.error || 'Failed to save address.');
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
          setIsSaving(false);
          return;
        }
        onSave(res.address, true);
      } else {
        // One-time checkout address without saving to address book
        const tempAddr: UserAddress = {
          id: initialAddress?.id || `addr-temp-${Date.now()}`,
          user_id: user?.id,
          label: finalLabel,
          recipient_name: payload.recipient_name,
          phone_number: validation.normalizedPhone!,
          country_code: '+92',
          city_id: payload.city_name.toLowerCase().replace(/\s+/g, '-'),
          city_name: payload.city_name,
          area: payload.area,
          house_number: payload.house_number,
          street: payload.street,
          block_or_phase: payload.block_or_phase,
          landmark: payload.landmark,
          delivery_instructions: payload.delivery_instructions,
          latitude: payload.latitude,
          longitude: payload.longitude,
          is_default: false,
          house_no: payload.house_number,
          city: payload.city_name,
          phone: validation.normalizedPhone!,
          delivery_notes: payload.delivery_instructions,
          lat: payload.latitude ?? undefined,
          lng: payload.longitude ?? undefined,
        };
        onSave(tempAddr, false);
      }
      onClose();
    } catch {
      setFormError('An unexpected error occurred while saving the address.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialAddress ? 'Edit Delivery Address' : 'Add New Delivery Address'}
      subtitle="Enter your recipient details, Pakistani contact number, and exact location"
      zIndex={1300}
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        {formError && (
          <div
            role="alert"
            style={{
              padding: '10px 12px',
              borderRadius: '12px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              color: '#B91C1C',
              fontSize: '12.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span>{formError}</span>
          </div>
        )}

        {/* ============================================================
            SECTION 1: INTERACTIVE MAP PIN & CURRENT LOCATION (GPS)
            ============================================================ */}
        <div
          style={{
            backgroundColor: '#FAF7F2',
            borderRadius: '16px',
            padding: '12px',
            border: '1px solid #E5DFC9',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Compass size={15} color="#E24B36" />
              <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#1E242B' }}>
                Pin Delivery Entrance on Map (Optional)
              </span>
            </div>
            {hasValidCoordinates && (
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '8px',
                  backgroundColor: isPinConfirmed ? '#DCFCE7' : '#FEF3C7',
                  color: isPinConfirmed ? '#15803D' : '#B45309',
                }}
              >
                {isPinConfirmed ? '✓ Pin Confirmed' : 'Pin Movable'}
              </span>
            )}
          </div>

          {/* Map Search Bar */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '11px',
                color: '#8E99A8',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder={`Search sector, street or landmark in ${city || 'Pakistan'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchLocation();
                }
              }}
              style={{
                width: '100%',
                padding: '9px 74px 9px 34px',
                borderRadius: '10px',
                border: '1px solid #E5DFC9',
                fontSize: '12.5px',
                backgroundColor: '#FFFFFF',
              }}
            />
            <button
              type="button"
              onClick={() => handleSearchLocation()}
              disabled={isSearching}
              style={{
                position: 'absolute',
                right: '5px',
                backgroundColor: '#1E242B',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '7px',
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isSearching ? <Loader2 size={12} /> : 'Find'}
            </button>
          </div>

          {/* Leaflet Map Container */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '175px',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #D8D0BA',
            }}
          >
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

            {/* Zoom Controls */}
            <div
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                zIndex: 10,
              }}
            >
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => mapInstanceRef.current?.zoomIn()}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '7px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5DFC9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => mapInstanceRef.current?.zoomOut()}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '7px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5DFC9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <Minus size={14} />
              </button>
            </div>

            {/* Use Current Location GPS Button */}
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isDetectingLocation}
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '8px',
                right: '8px',
                backgroundColor: '#E24B36',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '9px 12px',
                fontSize: '12px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(226, 75, 54, 0.35)',
                zIndex: 10,
              }}
            >
              <Navigation size={14} />
              <span>
                {isDetectingLocation
                  ? 'Requesting GPS Location...'
                  : 'Use Current Location / GPS Pin'}
              </span>
            </button>
          </div>

          {/* Confirm Pin Location Action when moved */}
          {hasValidCoordinates && !isPinConfirmed && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: '10px',
                backgroundColor: '#FEF7E4',
                border: '1px solid #FCE7B0',
                fontSize: '12px',
              }}
            >
              <span style={{ color: '#92400E', fontWeight: 600 }}>
                Pin at {mapLat.toFixed(4)}, {mapLng.toFixed(4)}
              </span>
              <button
                type="button"
                onClick={() => setIsPinConfirmed(true)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '8px',
                  backgroundColor: '#15803D',
                  color: '#FFFFFF',
                  fontSize: '11.5px',
                  fontWeight: 800,
                }}
              >
                Confirm Pin Location
              </button>
            </div>
          )}

          {locationSuccessMsg && (
            <div
              style={{
                padding: '8px 10px',
                borderRadius: '9px',
                backgroundColor: '#F0FDF4',
                color: '#15803D',
                fontSize: '11.5px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid #BBF7D0',
              }}
            >
              <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
              <span>{locationSuccessMsg}</span>
            </div>
          )}

          {locationErrorMsg && (
            <div
              style={{
                padding: '8px 10px',
                borderRadius: '9px',
                backgroundColor: '#FEF2F2',
                color: '#B91C1C',
                fontSize: '11.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid #FECACA',
              }}
            >
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              <span>{locationErrorMsg}</span>
            </div>
          )}
        </div>

        {/* ============================================================
            SECTION 2: RECIPIENT INFORMATION
            ============================================================ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 800,
              color: '#5A6472',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
            }}
          >
            Recipient Information
          </span>

          {/* Full Name */}
          <div>
            <label
              htmlFor="addr-recipient-name"
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#1E242B',
                marginBottom: '5px',
              }}
            >
              Full Name <span style={{ color: '#E24B36' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <UserIcon
                size={15}
                color="#8E99A8"
                style={{ position: 'absolute', left: '12px', top: '12px' }}
              />
              <input
                id="addr-recipient-name"
                type="text"
                required
                placeholder="Enter recipient's full name"
                value={recipientName}
                onChange={(e) => {
                  setRecipientName(e.target.value);
                  if (fieldErrors.recipient_name) {
                    setFieldErrors((p) => ({ ...p, recipient_name: '' }));
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: '10px',
                  border: `1.5px solid ${
                    fieldErrors.recipient_name ? '#DC2626' : '#E5DFC9'
                  }`,
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>
            {fieldErrors.recipient_name && (
              <p style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px', fontWeight: 600 }}>
                {fieldErrors.recipient_name}
              </p>
            )}
          </div>

          {/* Mobile Phone Number (Pakistan +92 Only) */}
          <div>
            <label
              htmlFor="addr-phone-number"
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#1E242B',
                marginBottom: '5px',
              }}
            >
              Mobile Phone Number (Pakistan +92) <span style={{ color: '#E24B36' }}>*</span>
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  paddingRight: '8px',
                  borderRight: '1px solid #E5DFC9',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  color: '#1E242B',
                  pointerEvents: 'none',
                }}
              >
                <Phone size={13} color="#E24B36" />
                <span>PK</span>
              </div>
              <input
                id="addr-phone-number"
                type="tel"
                required
                placeholder="+92 300 1234567 or 0300 1234567"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  if (fieldErrors.phone_number) {
                    setFieldErrors((p) => ({ ...p, phone_number: '' }));
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 58px',
                  borderRadius: '10px',
                  border: `1.5px solid ${
                    fieldErrors.phone_number
                      ? '#DC2626'
                      : phoneStatus?.isValid
                      ? '#15803D'
                      : '#E5DFC9'
                  }`,
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>
            {fieldErrors.phone_number ? (
              <p style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px', fontWeight: 600 }}>
                {fieldErrors.phone_number}
              </p>
            ) : phoneStatus ? (
              <p
                style={{
                  fontSize: '11px',
                  color: phoneStatus.isValid ? '#15803D' : '#D97706',
                  marginTop: '4px',
                  fontWeight: 600,
                }}
              >
                {phoneStatus.isValid
                  ? `✓ Valid Pakistani Mobile: ${phoneStatus.formatted}`
                  : phoneStatus.error}
              </p>
            ) : (
              <p style={{ fontSize: '11px', color: '#8E99A8', marginTop: '3px' }}>
                Format: +92 3XX XXXXXXX or 03XX XXXXXXX
              </p>
            )}
          </div>
        </div>

        {/* ============================================================
            SECTION 3: ADDRESS INFORMATION (CITY, AREA, HOUSE, STREET)
            ============================================================ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 800,
              color: '#5A6472',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
            }}
          >
            Address Information
          </span>

          {/* City & Area / Sector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label
                htmlFor="addr-city"
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#1E242B',
                  marginBottom: '5px',
                }}
              >
                City <span style={{ color: '#E24B36' }}>*</span>
              </label>
              <select
                id="addr-city"
                value={city}
                onChange={(e) => handleCityChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 10px',
                  borderRadius: '10px',
                  border: `1.5px solid ${fieldErrors.city_name ? '#DC2626' : '#E5DFC9'}`,
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {cities.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: '10.5px', color: '#8E99A8', marginTop: '3px' }}>
                Profile city ({user?.city || 'Lahore'}) stays unchanged
              </p>
            </div>

            {/* Area / Sector / Locality */}
            <div style={{ position: 'relative' }}>
              <label
                htmlFor="addr-area"
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#1E242B',
                  marginBottom: '5px',
                }}
              >
                Area / Sector <span style={{ color: '#E24B36' }}>*</span>
              </label>
              <input
                id="addr-area"
                type="text"
                required
                placeholder={`e.g. ${availableAreas[0] || 'Sector / Area'}`}
                value={area}
                onFocus={() => setShowAreaSuggestions(true)}
                onBlur={() => setTimeout(() => setShowAreaSuggestions(false), 180)}
                onChange={(e) => {
                  setArea(e.target.value);
                  setShowAreaSuggestions(true);
                  if (fieldErrors.area) {
                    setFieldErrors((p) => ({ ...p, area: '' }));
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: `1.5px solid ${fieldErrors.area ? '#DC2626' : '#E5DFC9'}`,
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                }}
              />
              {fieldErrors.area && (
                <p style={{ fontSize: '11px', color: '#DC2626', marginTop: '3px', fontWeight: 600 }}>
                  {fieldErrors.area}
                </p>
              )}

              {/* Area Dropdown Suggestions */}
              {showAreaSuggestions && filteredAreas.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '68px',
                    left: 0,
                    right: 0,
                    maxHeight: '160px',
                    overflowY: 'auto',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '10px',
                    border: '1px solid #D8D0BA',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                    zIndex: 30,
                  }}
                >
                  {filteredAreas.map((areaItem) => (
                    <button
                      key={areaItem}
                      type="button"
                      onMouseDown={() => {
                        setArea(areaItem);
                        setShowAreaSuggestions(false);
                        setFieldErrors((p) => ({ ...p, area: '' }));
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 12px',
                        fontSize: '12.5px',
                        fontWeight: area === areaItem ? 800 : 500,
                        color: area === areaItem ? '#E24B36' : '#1E242B',
                        backgroundColor: area === areaItem ? '#FDEEEB' : 'transparent',
                        borderBottom: '1px solid #F5F1EA',
                        display: 'block',
                      }}
                    >
                      {areaItem}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick-Select Popular Areas Chips for Selected City */}
          {availableAreas.length > 0 && (
            <div>
              <span style={{ fontSize: '11px', color: '#8E99A8', fontWeight: 600, display: 'block', marginBottom: '5px' }}>
                Popular areas in {city} (tap to select or type your own above):
              </span>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {availableAreas.slice(0, 8).map((chip) => {
                  const active = area.toLowerCase() === chip.toLowerCase();
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        setArea(chip);
                        setFieldErrors((p) => ({ ...p, area: '' }));
                      }}
                      style={{
                        flexShrink: 0,
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        backgroundColor: active ? '#E24B36' : '#F5F1EA',
                        color: active ? '#FFFFFF' : '#5A6472',
                        border: `1px solid ${active ? '#E24B36' : '#E5DFC9'}`,
                      }}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* House / Flat / Building Number & Street / Road Number */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label
                htmlFor="addr-house"
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#1E242B',
                  marginBottom: '5px',
                }}
              >
                House / Flat / Bldg No. <span style={{ color: '#E24B36' }}>*</span>
              </label>
              <input
                id="addr-house"
                type="text"
                required
                placeholder="e.g. House 14-B, Flat 302"
                value={houseNumber}
                onChange={(e) => {
                  setHouseNumber(e.target.value);
                  if (fieldErrors.house_number) {
                    setFieldErrors((p) => ({ ...p, house_number: '' }));
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: `1.5px solid ${fieldErrors.house_number ? '#DC2626' : '#E5DFC9'}`,
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                }}
              />
              {fieldErrors.house_number && (
                <p style={{ fontSize: '11px', color: '#DC2626', marginTop: '3px', fontWeight: 600 }}>
                  {fieldErrors.house_number}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="addr-street"
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#1E242B',
                  marginBottom: '5px',
                }}
              >
                Street / Road <span style={{ color: '#E24B36' }}>*</span>
              </label>
              <input
                id="addr-street"
                type="text"
                required
                placeholder="e.g. Street 8, Main Blvd"
                value={street}
                onChange={(e) => {
                  setStreet(e.target.value);
                  if (fieldErrors.street) {
                    setFieldErrors((p) => ({ ...p, street: '' }));
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: `1.5px solid ${fieldErrors.street ? '#DC2626' : '#E5DFC9'}`,
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                }}
              />
              {fieldErrors.street && (
                <p style={{ fontSize: '11px', color: '#DC2626', marginTop: '3px', fontWeight: 600 }}>
                  {fieldErrors.street}
                </p>
              )}
            </div>
          </div>

          {/* Block / Phase (Optional) & Nearby Landmark (Optional) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label
                htmlFor="addr-block"
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#1E242B',
                  marginBottom: '5px',
                }}
              >
                Block / Phase <span style={{ fontSize: '11px', color: '#8E99A8', fontWeight: 500 }}>(Optional)</span>
              </label>
              <input
                id="addr-block"
                type="text"
                placeholder="e.g. Block C, Phase 5"
                value={blockOrPhase}
                onChange={(e) => setBlockOrPhase(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #E5DFC9',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="addr-landmark"
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#1E242B',
                  marginBottom: '5px',
                }}
              >
                Nearby Landmark <span style={{ fontSize: '11px', color: '#8E99A8', fontWeight: 500 }}>(Optional)</span>
              </label>
              <input
                id="addr-landmark"
                type="text"
                placeholder="e.g. Near Jamia Masjid"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #E5DFC9',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>
          </div>
        </div>

        {/* ============================================================
            SECTION 4: ADDRESS LABEL & DELIVERY INSTRUCTIONS
            ============================================================ */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '12.5px',
              fontWeight: 700,
              color: '#1E242B',
              marginBottom: '6px',
            }}
          >
            Address Label
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { key: 'Home', icon: <Home size={14} />, text: 'Home' },
              { key: 'Work', icon: <Briefcase size={14} />, text: 'Work / Office' },
              { key: 'Other', icon: <Building2 size={14} />, text: 'Other' },
            ].map((item) => {
              const isSelected = label === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setLabel(item.key)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '9px 10px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 800,
                    backgroundColor: isSelected ? '#FEF7E4' : '#F5F1EA',
                    color: isSelected ? '#E24B36' : '#1E242B',
                    border: `1.5px solid ${isSelected ? '#E24B36' : '#E5DFC9'}`,
                    cursor: 'pointer',
                  }}
                >
                  {item.icon}
                  <span>{item.text}</span>
                </button>
              );
            })}
          </div>

          {label === 'Other' && (
            <input
              type="text"
              placeholder="Custom label (e.g. Parents' House, University, Hostel)"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              style={{
                width: '100%',
                marginTop: '8px',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1.5px solid #E5DFC9',
                fontSize: '13px',
                backgroundColor: '#FFFFFF',
              }}
            />
          )}
        </div>

        {/* Delivery Instructions (Multiline) */}
        <div>
          <label
            htmlFor="addr-instructions"
            style={{
              display: 'block',
              fontSize: '12.5px',
              fontWeight: 700,
              color: '#1E242B',
              marginBottom: '5px',
            }}
          >
            Delivery Instructions <span style={{ fontSize: '11px', color: '#8E99A8', fontWeight: 500 }}>(Optional)</span>
          </label>
          <textarea
            id="addr-instructions"
            rows={2}
            placeholder="e.g. Call when you arrive, Use the side entrance, or Apartment on the second floor."
            value={deliveryInstructions}
            onChange={(e) => setDeliveryInstructions(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1.5px solid #E5DFC9',
              fontSize: '12.5px',
              backgroundColor: '#FFFFFF',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* ============================================================
            SECTION 5: ADDRESS PREFERENCES
            ============================================================ */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '10px 12px',
            borderRadius: '12px',
            backgroundColor: '#FAF7F2',
            border: '1px solid #E5DFC9',
          }}
        >
          {!initialAddress && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#1E242B',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={saveToAddressBook}
                onChange={(e) => setSaveToAddressBook(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#E24B36' }}
              />
              <span>Save this address to my address book</span>
            </label>
          )}

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#1E242B',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#E24B36' }}
            />
            <span>Set as my default delivery address</span>
          </label>
        </div>

        {/* Submit & Cancel Actions */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #E5DFC9',
              backgroundColor: '#F5F1EA',
              fontSize: '13.5px',
              fontWeight: 700,
              color: '#5A6472',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            style={{
              flex: 2,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#E24B36',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(226, 75, 54, 0.35)',
              cursor: isSaving ? 'wait' : 'pointer',
              opacity: isSaving ? 0.75 : 1,
            }}
          >
            <Check size={16} />
            <span>{isSaving ? 'Saving Address...' : 'Save Address'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
