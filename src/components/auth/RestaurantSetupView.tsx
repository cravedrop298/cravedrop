import React, { useState } from 'react';
import { BRAND } from '../../config/brand';
import { ArrowLeft, AlertCircle, Store, MapPin, Clock, Phone, ChevronRight, Check } from 'lucide-react';

interface RestaurantSetupViewProps {
  onComplete: (data: {
    name: string;
    category: string;
    cuisine: string[];
    address: string;
    city: string;
    phone: string;
    description: string;
    openingHours: string;
    hasDelivery: boolean;
  }) => Promise<void>;
  onBack: () => void;
}

const CUISINE_OPTIONS = [
  'Italian', 'American', 'Desi / South Asian', 'Chinese', 'Japanese', 'Mexican',
  'BBQ / Grill', 'Burgers & Sandwiches', 'Pizza', 'Seafood', 'Fast Food', 'Desserts & Bakery',
  'Coffee & Café', 'Healthy & Salads', 'Fusion',
];

const RESTAURANT_CATEGORIES = [
  'Restaurant', 'Café', 'Bakery', 'Cloud Kitchen', 'Food Truck', 'Fast Food', 'Fine Dining',
];

const CITIES = ['Metropolis', 'Lahore', 'Karachi', 'Islamabad', 'Dubai', 'London', 'New York'];

type SetupStep = 'basics' | 'details' | 'review';

export const RestaurantSetupView: React.FC<RestaurantSetupViewProps> = ({ onComplete, onBack }) => {
  const [step, setStep] = useState<SetupStep>('basics');

  // Step 1 fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Restaurant');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Metropolis');

  // Step 2 fields
  const [cuisine, setCuisine] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [openingHours, setOpeningHours] = useState('11:00 AM - 11:00 PM');
  const [description, setDescription] = useState('');
  const [hasDelivery, setHasDelivery] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleCuisine = (item: string) => {
    setCuisine(prev =>
      prev.includes(item) ? prev.filter(c => c !== item) : [...prev, item]
    );
  };

  const handleStep1Continue = () => {
    setErrorMessage(null);
    if (!name.trim()) { setErrorMessage('Please enter your restaurant name.'); return; }
    if (!phone.trim()) { setErrorMessage('Please enter a contact phone number.'); return; }
    setStep('details');
  };

  const handleStep2Continue = () => {
    setErrorMessage(null);
    if (!address.trim()) { setErrorMessage('Please enter your restaurant address.'); return; }
    if (cuisine.length === 0) { setErrorMessage('Please select at least one cuisine type.'); return; }
    setStep('review');
  };

  const handleFinish = async () => {
    try {
      setIsLoading(true);
      await onComplete({
        name: name.trim(),
        category,
        cuisine,
        address: address.trim(),
        city,
        phone: phone.trim(),
        description: description.trim(),
        openingHours,
        hasDelivery,
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Restaurant setup could not be completed. Please try again.');
      setStep('basics');
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '46px',
    padding: '0 14px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5DFC9',
    borderRadius: '12px',
    color: '#1E242B',
    fontSize: '14px',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 700,
    color: '#1E242B',
    marginBottom: '5px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', padding: '20px', backgroundColor: '#FAF7F2' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={step === 'basics' ? onBack : () => setStep(step === 'review' ? 'details' : 'basics')}
          aria-label="Back"
          style={{
            width: '40px', height: '40px', borderRadius: '50%',
            backgroundColor: '#FFFFFF', border: '1px solid #E5DFC9',
            color: '#1E242B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ArrowLeft size={18} />
        </button>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Store size={15} color="#E24B36" />
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#1E242B' }}>Restaurant Setup</span>
          </div>
          <span style={{ fontSize: '11px', color: '#8E99A8' }}>
            {step === 'basics' ? 'Step 1 of 3 — Basic Info' : step === 'details' ? 'Step 2 of 3 — Details & Hours' : 'Step 3 of 3 — Review & Launch'}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '3px', backgroundColor: '#E5DFC9', borderRadius: '99px', overflow: 'hidden', marginBottom: '20px' }}>
        <div
          style={{
            height: '100%',
            width: step === 'basics' ? '33%' : step === 'details' ? '66%' : '100%',
            backgroundColor: '#E24B36',
            borderRadius: '99px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Error */}
      {errorMessage && (
        <div
          style={{
            display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '12px 14px',
            backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px',
            fontSize: '13px', color: '#B91C1C', marginBottom: '16px',
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ---- STEP 1: BASICS ---- */}
      {step === 'basics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
          <div>
            <label htmlFor="rest-name" style={labelStyle}>Restaurant Name (Max 15 chars) *</label>
            <input
              id="rest-name"
              type="text"
              placeholder="e.g. FireCrust"
              maxLength={15}
              value={name}
              onChange={e => setName(e.target.value.slice(0, 15))}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Category</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {RESTAURANT_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{
                    padding: '6px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                    backgroundColor: category === cat ? '#E24B36' : '#FFFFFF',
                    color: category === cat ? '#FFFFFF' : '#64748B',
                    border: `1px solid ${category === cat ? '#E24B36' : '#E5DFC9'}`,
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="rest-phone" style={labelStyle}>Contact Phone *</label>
            <div style={{ position: 'relative' }}>
              <input
                id="rest-phone"
                type="tel"
                placeholder="+1 555-000-0000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={{ ...inputStyle, paddingLeft: '38px' }}
              />
              <Phone size={14} color="#8E99A8" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>City</label>
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              style={{ ...inputStyle, height: '46px' }}
            >
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <button
            onClick={handleStep1Continue}
            style={{
              marginTop: 'auto', width: '100%', height: '48px',
              backgroundColor: '#E24B36', color: '#FFFFFF', borderRadius: '14px',
              fontSize: '14px', fontWeight: 800, border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(226, 75, 54, 0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            Continue <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ---- STEP 2: DETAILS ---- */}
      {step === 'details' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
          <div>
            <label style={labelStyle}>Cuisine Types * (select all that apply)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {CUISINE_OPTIONS.map(c => {
                const sel = cuisine.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggleCuisine(c)}
                    style={{
                      padding: '6px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                      backgroundColor: sel ? '#FDEEEB' : '#FFFFFF',
                      color: sel ? '#E24B36' : '#64748B',
                      border: `1px solid ${sel ? '#E24B36' : '#E5DFC9'}`,
                    }}
                  >
                    {sel && '✓ '}{c}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="rest-address" style={labelStyle}>Full Address *</label>
            <input
              id="rest-address"
              type="text"
              placeholder="e.g. 74 Elmwood Ave, Downtown"
              value={address}
              onChange={e => setAddress(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '38px' }}
            />
          </div>

          <div>
            <label htmlFor="rest-hours" style={labelStyle}>Opening Hours</label>
            <div style={{ position: 'relative' }}>
              <input
                id="rest-hours"
                type="text"
                placeholder="e.g. 11:00 AM - 11:00 PM"
                value={openingHours}
                onChange={e => setOpeningHours(e.target.value)}
                style={{ ...inputStyle, paddingLeft: '38px' }}
              />
              <Clock size={14} color="#8E99A8" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div>
            <label htmlFor="rest-description" style={labelStyle}>Description (optional)</label>
            <textarea
              id="rest-description"
              placeholder="Tell customers what makes your kitchen special..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              style={{
                ...inputStyle,
                height: 'auto',
                padding: '12px 14px',
                resize: 'vertical',
                lineHeight: 1.4,
              }}
            />
          </div>

          {/* Delivery toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5DFC9' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1E242B' }}>Offer Delivery?</span>
            <button
              onClick={() => setHasDelivery(!hasDelivery)}
              style={{
                width: '44px', height: '24px', borderRadius: '99px', border: 'none', cursor: 'pointer',
                backgroundColor: hasDelivery ? '#E24B36' : '#E5DFC9',
                position: 'relative', transition: 'background-color 0.2s ease',
              }}
            >
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#FFFFFF',
                position: 'absolute', top: '3px', left: hasDelivery ? '23px' : '3px',
                transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>

          <button
            onClick={handleStep2Continue}
            style={{
              marginTop: 'auto', width: '100%', height: '48px',
              backgroundColor: '#E24B36', color: '#FFFFFF', borderRadius: '14px',
              fontSize: '14px', fontWeight: 800, border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(226, 75, 54, 0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            Review & Launch <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ---- STEP 3: REVIEW ---- */}
      {step === 'review' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
          <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#1E242B', marginBottom: '4px' }}>
            Review your details
          </h3>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>
            Looks good? Hit Launch to create your restaurant profile.
          </p>

          {/* Summary card */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5DFC9', overflow: 'hidden' }}>
            {[
              { label: 'Restaurant Name', value: name },
              { label: 'Category', value: category },
              { label: 'City', value: city },
              { label: 'Phone', value: phone },
              { label: 'Address', value: address || '—' },
              { label: 'Cuisine', value: cuisine.length > 0 ? cuisine.join(', ') : '—' },
              { label: 'Hours', value: openingHours },
              { label: 'Delivery', value: hasDelivery ? 'Yes' : 'No' },
            ].map(({ label, value }, i, arr) => (
              <div
                key={label}
                style={{
                  display: 'flex', padding: '12px 16px',
                  borderBottom: i < arr.length - 1 ? '1px solid #F5F1EA' : 'none',
                }}
              >
                <span style={{ fontSize: '12px', color: '#8E99A8', fontWeight: 600, width: '110px', flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E242B', flex: 1 }}>{value}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleFinish}
            disabled={isLoading}
            style={{
              marginTop: 'auto', width: '100%', height: '50px',
              backgroundColor: '#E24B36', color: '#FFFFFF', borderRadius: '14px',
              fontSize: '15px', fontWeight: 800, border: 'none', cursor: isLoading ? 'default' : 'pointer',
              boxShadow: '0 4px 16px rgba(226, 75, 54, 0.30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            {isLoading ? 'Launching...' : '🔥 Launch My Kitchen'}
          </button>
        </div>
      )}
    </div>
  );
};
