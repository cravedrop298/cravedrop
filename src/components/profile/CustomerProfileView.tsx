import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTranslation } from '../../i18n';
import { FoodPost } from '../../types';
import { isPostExpired } from '../../services/expiryService';
import { ExpiryCountdown } from '../common/ExpiryCountdown';
import {
  Bookmark,
  Store,
  Clock,
  Globe,
  LogOut,
  MapPin,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface CustomerProfileViewProps {
  onOpenOrderModal: (post: FoodPost) => void;
  onSelectRestaurant: (restaurantId: string) => void;
}

type ProfileTab = 'saved' | 'following';

export const CustomerProfileView: React.FC<CustomerProfileViewProps> = ({
  onOpenOrderModal,
  onSelectRestaurant,
}) => {
  const { user, switchRole } = useAuth();
  const { posts, restaurants, userSaves, userFollows } = useData();
  const { language, setLanguage, t } = useTranslation();

  const [activeTab, setActiveTab] = useState<ProfileTab>('saved');

  // Saved food drops
  const savedPosts = posts.filter((p) => userSaves.has(p.id));

  // Followed restaurants
  const followedRestaurants = restaurants.filter((r) => userFollows.has(r.id));

  return (
    <div style={{ padding: '16px 16px 40px' }}>
      {/* Profile Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '20px 16px',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)',
          textAlign: 'center',
          position: 'relative',
          marginBottom: '20px',
        }}
      >
        <img
          src={user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'}
          alt={user?.name || 'User'}
          style={{
            width: '74px',
            height: '74px',
            borderRadius: '50%',
            objectFit: 'cover',
            margin: '0 auto 10px',
            border: '3px solid var(--accent-coral-light)',
          }}
        />

        <h3 style={{ fontSize: '18px', fontWeight: 800 }}>{user?.name || 'Foodie Explorer'}</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{user?.username || 'user'}</p>

        {user?.location && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'var(--bg-subtle)',
              padding: '3px 10px',
              borderRadius: '12px',
              fontSize: '11.5px',
              color: 'var(--text-secondary)',
              marginTop: '8px',
            }}
          >
            <MapPin size={11} color="var(--accent-coral)" />
            <span>{user.location.city}</span>
          </div>
        )}

        {/* Quick Stats */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            borderTop: '1px solid var(--border-subtle)',
            marginTop: '16px',
            paddingTop: '12px',
          }}
        >
          <div>
            <span style={{ fontSize: '16px', fontWeight: 800 }}>{savedPosts.length}</span>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Saved Drops</p>
          </div>
          <div>
            <span style={{ fontSize: '16px', fontWeight: 800 }}>{followedRestaurants.length}</span>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Following</p>
          </div>
          <div>
            <span style={{ fontSize: '16px', fontWeight: 800 }}>2</span>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Past Orders</p>
          </div>
        </div>
      </div>

      {/* Tabs: Saved Drops vs Following */}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-md)',
          padding: '4px',
          border: '1px solid var(--border-light)',
          marginBottom: '16px',
        }}
      >
        <button
          onClick={() => setActiveTab('saved')}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12.5px',
            fontWeight: 700,
            backgroundColor: activeTab === 'saved' ? 'var(--accent-coral)' : 'transparent',
            color: activeTab === 'saved' ? '#FFFFFF' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Bookmark size={14} />
          <span>Saved Drops ({savedPosts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('following')}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12.5px',
            fontWeight: 700,
            backgroundColor: activeTab === 'following' ? 'var(--accent-coral)' : 'transparent',
            color: activeTab === 'following' ? '#FFFFFF' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Store size={14} />
          <span>Following ({followedRestaurants.length})</span>
        </button>
      </div>

      {/* TAB 1: SAVED POSTS (Shows Active vs Expired Statuses as required) */}
      {activeTab === 'saved' && (
        <div>
          {savedPosts.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                border: '1px solid var(--border-light)',
              }}
            >
              <Bookmark size={32} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
              <p style={{ fontSize: '14px', fontWeight: 700 }}>No saved food drops</p>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Save something delicious and find it here later.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {savedPosts.map((post) => {
                const expired = isPostExpired(post.expires_at);

                return (
                  <div
                    key={post.id}
                    onClick={() => onOpenOrderModal(post)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '16px',
                      padding: '12px',
                      border: '1px solid var(--border-light)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      opacity: expired ? 0.8 : 1,
                    }}
                  >
                    <div style={{ position: 'relative', width: '68px', height: '68px', flexShrink: 0 }}>
                      <img
                        src={post.thumbnail_url}
                        alt={post.product_name}
                        style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover' }}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h4 style={{ fontSize: '13.5px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {post.product_name}
                        </h4>
                      </div>
                      <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{post.restaurant_name}</p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-coral)' }}>
                          ${post.product_price.toFixed(2)}
                        </span>
                        <ExpiryCountdown expiresAt={post.expires_at} compact />
                      </div>
                    </div>

                    <ChevronRight size={16} color="var(--text-muted)" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FOLLOWING KITCHENS */}
      {activeTab === 'following' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {followedRestaurants.map((rest) => (
            <div
              key={rest.id}
              onClick={() => onSelectRestaurant(rest.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid var(--border-light)',
                cursor: 'pointer',
              }}
            >
              <img
                src={rest.logo_url}
                alt={rest.name}
                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800 }}>{rest.name}</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{rest.category} · {rest.city}</p>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--accent-coral)', fontWeight: 700 }}>
                View Kitchen →
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Settings & Preferences Section */}
      <div
        style={{
          marginTop: '24px',
          backgroundColor: '#FFFFFF',
          borderRadius: '18px',
          padding: '14px 16px',
          border: '1px solid var(--border-light)',
        }}
      >
        <h4 style={{ fontSize: '13px', fontWeight: 800, marginBottom: '12px', color: 'var(--text-secondary)' }}>
          Preferences & Settings
        </h4>

        {/* Language switch */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={16} color="var(--text-secondary)" />
            <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{t('language')}</span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setLanguage('en')}
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                backgroundColor: language === 'en' ? 'var(--accent-coral)' : 'var(--bg-subtle)',
                color: language === 'en' ? 'white' : 'var(--text-secondary)',
                border: 'none',
              }}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('ur')}
              style={{
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                backgroundColor: language === 'ur' ? 'var(--accent-coral)' : 'var(--bg-subtle)',
                color: language === 'ur' ? 'white' : 'var(--text-secondary)',
                border: 'none',
              }}
            >
              اردو
            </button>
          </div>
        </div>

        {/* Switch to partner account */}
        <div
          onClick={() => switchRole('restaurant')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 0',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Store size={16} color="var(--accent-coral)" />
            <span style={{ fontSize: '13.5px', fontWeight: 600 }}>Open Kitchen Partner Dashboard</span>
          </div>
          <ChevronRight size={16} color="var(--text-muted)" />
        </div>
      </div>
    </div>
  );
};
