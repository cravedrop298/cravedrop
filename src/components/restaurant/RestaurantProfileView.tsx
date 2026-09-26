import React, { useState } from 'react';
import { Restaurant, FoodPost, Product } from '../../types';
import { useData } from '../../context/DataContext';
import { useTranslation } from '../../i18n';
import {
  Star,
  Clock,
  MapPin,
  Bike,
  CheckCircle2,
  ChevronLeft,
  Flame,
  UtensilsCrossed,
  MessageSquare,
  Info,
  Plus,
} from 'lucide-react';
import { ExpiryCountdown } from '../common/ExpiryCountdown';
import { isPostExpired } from '../../services/expiryService';

interface RestaurantProfileViewProps {
  restaurantId: string;
  onBack: () => void;
  onOpenOrderModal: (post: FoodPost) => void;
  onSelectProduct: (product: Product) => void;
}

type TabType = 'posts' | 'menu' | 'reviews' | 'about';

export const RestaurantProfileView: React.FC<RestaurantProfileViewProps> = ({
  restaurantId,
  onBack,
  onOpenOrderModal,
  onSelectProduct,
}) => {
  const { restaurants, posts, products, userFollows, toggleFollow } = useData();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<TabType>('posts');

  const restaurant = restaurants.find((r) => r.id === restaurantId);

  if (!restaurant) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p>Kitchen not found.</p>
        <button onClick={onBack} className="btn-secondary" style={{ marginTop: '12px' }}>
          Back to feed
        </button>
      </div>
    );
  }

  const isFollowing = userFollows.has(restaurant.id);
  const restaurantPosts = posts.filter((p) => p.restaurant_id === restaurant.id);
  const activePosts = restaurantPosts.filter((p) => !isPostExpired(p.expires_at));
  const restaurantProducts = products.filter((p) => p.restaurant_id === restaurant.id);

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Cover Image & Back Button */}
      <div style={{ position: 'relative', width: '100%', height: '170px' }}>
        <img
          src={restaurant.cover_url}
          alt={restaurant.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            top: '14px',
            left: '14px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-xs)',
            cursor: 'pointer',
          }}
        >
          <ChevronLeft size={20} color="var(--text-primary)" />
        </button>
      </div>

      {/* Header Info */}
      <div style={{ padding: '0 16px', marginTop: '-34px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
          <img
            src={restaurant.logo_url}
            alt={restaurant.name}
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid #FFFFFF',
              boxShadow: 'var(--shadow-sm)',
            }}
          />

          <button
            onClick={() => toggleFollow(restaurant.id)}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-full)',
              fontSize: '13px',
              fontWeight: 700,
              backgroundColor: isFollowing ? 'var(--bg-subtle)' : 'var(--accent-coral)',
              color: isFollowing ? 'var(--text-secondary)' : '#FFFFFF',
              border: `1px solid ${isFollowing ? 'var(--border-light)' : 'var(--accent-coral)'}`,
              boxShadow: isFollowing ? 'none' : 'var(--shadow-floating)',
            }}
          >
            {isFollowing ? t('following') : `+ ${t('follow')}`}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800 }}>{restaurant.name}</h2>
          {restaurant.is_verified && <span className="badge-verified">✓</span>}
        </div>

        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
          {restaurant.bio}
        </p>

        {/* Stats Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginTop: '12px',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-light)',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#B45309', fontWeight: 700 }}>
            <Star size={13} fill="#B45309" />
            <span>{restaurant.rating}</span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({restaurant.review_count})</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
            <Bike size={13} />
            <span>{restaurant.delivery_time_min}-{restaurant.delivery_time_max}m</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
            <Clock size={13} />
            <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>{restaurant.opening_hours}</span>
          </div>
        </div>
      </div>

      {/* 4 Tabs: POSTS / MENU / REVIEWS / ABOUT */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          margin: '16px 16px 14px',
        }}
      >
        {[
          { key: 'posts' as TabType, label: `${t('tab_posts')} (${activePosts.length})`, icon: <Flame size={14} /> },
          { key: 'menu' as TabType, label: t('tab_menu'), icon: <UtensilsCrossed size={14} /> },
          { key: 'reviews' as TabType, label: t('tab_reviews'), icon: <MessageSquare size={14} /> },
          { key: 'about' as TabType, label: t('tab_about'), icon: <Info size={14} /> },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: '10px 4px',
                fontSize: '12.5px',
                fontWeight: 700,
                color: isActive ? 'var(--accent-coral)' : 'var(--text-secondary)',
                borderBottom: `2.5px solid ${isActive ? 'var(--accent-coral)' : 'transparent'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Live Food Drops */}
      {activeTab === 'posts' && (
        <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {activePosts.length === 0 ? (
            <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '30px 10px', color: 'var(--text-secondary)' }}>
              <p>No active drops right now.</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>Check back soon or explore the full menu.</p>
            </div>
          ) : (
            activePosts.map((post) => (
              <div
                key={post.id}
                onClick={() => onOpenOrderModal(post)}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-light)',
                  boxShadow: 'var(--shadow-xs)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ height: '130px', position: 'relative' }}>
                  <img
                    src={post.thumbnail_url}
                    alt={post.product_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', top: '6px', right: '6px' }}>
                    <ExpiryCountdown expiresAt={post.expires_at} compact />
                  </div>
                </div>
                <div style={{ padding: '10px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {post.product_name}
                  </h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-coral)' }}>
                      ${post.product_price.toFixed(2)}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--accent-coral)', fontWeight: 700 }}>
                      Order Drop →
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Full Menu */}
      {activeTab === 'menu' && (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {restaurantProducts.map((prod) => (
            <div
              key={prod.id}
              onClick={() => onSelectProduct(prod)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid var(--border-light)',
                boxShadow: 'var(--shadow-xs)',
                cursor: 'pointer',
              }}
            >
              <img
                src={prod.image_url}
                alt={prod.name}
                style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {prod.name}
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {prod.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--accent-coral)' }}>
                    ${prod.price.toFixed(2)}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    · ~{prod.prep_time_mins} mins
                  </span>
                </div>
              </div>
              <button
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-coral-light)',
                  color: 'var(--accent-coral)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Plus size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Reviews */}
      {activeTab === 'reviews' && (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { name: 'Sara Ahmed', rating: 5, time: '2 days ago', text: 'Best woodfired pizza in town! The burrata hot honey combo was perfection.' },
            { name: 'Bilal Malik', rating: 5, time: '1 week ago', text: 'Fast delivery and arrived super hot. Dough is light and airy.' },
            { name: 'Maria Gomez', rating: 4, time: '2 weeks ago', text: 'Generous toppings and delicious crust. Will order the garlic knots next time too!' },
          ].map((rev, i) => (
            <div
              key={i}
              style={{
                padding: '12px',
                backgroundColor: '#FFFFFF',
                borderRadius: '14px',
                border: '1px solid var(--border-light)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 700 }}>{rev.name}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{rev.time}</span>
              </div>
              <div style={{ display: 'flex', gap: '2px', margin: '4px 0 6px' }}>
                {Array.from({ length: rev.rating }).map((_, idx) => (
                  <Star key={idx} size={11} fill="#F59E0B" color="#F59E0B" />
                ))}
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>"{rev.text}"</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: About */}
      {activeTab === 'about' && (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ backgroundColor: '#FFFFFF', padding: '14px', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '6px' }}>Location & Kitchen</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <MapPin size={15} color="var(--accent-coral)" />
              <span>{restaurant.address}, {restaurant.city}</span>
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', padding: '14px', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '6px' }}>Cuisine & Specialties</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {restaurant.cuisine.map((c) => (
                <span
                  key={c}
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 600,
                    backgroundColor: 'var(--bg-butter)',
                    color: '#B45309',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    border: '1px solid var(--bg-butter-border)',
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
