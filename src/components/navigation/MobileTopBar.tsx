import React from 'react';
import { BRAND } from '../../config/brand';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { Bell, Globe } from 'lucide-react';

interface MobileTopBarProps {
  onOpenNotifications: () => void;
  onOpenLocationModal?: () => void;
  onOpenProfile?: () => void;
  onLogoClick?: () => void;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({
  onOpenNotifications,
  onOpenProfile,
  onLogoClick,
}) => {
  const { notifications } = useData();
  const { user } = useAuth();
  const { language, setLanguage } = useTranslation();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ur' : 'en');
  };

  return (
    <header
      style={{
        minHeight: 'calc(var(--top-bar-height) + env(safe-area-inset-top, 0px))',
        paddingTop: 'max(10px, env(safe-area-inset-top, 0px))',
        paddingBottom: '8px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '12px',
        paddingRight: '12px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxSizing: 'border-box',
      }}
    >
      {/* Brand Logo & Name (clickable to scroll to top / reload feed) */}
      <button
        onClick={onLogoClick}
        title="Crave Drop Home"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          cursor: onLogoClick ? 'pointer' : 'default',
          padding: 0,
        }}
      >
        <img
          src={BRAND.logo.imageUrl}
          alt={BRAND.name}
          style={{ width: '25px', height: '25px', borderRadius: '6px', objectFit: 'contain' }}
        />
        <div style={{ display: 'flex', alignItems: 'baseline', lineHeight: 1, gap: '3px' }}>
          <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>
            {BRAND.logo.primaryText}
          </span>
          <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--accent-coral)', letterSpacing: '-0.4px' }}>
            {BRAND.logo.accentText}
          </span>
        </div>
      </button>

      {/* Right Actions: Language Switcher, Notifications & Profile Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Language Toggle */}
        <button
          onClick={toggleLanguage}
          title="Switch Language (English / Urdu)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: 'var(--radius-full)',
            fontSize: '11px',
            fontWeight: 800,
            backgroundColor: 'var(--bg-subtle)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-light)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Globe size={12} />
          <span>{language === 'en' ? 'UR' : 'EN'}</span>
        </button>

        {/* Notifications Bell */}
        <button
          onClick={onOpenNotifications}
          title="Notifications"
          style={{
            position: 'relative',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-subtle)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-light)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '3px',
                right: '3px',
                width: '7px',
                height: '7px',
                backgroundColor: 'var(--accent-coral)',
                borderRadius: '50%',
                border: '1.5px solid white',
              }}
            />
          )}
        </button>

        {/* User Avatar — clickable to open profile */}
        <button
          onClick={onOpenProfile}
          title={user?.name ? `${user.name} - View Profile` : 'View Profile'}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: onOpenProfile ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'transform 0.15s ease',
          }}
        >
          {user && (
            user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name || 'Profile'}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--accent-coral-light)',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #E2614A 0%, #F4956A 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid var(--accent-coral-light)',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#FFF', lineHeight: 1, userSelect: 'none' }}>
                  {(user?.name || user?.full_name || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
            )
          )}
        </button>
      </div>
    </header>
  );
};
