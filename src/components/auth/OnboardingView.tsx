import React, { useState, useEffect, useRef } from 'react';
import { BRAND } from '../../config/brand';
import {
  ArrowRight,
  ArrowLeft,
  MapPin,
  Check,
  Camera,
  Upload,
  User,
  AtSign,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Loader2,
  Search,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CityOption } from '../../types';
import { PAKISTAN_CITIES_LIST, validateUsernameRules } from '../../utils/userUtils';
import { checkUsernameAvailability, fetchCitiesFromSupabase, compressImageToDataUrl, uploadAvatarToSupabase } from '../../lib/supabase';

interface OnboardingViewProps {
  onComplete: (data: {
    fullName: string;
    username: string;
    city: string;
    cityId?: string;
    avatarUrl: string;
    interests: string[];
    role?: 'customer' | 'restaurant';
  }) => Promise<void>;
  onRestaurantSetup?: () => void;
}

const FOOD_INTERESTS_LIST = [
  { id: 'burgers', label: 'Burgers', emoji: '🍔' },
  { id: 'pizza', label: 'Pizza', emoji: '🍕' },
  { id: 'bbq', label: 'BBQ', emoji: '🔥' },
  { id: 'desi_food', label: 'Desi Food', emoji: '🍛' },
  { id: 'biryani', label: 'Biryani', emoji: '🍚' },
  { id: 'karahi', label: 'Karahi', emoji: '🥘' },
  { id: 'fast_food', label: 'Fast Food', emoji: '🍟' },
  { id: 'fried_chicken', label: 'Fried Chicken', emoji: '🍗' },
  { id: 'chinese', label: 'Chinese', emoji: '🥡' },
  { id: 'japanese', label: 'Japanese & Sushi', emoji: '🍣' },
  { id: 'korean', label: 'Korean', emoji: '🥢' },
  { id: 'street_food', label: 'Street Food', emoji: '🌮' },
  { id: 'sandwiches', label: 'Sandwiches', emoji: '🥪' },
  { id: 'italian', label: 'Pasta & Italian', emoji: '🍝' },
  { id: 'mexican', label: 'Tacos & Mexican', emoji: '🌯' },
  { id: 'turkish_food', label: 'Turkish Food', emoji: '🥙' },
  { id: 'pakistani_food', label: 'Pakistani Food', emoji: '🍲' },
  { id: 'seafood', label: 'Seafood', emoji: '🦐' },
  { id: 'healthy_food', label: 'Healthy Food', emoji: '🥗' },
  { id: 'breakfast', label: 'Breakfast', emoji: '🥞' },
  { id: 'desserts', label: 'Desserts', emoji: '🍰' },
  { id: 'bakery', label: 'Bakery', emoji: '🥐' },
  { id: 'ice_cream', label: 'Ice Cream', emoji: '🍦' },
  { id: 'coffee', label: 'Coffee & Chai', emoji: '☕' },
  { id: 'drinks', label: 'Drinks & Shakes', emoji: '🥤' },
];

type Step = 'identity' | 'avatar' | 'city' | 'interests' | 'celebration';

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  const { user } = useAuth();

  // State
  const [currentStep, setCurrentStep] = useState<Step>('identity');

  // Step 1: Identity
  const [fullName, setFullName] = useState(user?.name || user?.full_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameMessage, setUsernameMessage] = useState<string>('');
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 2: Avatar
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatar_url || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Step 3: City
  const [cities, setCities] = useState<CityOption[]>(PAKISTAN_CITIES_LIST);
  const [citySearch, setCitySearch] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);

  // Step 4: Interests
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(
    new Set(user?.interests && user.interests.length > 0 ? user.interests : [])
  );

  // Final submission
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load cities on mount
  useEffect(() => {
    fetchCitiesFromSupabase().then((data) => {
      if (data && data.length > 0) {
        setCities(data);
      }
    });
  }, []);

  // Pre-select city if user already had one
  useEffect(() => {
    if (user?.city && !selectedCity) {
      const match = cities.find(
        (c) => c.name.toLowerCase() === user.city?.toLowerCase() || c.id === user.city_id
      );
      if (match) setSelectedCity(match);
    }
  }, [user?.city, cities, selectedCity]);

  // Username validation & debounce check
  useEffect(() => {
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    const trimmed = username.trim().toLowerCase();
    if (!trimmed) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      return;
    }

    const ruleCheck = validateUsernameRules(trimmed);
    if (!ruleCheck.isValid) {
      setUsernameStatus('invalid');
      setUsernameMessage(ruleCheck.error || 'Invalid format');
      return;
    }

    setUsernameStatus('checking');
    setUsernameMessage('Checking availability...');

    checkTimeoutRef.current = setTimeout(async () => {
      try {
        const isAvailable = await checkUsernameAvailability(trimmed, user?.id);
        if (isAvailable) {
          setUsernameStatus('available');
          setUsernameMessage(`@${trimmed} is available`);
        } else {
          setUsernameStatus('taken');
          setUsernameMessage(`@${trimmed} is already taken`);
        }
      } catch {
        setUsernameStatus('available');
        setUsernameMessage(`@${trimmed} is available`);
      }
    }, 320);

    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    };
  }, [username, user?.id]);

  // Handle avatar upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      if (user?.id) {
        const uploaded = await uploadAvatarToSupabase(user.id, file);
        if (uploaded) {
          setAvatarUrl(uploaded);
          return;
        }
      }
      const dataUrl = await compressImageToDataUrl(file);
      setAvatarUrl(dataUrl);
    } catch (err: any) {
      console.warn('Avatar upload error:', err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Toggle interest
  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Final Complete Handler
  const handleFinalSubmit = async () => {
    if (!fullName.trim() || !username.trim() || !selectedCity || !avatarUrl || selectedInterests.size < 3) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onComplete({
        fullName: fullName.trim(),
        username: username.toLowerCase().trim(),
        city: selectedCity.name,
        cityId: selectedCity.id,
        avatarUrl,
        interests: Array.from(selectedInterests),
        role: 'customer',
      });
      setCurrentStep('celebration');
    } catch (err: any) {
      console.error('Failed to complete onboarding:', err);
      setIsSubmitting(false);
    }
  };

  // Filtered cities
  const filteredCities = cities.filter(
    (c) =>
      c.name.toLowerCase().includes(citySearch.toLowerCase()) ||
      (c.province && c.province.toLowerCase().includes(citySearch.toLowerCase()))
  );

  // Progress Bar Helper
  const getStepProgress = () => {
    switch (currentStep) {
      case 'identity':
        return 25;
      case 'avatar':
        return 50;
      case 'city':
        return 75;
      case 'interests':
      case 'celebration':
        return 100;
    }
  };

  // Step 1 Validation
  const isIdentityValid =
    fullName.trim().length >= 2 &&
    username.trim().length >= 3 &&
    usernameStatus === 'available';

  // Step 2 Validation
  const isAvatarValid = Boolean(avatarUrl && avatarUrl.trim().length > 0);

  // Step 3 Validation
  const isCityValid = Boolean(selectedCity);

  // Step 4 Validation
  const isInterestsValid = selectedInterests.size >= 3;

  // ============================================================
  // CELEBRATION / SUCCESS SCREEN
  // ============================================================
  if (currentStep === 'celebration') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100%',
          padding: '32px 24px',
          backgroundColor: '#FAF7F2',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '104px',
            height: '104px',
            marginBottom: '24px',
          }}
        >
          <img
            src={avatarUrl}
            alt={fullName}
            style={{
              width: '104px',
              height: '104px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '4px solid #E24B36',
              boxShadow: '0 8px 24px rgba(226, 75, 54, 0.25)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #FFFFFF',
            }}
          >
            <Check size={16} color="#FFFFFF" strokeWidth={3} />
          </div>
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#1E242B', marginBottom: '8px' }}>
          Welcome, {fullName}! 🚀
        </h2>
        <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.5, marginBottom: '28px', maxWidth: '300px' }}>
          Your profile is ready. We've customized your live food feed for{' '}
          <strong style={{ color: '#E24B36' }}>{selectedCity?.name}</strong> with your favorite flavors!
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            backgroundColor: '#FDEEEB',
            borderRadius: '99px',
            color: '#E24B36',
            fontSize: '13px',
            fontWeight: 700,
            marginBottom: '32px',
          }}
        >
          <Sparkles size={16} />
          <span>@{username.toLowerCase()}</span>
          <span>•</span>
          <span>{selectedCity?.name}</span>
        </div>

        <div style={{ width: '100%' }}>
          <button
            onClick={() => {
              window.location.reload();
            }}
            style={{
              width: '100%',
              height: '52px',
              backgroundColor: '#E24B36',
              color: '#FFFFFF',
              borderRadius: '16px',
              fontSize: '15px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(226, 75, 54, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span>Start Exploring Drops</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        backgroundColor: '#FAF7F2',
        padding: '24px 20px 28px',
      }}
    >
      {/* Top Header & Progress */}
      <div style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img
              src={BRAND.logo.imageUrl}
              alt={BRAND.name}
              style={{ width: '28px', height: '28px', borderRadius: '8px', objectFit: 'cover' }}
            />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E242B', letterSpacing: '0.2px' }}>
              CRAVEDROP SETUP
            </span>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#E24B36' }}>
            Step {currentStep === 'identity' ? '1' : currentStep === 'avatar' ? '2' : currentStep === 'city' ? '3' : '4'} of 4
          </span>
        </div>

        {/* Progress Bar */}
        <div style={{ height: '4px', backgroundColor: '#E5DFC9', borderRadius: '99px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${getStepProgress()}%`,
              backgroundColor: '#E24B36',
              borderRadius: '99px',
              transition: 'width 0.35s ease',
            }}
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/* STEP 1: IDENTITY (REAL NAME & UNIQUE USERNAME) */}
      {/* ============================================================ */}
      {currentStep === 'identity' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#1E242B', marginBottom: '6px' }}>
              Complete Your Profile
            </h2>
            <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.45 }}>
              Choose your real name and pick a unique handle for your CraveDrop account.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', flex: 1 }}>
            {/* Real Name Input */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#1E242B',
                  marginBottom: '8px',
                }}
              >
                Full Name <span style={{ color: '#E24B36' }}>*</span>
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '14px',
                  border: '2px solid #E5DFC9',
                  padding: '12px 14px',
                  boxShadow: '0 2px 6px rgba(60, 40, 20, 0.04)',
                }}
              >
                <User size={18} color="#8E99A8" />
                <input
                  id="onboarding-fullname"
                  type="text"
                  placeholder="e.g. Ali Khan"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#1E242B',
                    width: '100%',
                    backgroundColor: 'transparent',
                  }}
                  autoFocus
                />
              </div>
              <p style={{ fontSize: '11.5px', color: '#8E99A8', marginTop: '6px', marginInlineStart: '4px' }}>
                Your real name displayed on your orders and comments.
              </p>
            </div>

            {/* Unique Username Input */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#1E242B',
                  marginBottom: '8px',
                }}
              >
                Choose Username <span style={{ color: '#E24B36' }}>*</span>
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '14px',
                  border: `2px solid ${
                    usernameStatus === 'available'
                      ? '#10B981'
                      : usernameStatus === 'taken' || usernameStatus === 'invalid'
                      ? '#E24B36'
                      : '#E5DFC9'
                  }`,
                  padding: '12px 14px',
                  boxShadow: '0 2px 6px rgba(60, 40, 20, 0.04)',
                  transition: 'border-color 0.2s ease',
                }}
              >
                <AtSign size={18} color={usernameStatus === 'available' ? '#10B981' : '#8E99A8'} />
                <input
                  id="onboarding-username"
                  type="text"
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                  style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#1E242B',
                    width: '100%',
                    backgroundColor: 'transparent',
                  }}
                />
                {usernameStatus === 'checking' && <Loader2 size={16} color="#8E99A8" className="animate-spin" />}
                {usernameStatus === 'available' && <CheckCircle2 size={18} color="#10B981" />}
                {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                  <AlertCircle size={18} color="#E24B36" />
                )}
              </div>

              {/* Status helper text */}
              {usernameMessage && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color:
                      usernameStatus === 'available'
                        ? '#10B981'
                        : usernameStatus === 'taken' || usernameStatus === 'invalid'
                        ? '#E24B36'
                        : '#8E99A8',
                    marginInlineStart: '4px',
                  }}
                >
                  <span>{usernameMessage}</span>
                </div>
              )}
              {!usernameMessage && (
                <p style={{ fontSize: '11.5px', color: '#8E99A8', marginTop: '6px', marginInlineStart: '4px' }}>
                  Must be 3-30 letters, numbers, _ or .
                </p>
              )}
            </div>
          </div>

          {/* Continue button */}
          <button
            id="identity-continue-btn"
            onClick={() => setCurrentStep('avatar')}
            disabled={!isIdentityValid}
            style={{
              marginTop: '24px',
              width: '100%',
              height: '50px',
              backgroundColor: isIdentityValid ? '#E24B36' : '#D5CDB8',
              color: '#FFFFFF',
              borderRadius: '16px',
              fontSize: '15px',
              fontWeight: 800,
              border: 'none',
              cursor: isIdentityValid ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: isIdentityValid ? '0 4px 14px rgba(226, 75, 54, 0.28)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <span>Continue</span>
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 2: PROFILE PICTURE (MANDATORY PHOTO UPLOAD) */}
      {/* ============================================================ */}
      {currentStep === 'avatar' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <button
              onClick={() => setCurrentStep('identity')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                color: '#64748B',
              }}
            >
              <ArrowLeft size={20} />
            </button>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>Back to Identity</span>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#1E242B', marginBottom: '6px' }}>
              Add a Profile Photo
            </h2>
            <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.45 }}>
              Upload your photo so your favorite foodies and kitchens can recognize you.
            </p>
          </div>

          {/* Avatar Uploader View */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              padding: '20px 0',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'relative',
                width: '130px',
                height: '130px',
                borderRadius: '50%',
                backgroundColor: avatarUrl ? '#FFFFFF' : '#FDEEEB',
                border: `3px dashed ${avatarUrl ? '#E24B36' : '#E5DFC9'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(60, 40, 20, 0.08)',
                transition: 'all 0.2s ease',
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile Preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : isUploadingAvatar ? (
                <Loader2 size={36} color="#E24B36" className="animate-spin" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <Camera size={34} color="#E24B36" />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#E24B36' }}>Tap to upload</span>
                </div>
              )}

              {avatarUrl && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                >
                  <Camera size={26} color="#FFFFFF" />
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button
                id="choose-photo-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '2px solid #E5DFC9',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#1E242B',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(60, 40, 20, 0.04)',
                }}
              >
                <Upload size={15} color="#E24B36" />
                <span>{avatarUrl ? 'Change Photo' : 'Upload from Device'}</span>
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#8E99A8', marginTop: '16px', textAlign: 'center', maxWidth: '240px' }}>
              PNG, JPG, or WEBP. Profile picture is required to proceed.
            </p>
          </div>

          {/* Continue button */}
          <button
            id="avatar-continue-btn"
            onClick={() => setCurrentStep('city')}
            disabled={!isAvatarValid}
            style={{
              marginTop: '24px',
              width: '100%',
              height: '50px',
              backgroundColor: isAvatarValid ? '#E24B36' : '#D5CDB8',
              color: '#FFFFFF',
              borderRadius: '16px',
              fontSize: '15px',
              fontWeight: 800,
              border: 'none',
              cursor: isAvatarValid ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: isAvatarValid ? '0 4px 14px rgba(226, 75, 54, 0.28)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <span>Continue</span>
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 3: PRIMARY CITY SELECTION */}
      {/* ============================================================ */}
      {currentStep === 'city' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <button
              onClick={() => setCurrentStep('avatar')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                color: '#64748B',
              }}
            >
              <ArrowLeft size={20} />
            </button>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>Back to Photo</span>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#1E242B', marginBottom: '6px' }}>
              Where do you eat?
            </h2>
            <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.45 }}>
              Choose your primary city. Your feed will automatically spotlight nearby kitchens & hot drops.
            </p>
          </div>

          {/* Search bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              border: '2px solid #E5DFC9',
              padding: '10px 14px',
              marginBottom: '14px',
              boxShadow: '0 2px 6px rgba(60, 40, 20, 0.04)',
            }}
          >
            <Search size={18} color="#8E99A8" />
            <input
              id="city-search-input"
              type="text"
              placeholder="Search your city (e.g. Lahore, Karachi, Islamabad...)"
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '14px',
                fontWeight: 600,
                color: '#1E242B',
                width: '100%',
                backgroundColor: 'transparent',
              }}
            />
          </div>

          {/* City Grid / List */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              flex: 1,
              overflowY: 'auto',
              maxHeight: '320px',
              paddingInlineEnd: '4px',
            }}
          >
            {filteredCities.map((city) => {
              const isSelected = selectedCity?.id === city.id;
              return (
                <button
                  key={city.id}
                  id={`city-option-${city.id}`}
                  onClick={() => setSelectedCity(city)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: isSelected ? '#FDEEEB' : '#FFFFFF',
                    borderRadius: '14px',
                    border: `2px solid ${isSelected ? '#E24B36' : '#E5DFC9'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        backgroundColor: isSelected ? '#E24B36' : '#F1ECE1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <MapPin size={16} color={isSelected ? '#FFFFFF' : '#8E99A8'} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: isSelected ? '#E24B36' : '#1E242B' }}>
                        {city.name}
                      </div>
                      {city.province && (
                        <div style={{ fontSize: '11px', color: '#8E99A8', fontWeight: 500 }}>
                          {city.province}, {city.country}
                        </div>
                      )}
                    </div>
                  </div>
                  {isSelected && <CheckCircle2 size={18} color="#E24B36" />}
                </button>
              );
            })}
          </div>

          {/* Continue button */}
          <button
            id="city-continue-btn"
            onClick={() => setCurrentStep('interests')}
            disabled={!isCityValid}
            style={{
              marginTop: '18px',
              width: '100%',
              height: '50px',
              backgroundColor: isCityValid ? '#E24B36' : '#D5CDB8',
              color: '#FFFFFF',
              borderRadius: '16px',
              fontSize: '15px',
              fontWeight: 800,
              border: 'none',
              cursor: isCityValid ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: isCityValid ? '0 4px 14px rgba(226, 75, 54, 0.28)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <span>Continue to Food Interests</span>
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 4: FOOD INTERESTS (MINIMUM 3 REQUIRED) */}
      {/* ============================================================ */}
      {currentStep === 'interests' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <button
              onClick={() => setCurrentStep('city')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                color: '#64748B',
              }}
            >
              <ArrowLeft size={20} />
            </button>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>Back to City</span>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#1E242B', marginBottom: '6px' }}>
              What flavors crave you?
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '13px', color: '#64748B' }}>
                Select your favorite foods (minimum 3 required)
              </p>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: '99px',
                  backgroundColor: selectedInterests.size >= 3 ? '#E8F5E9' : '#FEF3C7',
                  color: selectedInterests.size >= 3 ? '#2E7D32' : '#D97706',
                  whiteSpace: 'nowrap',
                }}
              >
                {selectedInterests.size >= 3
                  ? `✓ ${selectedInterests.size} selected`
                  : `${selectedInterests.size} / 3 min`}
              </span>
            </div>
          </div>

          {/* Interests Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
              flex: 1,
              overflowY: 'auto',
              maxHeight: '360px',
              paddingInlineEnd: '4px',
            }}
          >
            {FOOD_INTERESTS_LIST.map((item) => {
              const isSelected = selectedInterests.has(item.id);
              return (
                <button
                  key={item.id}
                  id={`interest-${item.id}`}
                  onClick={() => toggleInterest(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    backgroundColor: isSelected ? '#FDEEEB' : '#FFFFFF',
                    borderRadius: '14px',
                    border: `2px solid ${isSelected ? '#E24B36' : '#E5DFC9'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '22px' }}>{item.emoji}</span>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: isSelected ? '#E24B36' : '#1E242B',
                      flex: 1,
                    }}
                  >
                    {item.label}
                  </span>
                  {isSelected && (
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: '#E24B36',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Check size={11} color="#FFFFFF" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Submit button */}
          <button
            id="finish-onboarding-btn"
            onClick={handleFinalSubmit}
            disabled={!isInterestsValid || isSubmitting}
            style={{
              marginTop: '18px',
              width: '100%',
              height: '52px',
              backgroundColor: isInterestsValid ? '#E24B36' : '#D5CDB8',
              color: '#FFFFFF',
              borderRadius: '16px',
              fontSize: '15px',
              fontWeight: 800,
              border: 'none',
              cursor: isInterestsValid && !isSubmitting ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: isInterestsValid ? '0 4px 14px rgba(226, 75, 54, 0.28)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} color="#FFFFFF" className="animate-spin" />
                <span>Completing Setup...</span>
              </>
            ) : (
              <>
                <span>Complete Profile & Start Eating</span>
                <Sparkles size={18} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
