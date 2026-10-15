import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  ChevronRight,
  User,
  AtSign,
  Phone,
  MapPin,
  FileText,
  Check,
  Camera,
  AlertCircle,
  Clock,
  Lock,
  Save,
  X,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { AvatarCropModal } from './AvatarCropModal';
import {
  PAKISTAN_CITIES,
  getCooldownStatus,
  normalizeUsername,
  isValidUsernameFormat,
  normalizePakistanPhone,
} from '../../utils/userUtils';

interface EditProfileViewProps {
  onBack: () => void;
}

export const EditProfileView: React.FC<EditProfileViewProps> = ({ onBack }) => {
  const { user, updateProfile, uploadAvatar } = useAuth();
  const { allUsers } = useData();

  // Initial field states
  const initialFullName = user?.full_name || user?.name || '';
  const initialUsername = user?.username || '';
  const initialBio = user?.bio || '';
  const initialPhone = user?.phone || '+923001234567';
  const initialCity = user?.city || user?.location?.city || 'Lahore';

  const [fullName, setFullName] = useState(initialFullName);
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState(initialBio);
  const [phoneRaw, setPhoneRaw] = useState(() => {
    if (!initialPhone) return '';
    // Format for display without +92 if present
    if (initialPhone.startsWith('+92')) return initialPhone.slice(3);
    if (initialPhone.startsWith('92')) return initialPhone.slice(2);
    if (initialPhone.startsWith('0')) return initialPhone.slice(1);
    return initialPhone;
  });
  const [city, setCity] = useState(initialCity);

  // Avatar Crop state
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  // Saving & Status
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  // 14-day Cooldown statuses
  const nameCooldown = getCooldownStatus(user?.name_changed_at);
  const usernameCooldown = getCooldownStatus(user?.username_changed_at);
  const cityCooldown = getCooldownStatus(user?.city_changed_at);

  // Live username uniqueness check
  const normalizedUser = normalizeUsername(username);
  const isUsernameFormatValid = isValidUsernameFormat(normalizedUser);
  const isUsernameTaken = allUsers.some(
    (u) => u.id !== user?.id && (u.username || '').toLowerCase() === normalizedUser
  );

  // Dirty check for unsaved changes
  const isDirty =
    fullName.trim() !== initialFullName.trim() ||
    normalizedUser !== initialUsername.trim() ||
    bio.trim() !== initialBio.trim() ||
    phoneRaw.trim() !== (initialPhone.startsWith('+92') ? initialPhone.slice(3) : initialPhone) ||
    city !== initialCity;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropFile(file);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const handleCropSave = async (blob: Blob) => {
    setCropFile(null);
    setIsUploadingAvatar(true);
    try {
      const croppedFile = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      await uploadAvatar(croppedFile);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleBackPress = () => {
    if (isDirty) {
      setShowDiscardModal(true);
    } else {
      onBack();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSaveSuccessMsg('');

    // 1. Validate Full Name
    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMessage('Full name must be at least 2 characters long.');
      return;
    }

    // 2. Validate Username
    if (!normalizedUser) {
      setErrorMessage('Username is required.');
      return;
    }
    if (!isUsernameFormatValid) {
      setErrorMessage('Username can only contain lowercase letters (a-z), numbers (0-9), underscores (_), and periods (.).');
      return;
    }
    if (isUsernameTaken) {
      setErrorMessage('This username is already taken. Please choose another.');
      return;
    }

    // 3. Validate Phone (Pakistan +92)
    const formattedPhoneInput = phoneRaw.startsWith('+92') ? phoneRaw : `+92${phoneRaw}`;
    const phoneVal = normalizePakistanPhone(formattedPhoneInput);
    if (!phoneVal.valid) {
      setErrorMessage(phoneVal.error || 'Please enter a valid Pakistani mobile number.');
      return;
    }

    // 4. Bio character limit
    if (bio.length > 150) {
      setErrorMessage('Bio cannot exceed 150 characters.');
      return;
    }

    // 5. Check 14-day server/state locks
    const isNameChanged = fullName.trim() !== initialFullName.trim();
    if (isNameChanged && nameCooldown.isLocked) {
      setErrorMessage(`Full name cannot be changed yet. ${nameCooldown.formatted}`);
      return;
    }

    const isUsernameChanged = normalizedUser !== initialUsername.trim();
    if (isUsernameChanged && usernameCooldown.isLocked) {
      setErrorMessage(`Username cannot be changed yet. ${usernameCooldown.formatted}`);
      return;
    }

    const isCityChanged = city !== initialCity;
    if (isCityChanged && cityCooldown.isLocked) {
      setErrorMessage(`City cannot be changed yet. ${cityCooldown.formatted}`);
      return;
    }

    setIsSaving(true);

    try {
      const nowIso = new Date().toISOString();
      const updates: Partial<UserProfile> = {
        name: fullName.trim(),
        full_name: fullName.trim(),
        username: normalizedUser,
        bio: bio.trim(),
        phone: phoneVal.normalized,
        city: city,
        location: user?.location
          ? { ...user.location, city }
          : { address: city, city, lat: 31.5204, lng: 74.3587 },
      };

      // Update change timestamps strictly when value actually changed!
      if (isNameChanged) {
        updates.name_changed_at = nowIso;
      }
      if (isUsernameChanged) {
        updates.username_changed_at = nowIso;
      }
      if (isCityChanged) {
        updates.city_changed_at = nowIso;
      }

      await updateProfile(updates);

      setSaveSuccessMsg('Profile updated successfully!');
      setTimeout(() => {
        onBack();
      }, 800);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#FAF7F2', minHeight: '100%', paddingBottom: '40px' }}>
      {/* Avatar Crop Modal */}
      {cropFile && (
        <AvatarCropModal
          file={cropFile}
          onSave={handleCropSave}
          onCancel={() => setCropFile(null)}
        />
      )}

      {/* Unsaved Changes Discard Modal */}
      <Modal
        isOpen={showDiscardModal}
        onClose={() => setShowDiscardModal(false)}
        title="Discard changes?"
        subtitle="You have unsaved changes in your profile."
      >
        <div style={{ padding: '8px 0 4px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Are you sure you want to leave without saving? Your changes will be lost.
          </p>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowDiscardModal(false)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid var(--border-light)',
                backgroundColor: '#FFFFFF',
                fontSize: '13.5px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              Keep Editing
            </button>
            <button
              onClick={() => {
                setShowDiscardModal(false);
                onBack();
              }}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                fontSize: '13.5px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Discard
            </button>
          </div>
        </div>
      </Modal>

      {/* FULL PAGE HEADER */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid var(--border-light)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleBackPress}
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ChevronRight size={20} color="var(--text-primary)" style={{ transform: 'rotate(180deg)' }} />
          </button>
          <h2 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
            Edit Profile
          </h2>
        </div>

        <button
          onClick={() => handleSubmit()}
          disabled={isSaving || (isDirty && (isUsernameTaken || !isUsernameFormatValid))}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '20px',
            backgroundColor: isSaving ? 'var(--text-muted)' : 'var(--accent-coral)',
            border: 'none',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 800,
            cursor: isSaving ? 'wait' : 'pointer',
            boxShadow: '0 3px 10px rgba(226, 97, 74, 0.25)',
            opacity: isDirty && (isUsernameTaken || !isUsernameFormatValid) ? 0.5 : 1,
          }}
        >
          {isSaving ? (
            <span>Saving...</span>
          ) : (
            <>
              <Check size={15} />
              <span>Save</span>
            </>
          )}
        </button>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: '540px', margin: '0 auto' }}>
        {/* Error / Success Notifications */}
        {errorMessage && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '14px',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              color: '#B91C1C',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {saveSuccessMsg && (
          <div
            style={{
              backgroundColor: '#ECFDF5',
              border: '1px solid #6EE7B7',
              borderRadius: '14px',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#047857',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            <Check size={18} />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* 1. PROFILE PHOTO SECTION */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '20px',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-sm)',
            textAlign: 'center',
            marginBottom: '16px',
          }}
        >
          <input
            ref={avatarInputRef}
            id="edit-profile-avatar-input"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
          />

          <label
            htmlFor="edit-profile-avatar-input"
            style={{
              position: 'relative',
              width: '90px',
              height: '90px',
              margin: '0 auto 10px',
              cursor: isUploadingAvatar ? 'wait' : 'pointer',
              display: 'block',
            }}
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name || 'Profile'}
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid var(--accent-coral-light)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #E2614A 0%, #F4956A 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid var(--accent-coral-light)',
                }}
              >
                <span style={{ fontSize: '32px', fontWeight: 800, color: '#FFFFFF' }}>
                  {(fullName || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-coral)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #FFFFFF',
                boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
              }}
            >
              {isUploadingAvatar ? (
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#FFF',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }}
                />
              ) : (
                <Camera size={15} color="#FFFFFF" />
              )}
            </div>
          </label>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-coral)' }}>
            Tap to change photo
          </span>
        </div>

        {/* FORM CONTAINER */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '20px 16px',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {/* 2. FULL NAME */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Full Name *
              </label>
              {nameCooldown.isLocked && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#B45309', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Lock size={11} /> 14-day lock active
                </span>
              )}
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
              <input
                type="text"
                disabled={nameCooldown.isLocked}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Fazal Rehman Tariq"
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 36px',
                  borderRadius: '12px',
                  border: `1.5px solid ${nameCooldown.isLocked ? '#E2E8F0' : 'var(--border-light)'}`,
                  fontSize: '13.5px',
                  backgroundColor: nameCooldown.isLocked ? '#F8FAFC' : '#FFFFFF',
                  color: nameCooldown.isLocked ? 'var(--text-muted)' : 'var(--text-primary)',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
            </div>

            {nameCooldown.isLocked ? (
              <p style={{ fontSize: '11.5px', color: '#B45309', marginTop: '5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} /> Name can be changed again in: <strong>{nameCooldown.formatted}</strong>
              </p>
            ) : (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                You can change your full name once every 14 days.
              </p>
            )}
          </div>

          {/* 3. USERNAME */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Username *
              </label>

              {/* Uniqueness feedback badge */}
              {!usernameCooldown.isLocked && normalizedUser.length >= 3 && (
                isUsernameTaken ? (
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#DC2626' }}>
                    ❌ Username already taken
                  </span>
                ) : isUsernameFormatValid ? (
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#059669' }}>
                    ✓ Available
                  </span>
                ) : null
              )}

              {usernameCooldown.isLocked && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#B45309', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Lock size={11} /> Locked
                </span>
              )}
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '12px', fontSize: '15px', fontWeight: 800, color: 'var(--text-muted)' }}>
                @
              </span>
              <input
                type="text"
                disabled={usernameCooldown.isLocked}
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                placeholder="fazalrehman"
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 32px',
                  borderRadius: '12px',
                  border: `1.5px solid ${
                    usernameCooldown.isLocked
                      ? '#E2E8F0'
                      : isUsernameTaken
                      ? '#FCA5A5'
                      : 'var(--border-light)'
                  }`,
                  fontSize: '13.5px',
                  backgroundColor: usernameCooldown.isLocked ? '#F8FAFC' : '#FFFFFF',
                  color: usernameCooldown.isLocked ? 'var(--text-muted)' : 'var(--text-primary)',
                  fontWeight: 700,
                  outline: 'none',
                }}
              />
            </div>

            {usernameCooldown.isLocked ? (
              <p style={{ fontSize: '11.5px', color: '#B45309', marginTop: '5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} /> Username can be changed again in: <strong>{usernameCooldown.formatted}</strong>
              </p>
            ) : (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Allowed: lowercase a-z, 0-9, underscores (_), and periods (.). No spaces.
              </p>
            )}
          </div>

          {/* 4. CITY (Personalization Controller) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                City (Personalization & Feed) *
              </label>
              {cityCooldown.isLocked && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#B45309', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Lock size={11} /> Locked
                </span>
              )}
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <MapPin size={16} color="var(--accent-coral)" style={{ position: 'absolute', left: '12px' }} />
              <select
                disabled={cityCooldown.isLocked}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 36px',
                  borderRadius: '12px',
                  border: `1.5px solid ${cityCooldown.isLocked ? '#E2E8F0' : 'var(--border-light)'}`,
                  fontSize: '13.5px',
                  backgroundColor: cityCooldown.isLocked ? '#F8FAFC' : '#FFFFFF',
                  color: cityCooldown.isLocked ? 'var(--text-muted)' : 'var(--text-primary)',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: cityCooldown.isLocked ? 'not-allowed' : 'pointer',
                  appearance: 'none',
                }}
              >
                {PAKISTAN_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {cityCooldown.isLocked ? (
              <p style={{ fontSize: '11.5px', color: '#B45309', marginTop: '5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} /> City can be changed again in: <strong>{cityCooldown.formatted}</strong>
              </p>
            ) : (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Changing city updates your food drop feed, local kitchen discovery, and recommendations automatically.
              </p>
            )}
          </div>

          {/* 5. FOODIE BIO */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Foodie Bio & Tagline
              </label>
              <span style={{ fontSize: '11px', fontWeight: 700, color: bio.length > 150 ? '#DC2626' : 'var(--text-muted)' }}>
                {bio.length} / 150
              </span>
            </div>

            <textarea
              rows={3}
              maxLength={150}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell people what you love to eat, discover or share… 🍔"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '12px',
                border: `1.5px solid ${bio.length > 150 ? '#FCA5A5' : 'var(--border-light)'}`,
                fontSize: '13px',
                lineHeight: 1.4,
                backgroundColor: '#FFFFFF',
                color: 'var(--text-primary)',
                outline: 'none',
                resize: 'none',
              }}
            />
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Appears directly below your location on your public foodie profile.
            </p>
          </div>

          {/* 6. PAKISTAN MOBILE PHONE NUMBER */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Mobile Phone (Pakistan Only)
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Country Code Prefix */}
              <div
                style={{
                  height: '42px',
                  padding: '0 12px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-butter)',
                  border: '1.5px solid var(--bg-butter-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  color: '#B45309',
                  flexShrink: 0,
                }}
              >
                <span>🇵🇰 +92</span>
              </div>

              {/* Phone Input */}
              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Phone size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
                <input
                  type="tel"
                  value={phoneRaw}
                  onChange={(e) => setPhoneRaw(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                  placeholder="300 1234567"
                  style={{
                    width: '100%',
                    padding: '11px 12px 11px 34px',
                    borderRadius: '12px',
                    border: '1.5px solid var(--border-light)',
                    fontSize: '13.5px',
                    backgroundColor: '#FFFFFF',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
              Only Pakistani numbers (+92 3XX XXXXXXX) are supported for order SMS alerts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
