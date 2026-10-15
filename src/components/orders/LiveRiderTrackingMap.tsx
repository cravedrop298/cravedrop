import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Order } from '../../types';
import { Phone, MessageSquare, Navigation, ShieldCheck, Bike, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '../common/Button';

interface LiveRiderTrackingMapProps {
  order: Order;
  onClose?: () => void;
  onOpenChat?: () => void;
}

// City default coordinates fallback map
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Lahore: { lat: 31.5204, lng: 74.3587 },
  Rawalpindi: { lat: 33.5651, lng: 73.0169 },
  Islamabad: { lat: 33.6844, lng: 73.0479 },
  Karachi: { lat: 24.8607, lng: 67.0011 },
  Peshawar: { lat: 34.0151, lng: 71.5249 },
  Multan: { lat: 30.1575, lng: 71.5249 },
  Faisalabad: { lat: 31.4504, lng: 73.1350 },
  Quetta: { lat: 30.1798, lng: 66.9750 },
  Gujranwala: { lat: 32.1877, lng: 74.1945 },
  Sialkot: { lat: 32.4945, lng: 74.5229 },
};

export const LiveRiderTrackingMap: React.FC<LiveRiderTrackingMapProps> = ({
  order,
  onOpenChat,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const riderMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Rider details
  const riderName = order.rider_name || 'Tariq Mahmood';
  const riderPhone = order.rider_phone || '+92 300 8472910';
  const riderVehicle = order.rider_vehicle || 'Honda CG125 (LEC-8492)';

  // Determine city center based on order address/city or default to Lahore
  const orderCity =
    Object.keys(CITY_COORDINATES).find((c) =>
      order.delivery_address?.toLowerCase().includes(c.toLowerCase())
    ) || 'Lahore';

  const baseCoords = CITY_COORDINATES[orderCity] || CITY_COORDINATES['Lahore'];

  // Coordinates offset to simulate restaurant vs delivery home
  const restaurantCoords: [number, number] = [
    baseCoords.lat + 0.012,
    baseCoords.lng - 0.015,
  ];
  const customerCoords: [number, number] = [
    baseCoords.lat - 0.008,
    baseCoords.lng + 0.011,
  ];

  // Simulation progress state (0 = at restaurant, 1 = at customer)
  const [progress, setProgress] = useState<number>(0.45);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [etaMins, setEtaMins] = useState<number>(8);
  const [distanceKm, setDistanceKm] = useState<number>(1.6);

  // Calculate rider coordinate based on progress interpolation
  const currentRiderLat = restaurantCoords[0] + (customerCoords[0] - restaurantCoords[0]) * progress;
  const currentRiderLng = restaurantCoords[1] + (customerCoords[1] - restaurantCoords[1]) * progress;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up previous map if exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [(restaurantCoords[0] + customerCoords[0]) / 2, (restaurantCoords[1] + customerCoords[1]) / 2],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    // Add OpenStreetMap Free Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Custom HTML divIcons
    const storeIcon = L.divIcon({
      className: 'custom-map-icon',
      html: `<div style="background:#E24B36; color:white; width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2.5px solid white; box-shadow:0 4px 10px rgba(0,0,0,0.3); font-size:18px;">🍳</div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });

    const homeIcon = L.divIcon({
      className: 'custom-map-icon',
      html: `<div style="background:#10B981; color:white; width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2.5px solid white; box-shadow:0 4px 10px rgba(0,0,0,0.3); font-size:18px;">🏠</div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });

    const bikeIcon = L.divIcon({
      className: 'custom-map-icon-rider',
      html: `<div style="background:#1E293B; color:#F59E0B; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:3px solid #F59E0B; box-shadow:0 4px 14px rgba(245,158,11,0.5); font-size:22px;">🛵</div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    // Add Restaurant Marker
    L.marker(restaurantCoords, { icon: storeIcon })
      .addTo(map)
      .bindPopup(`<b>${order.restaurant_name}</b><br/>Kitchen Pickup`);

    // Add Customer Marker
    L.marker(customerCoords, { icon: homeIcon })
      .addTo(map)
      .bindPopup(`<b>Delivery Address</b><br/>${order.delivery_address}`);

    // Route Polyline
    const polyline = L.polyline([restaurantCoords, customerCoords], {
      color: '#E24B36',
      weight: 4,
      opacity: 0.85,
      dashArray: '8, 8',
    }).addTo(map);
    polylineRef.current = polyline;

    // Add Rider Marker
    const riderMarker = L.marker([currentRiderLat, currentRiderLng], { icon: bikeIcon }).addTo(map);
    riderMarker.bindPopup(`<b>Rider: ${riderName}</b><br/>${riderVehicle}`);
    riderMarkerRef.current = riderMarker;

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update rider position smoothly as progress changes
  useEffect(() => {
    if (riderMarkerRef.current) {
      riderMarkerRef.current.setLatLng([currentRiderLat, currentRiderLng]);
    }
  }, [currentRiderLat, currentRiderLng]);

  // Live simulation loop (moves bike towards destination over time)
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 0.98) {
          return 0.1; // reset loop for continuous preview testing
        }
        const next = prev + 0.03;
        // recalculate ETA & distance based on remaining progress
        const remainingFraction = 1 - next;
        setEtaMins(Math.max(1, Math.round(remainingFraction * 15)));
        setDistanceKm(Math.max(0.2, parseFloat((remainingFraction * 3.2).toFixed(1))));
        return next;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [isSimulating]);

  return (
    <div style={{ borderRadius: '20px', overflow: 'hidden', border: '1.5px solid var(--accent-coral-light)', boxShadow: 'var(--shadow-md)', backgroundColor: '#FFFFFF' }}>
      {/* Top Banner Header */}
      <div
        style={{
          backgroundColor: '#1E293B',
          color: '#FFFFFF',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.3)',
              animation: 'pulse 1.5s infinite',
            }}
          />
          <div>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Navigation size={14} color="#F59E0B" /> LIVE GPS RIDER TRACKING
            </span>
            <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block' }}>
              OpenStreetMap · Free GPS Engine
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsSimulating(!isSimulating)}
          title="Toggle Movement Simulation"
          style={{
            backgroundColor: isSimulating ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            color: isSimulating ? '#F59E0B' : '#FFFFFF',
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 8px',
            borderRadius: '10px',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={12} className={isSimulating ? 'spin-icon' : ''} />
          {isSimulating ? 'Live GPS Moving' : 'Paused'}
        </button>
      </div>

      {/* Interactive Map View */}
      <div style={{ position: 'relative', width: '100%', height: '240px' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

        {/* Floating Live ETA Pill */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            borderRadius: '14px',
            padding: '8px 12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid rgba(0,0,0,0.06)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--accent-coral-light)',
              color: 'var(--accent-coral)',
              padding: '6px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bike size={20} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              Arriving in ~{etaMins} mins
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {distanceKm} km away · {orderCity} Traffic
            </div>
          </div>
        </div>
      </div>

      {/* Rider Info & Action Card */}
      <div style={{ padding: '14px 16px', backgroundColor: '#FFFFFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-subtle)',
                border: '2px solid var(--accent-coral)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 800,
                color: 'var(--accent-coral)',
              }}
            >
              🏍️
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>{riderName}</h4>
                <span
                  style={{
                    backgroundColor: 'var(--accent-green-light)',
                    color: 'var(--accent-green)',
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  <ShieldCheck size={11} /> Verified Rider
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {riderVehicle}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <a
              href={`tel:${riderPhone}`}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-green)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              }}
              title="Call Rider"
            >
              <Phone size={18} />
            </a>

            {onOpenChat && (
              <button
                onClick={onOpenChat}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-coral)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(226, 75, 54, 0.3)',
                }}
                title="Message Rider"
              >
                <MessageSquare size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Safety & Delivery Pin Notice */}
        <div
          style={{
            marginTop: '12px',
            backgroundColor: 'var(--bg-butter)',
            border: '1px solid var(--bg-butter-border)',
            borderRadius: '12px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11.5px',
          }}
        >
          <span style={{ color: '#B45309', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Sparkles size={13} color="#B45309" /> Contactless & Safe Delivery Handshake
          </span>
          <span style={{ fontWeight: 800, color: '#B45309' }}>PIN: 4892</span>
        </div>
      </div>
    </div>
  );
};
