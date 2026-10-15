import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { UserProfile } from '../../types';
import { User, AtSign, Phone, MapPin, FileText, Check } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onSave: (updatedData: Partial<UserProfile>) => Promise<void>;
}

const CITIES = [
  'Lahore',
  'Karachi',
  'Islamabad',
  'Rawalpindi',
  'Peshawar',
  'Quetta',
  'Multan',
  'Faisalabad',
  'Sialkot',
  'Gujranwala',
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
}) => {
  const [fullName, setFullName] = useState(user?.name || user?.full_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState(user?.location?.city || 'Lahore');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.name || user.full_name || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setPhone(user.phone || '');
      setCity(user.location?.city || 'Lahore');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        name: fullName.trim() || 'Foodie Explorer',
        full_name: fullName.trim() || 'Foodie Explorer',
        username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'user',
        bio: bio.trim(),
        phone: phone.trim(),
        location: user?.location
          ? { ...user.location, city }
          : { address: city, city, lat: 33.6844, lng: 73.0479 },
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Profile"
      subtitle="Update your personal information & foodie bio"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Full Name */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>
            Full Name *
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                borderRadius: '10px',
                border: '1px solid var(--border-light)',
                fontSize: '13.5px',
                backgroundColor: '#FFFFFF',
              }}
            />
          </div>
        </div>

        {/* Username */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>
            Username *
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <AtSign size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                borderRadius: '10px',
                border: '1px solid var(--border-light)',
                fontSize: '13.5px',
                backgroundColor: '#FFFFFF',
              }}
            />
          </div>
        </div>

        {/* Bio */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>
            Foodie Bio / Tagline
          </label>
          <textarea
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="e.g. Hunting the crispiest smash burgers & authentic dum biryani 🍔"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid var(--border-light)',
              fontSize: '13px',
              backgroundColor: '#FFFFFF',
              resize: 'none',
            }}
          />
        </div>

        {/* Phone & City */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>
              Mobile Phone
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Phone size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px' }} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555-019-2834"
                style={{
                  width: '100%',
                  padding: '10px 10px 10px 30px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-light)',
                  fontSize: '12.5px',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '5px' }}>
              City
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <MapPin size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px' }} />
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 10px 10px 30px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-light)',
                  fontSize: '12.5px',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid var(--border-light)',
              backgroundColor: 'var(--bg-subtle)',
              fontSize: '13.5px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
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
              backgroundColor: 'var(--accent-coral)',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(226, 75, 54, 0.35)',
              cursor: isSaving ? 'wait' : 'pointer',
            }}
          >
            <Check size={16} />
            <span>{isSaving ? 'Saving Changes...' : 'Save Profile'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
