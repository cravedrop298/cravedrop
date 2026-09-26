import React, { useState, useMemo } from 'react';
import { FoodPost, Restaurant } from '../../types';
import { useData } from '../../context/DataContext';
import { useTranslation } from '../../i18n';
import { FoodPostCard } from './FoodPostCard';
import { rankFoodPosts } from '../../services/feedAlgorithm';
import { Flame, Clock, Users, Star, UtensilsCrossed } from 'lucide-react';

interface FeedViewProps {
  onOpenOrderModal: (post: FoodPost) => void;
  onOpenComments: (post: FoodPost) => void;
  onOpenShare: (post: FoodPost) => void;
  onSelectRestaurant: (restaurantId: string) => void;
}

type FeedFilter = 'all' | 'expiring_soon' | 'following' | 'top_rated';

export const FeedView: React.FC<FeedViewProps> = ({
  onOpenOrderModal,
  onOpenComments,
  onOpenShare,
  onSelectRestaurant,
}) => {
  const { posts, restaurants, userFollows } = useData();
  const { t } = useTranslation();

  const [activeFilter, setActiveFilter] = useState<FeedFilter>('all');

  const restaurantsMap = useMemo(() => {
    return Object.fromEntries(restaurants.map((r) => [r.id, r]));
  }, [restaurants]);

  const filteredPosts = useMemo(() => {
    let ranked = rankFoodPosts(posts, restaurantsMap, {
      userFollowedRestaurantIds: Array.from(userFollows),
    });

    if (activeFilter === 'expiring_soon') {
      ranked = ranked.filter((p) => {
        const remainingHours = (new Date(p.expires_at).getTime() - Date.now()) / (1000 * 60 * 60);
        return remainingHours > 0 && remainingHours <= 3;
      });
    } else if (activeFilter === 'following') {
      ranked = ranked.filter((p) => userFollows.has(p.restaurant_id));
    } else if (activeFilter === 'top_rated') {
      ranked = ranked.filter((p) => {
        const rest = restaurantsMap[p.restaurant_id];
        return rest && rest.rating >= 4.8;
      });
    }

    return ranked;
  }, [posts, restaurantsMap, userFollows, activeFilter]);

  const filterTabs = [
    { key: 'all' as FeedFilter, label: 'Live Drops', icon: <Flame size={13} /> },
    { key: 'expiring_soon' as FeedFilter, label: 'Expiring Soon', icon: <Clock size={13} /> },
    { key: 'following' as FeedFilter, label: 'Kitchens You Follow', icon: <Users size={13} /> },
    { key: 'top_rated' as FeedFilter, label: 'Top Rated', icon: <Star size={13} /> },
  ];

  return (
    <div style={{ padding: '12px 14px 20px' }}>
      {/* Category / Urgency Filter Bar */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '12px',
          scrollbarWidth: 'none',
        }}
      >
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '12.5px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                backgroundColor: isActive ? 'var(--accent-coral)' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                border: `1px solid ${isActive ? 'var(--accent-coral)' : 'var(--border-light)'}`,
                boxShadow: isActive ? 'var(--shadow-floating)' : 'var(--shadow-xs)',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Feed Stream */}
      {filteredPosts.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '50px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            border: '1px solid var(--border-light)',
            marginTop: '12px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-butter)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              color: '#B45309',
            }}
          >
            <UtensilsCrossed size={28} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
            No Food Drops In This Filter
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '280px', marginInline: 'auto' }}>
            {activeFilter === 'expiring_soon'
              ? 'No drops currently within their final 3 hours. Check out all live drops!'
              : activeFilter === 'following'
              ? 'Follow favorite kitchens to see their limited-time drops here.'
              : 'Discover more drops or switch back to the main feed.'}
          </p>
          <button
            onClick={() => setActiveFilter('all')}
            className="btn-secondary"
            style={{ marginTop: '16px' }}
          >
            Show All Drops
          </button>
        </div>
      ) : (
        filteredPosts.map((post) => (
          <FoodPostCard
            key={post.id}
            post={post}
            restaurant={restaurantsMap[post.restaurant_id]}
            onOpenOrderModal={onOpenOrderModal}
            onOpenComments={onOpenComments}
            onOpenShare={onOpenShare}
            onSelectRestaurant={onSelectRestaurant}
          />
        ))
      )}
    </div>
  );
};
