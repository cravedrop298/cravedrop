import React, { useState } from 'react';
import { BRAND } from '../../config/brand';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTranslation } from '../../i18n';
import { MapPin, Bell, Globe, UserCheck, ShieldAlert, Store, User } from 'lucide-react';
import { Modal } from '../common/Modal';
import { UserRole } from '../../types';

interface MobileTopBarProps {
  onOpenNotifications: () => void;
  onOpenLocationModal: () => void;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({
  onOpenNotifications,
  onOpenLocationModal,
}) => {
  const { role, switchRole, user } = useAuth();
  const { notifications } = useData();
  const { language, setLanguage, t } = useTranslation();

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const roleLabels: Record<UserRole, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
    customer: { label: 'Customer', icon: <User size={13} />, color: '#B45309', bg: 'var(--bg-butter)' },
    restaurant: { label: 'Kitchen Partner', icon: <Store size={13} />, color: 'var(--accent-coral)', bg: 'var(--accent-coral-light)' },
    admin: { label: 'Admin', icon: <ShieldAlert size={13} />, color: '#1E293B', bg: '#E2E8F0' },
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ur' : 'en');
  };

  return (
    <>
      <header
        style={{
          height: 'var(--top-bar-height)',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        {/* Brand & Location */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '20px' }}>{BRAND.logo.emoji}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', lineHeight: 1 }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                {BRAND.logo.primaryText}
              </span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-coral)', letterSpacing: '-0.5px' }}>
                {BRAND.logo.accentText}
              </span>
            </div>
          </div>

          {/* Location button */}
          <button
            onClick={onOpenLocationModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'var(--bg-subtle)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-full)',
              fontSize: '11.5px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <MapPin size={11} color="var(--accent-coral)" />
            <span style={{ maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.location?.city || 'Metropolis'}
            </span>
          </button>
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            title="Switch Language (English / Urdu)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              padding: '5px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-light)',
            }}
          >
            <Globe size={12} />
            <span>{language === 'en' ? 'UR' : 'EN'}</span>
          </button>

          {/* Role Indicator / Switcher Pill */}
          <button
            onClick={() => setIsRoleModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 9px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: roleLabels[role].bg,
              color: roleLabels[role].color,
              fontSize: '11px',
              fontWeight: 700,
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            {roleLabels[role].icon}
            <span>{roleLabels[role].label}</span>
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            style={{
              position: 'relative',
              padding: '7px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '1px',
                  right: '1px',
                  width: '8px',
                  height: '8px',
                  backgroundColor: 'var(--accent-coral)',
                  borderRadius: '50%',
                  border: '2px solid white',
                }}
              />
            )}
          </button>
        </div>
      </header>

      {/* Switch Persona / Role Modal */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title="Switch Interactive Role"
        subtitle="Experience CraveDrop from all three perspectives:"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Customer */}
          <div
            onClick={() => {
              switchRole('customer');
              setIsRoleModalOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              border: `2px solid ${role === 'customer' ? 'var(--accent-coral)' : 'var(--border-light)'}`,
              backgroundColor: role === 'customer' ? 'var(--accent-coral-light)' : 'var(--bg-surface)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-butter)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#B45309',
              }}
            >
              <User size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Customer (Hamza Khan)</h4>
                {role === 'customer' && <span style={{ fontSize: '11px', color: 'var(--accent-coral)', fontWeight: 700 }}>Active</span>}
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Browse food video feed, like, comment, share, save, and order with Cash on Delivery.
              </p>
            </div>
          </div>

          {/* Restaurant / Vendor */}
          <div
            onClick={() => {
              switchRole('restaurant');
              setIsRoleModalOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              border: `2px solid ${role === 'restaurant' ? 'var(--accent-coral)' : 'var(--border-light)'}`,
              backgroundColor: role === 'restaurant' ? 'var(--accent-coral-light)' : 'var(--bg-surface)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-coral-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-coral)',
              }}
            >
              <Store size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Restaurant Partner (FireCrust)</h4>
                {role === 'restaurant' && <span style={{ fontSize: '11px', color: 'var(--accent-coral)', fontWeight: 700 }}>Active</span>}
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Drop limited-time food posts with countdown expiry, accept/manage orders, view kitchen analytics.
              </p>
            </div>
          </div>

          {/* Admin */}
          <div
            onClick={() => {
              switchRole('admin');
              setIsRoleModalOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              border: `2px solid ${role === 'admin' ? 'var(--accent-coral)' : 'var(--border-light)'}`,
              backgroundColor: role === 'admin' ? 'var(--accent-coral-light)' : 'var(--bg-surface)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#334155',
              }}
            >
              <ShieldAlert size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Platform Moderator / Admin</h4>
                {role === 'admin' && <span style={{ fontSize: '11px', color: 'var(--accent-coral)', fontWeight: 700 }}>Active</span>}
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Review reports, approve restaurants, moderate posts/comments, oversee platform metrics.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
