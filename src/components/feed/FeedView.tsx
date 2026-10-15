import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FoodPost, Restaurant } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { FoodPostCard } from './FoodPostCard';
import { rankFoodPostsStrict } from '../../services/recommendationService';
import {
  Flame,
  Clock,
  Users,
  Star,
  Pizza,
  Beef,
  Soup,
  Sparkles,
  UtensilsCrossed,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from 'lucide-react';

interface FeedViewProps {
  onOpenOrderModal: (post: FoodPost) => void;
  onOpenComments: (post: FoodPost) => void;
  onOpenShare: (post: FoodPost) => void;
  onSelectRestaurant: (restaurantId: string) => void;
  onOpenLocationModal?: () => void;
  onExploreOtherCities?: () => void;
}

type FeedFilter =
  | 'all'
  | 'expiring_soon'
  | 'following'
  | 'top_rated'
  | 'desi'
  | 'pizza'
  | 'burgers'
  | 'japanese'
  | 'desserts';

export const FeedView: React.FC<FeedViewProps> = ({
  onOpenOrderModal,
  onOpenComments,
  onOpenShare,
  onSelectRestaurant,
  onOpenLocationModal,
  onExploreOtherCities,
}) => {
  const { user } = useAuth();
  const { posts, restaurants, userFollows } = useData();
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('all');
  const [dismissedPostIds, setDismissedPostIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  };

  useEffect(() => {
    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleScrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -180, behavior: 'smooth' });
      setTimeout(checkScroll, 320);
    }
  };

  const handleScrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 180, behavior: 'smooth' });
      setTimeout(checkScroll, 320);
    }
  };

  const restaurantsMap = useMemo(() => {
    return Object.fromEntries(restaurants.map((r) => [r.id, r]));
  }, [restaurants]);

  const userCity = user?.city || user?.location?.city || '';

  const handleDismissPost = (postId: string) => {
    setDismissedPostIds((prev) => new Set(prev).add(postId));
  };

  const filteredPosts = useMemo(() => {
    const availablePosts = posts.filter((p) => !dismissedPostIds.has(p.id));

    // STRICT CITY PARTITION: Only returns posts belonging to user's selected city
    let ranked = rankFoodPostsStrict(
      availablePosts,
      restaurantsMap,
      user,
      Array.from(userFollows)
    );

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
        return rest && (rest.rating || 5) >= 4.8;
      });
    } else if (activeFilter === 'desi') {
      ranked = ranked.filter((p) => {
        const rest = restaurantsMap[p.restaurant_id];
        const tags = (p.tags || []).map((t) => t.toLowerCase());
        const cat = (rest?.category || '').toLowerCase();
        const cuisine = (rest?.cuisine || []).map((c) => c.toLowerCase());
        return (
          cat.includes('desi') ||
          cuisine.some((c) => c.includes('biryani') || c.includes('pakistani') || c.includes('karahi')) ||
          tags.some((t) => t.includes('biryani') || t.includes('desi') || t.includes('dum')) ||
          p.product_name.toLowerCase().includes('biryani') ||
          p.product_name.toLowerCase().includes('karahi')
        );
      });
    } else if (activeFilter === 'pizza') {
      ranked = ranked.filter((p) => {
        const rest = restaurantsMap[p.restaurant_id];
        const tags = (p.tags || []).map((t) => t.toLowerCase());
        const cat = (rest?.category || '').toLowerCase();
        return (
          cat.includes('pizza') ||
          tags.some((t) => t.includes('pizza') || t.includes('burrata') || t.includes('crust')) ||
          p.product_name.toLowerCase().includes('pizza')
        );
      });
    } else if (activeFilter === 'burgers') {
      ranked = ranked.filter((p) => {
        const rest = restaurantsMap[p.restaurant_id];
        const tags = (p.tags || []).map((t) => t.toLowerCase());
        const cat = (rest?.category || '').toLowerCase();
        return (
          cat.includes('burger') ||
          tags.some((t) => t.includes('burger') || t.includes('wagyu') || t.includes('sizzle')) ||
          p.product_name.toLowerCase().includes('burger')
        );
      });
    } else if (activeFilter === 'japanese') {
      ranked = ranked.filter((p) => {
        const rest = restaurantsMap[p.restaurant_id];
        const tags = (p.tags || []).map((t) => t.toLowerCase());
        const cat = (rest?.category || '').toLowerCase();
        return (
          cat.includes('japanese') ||
          tags.some((t) => t.includes('sushi') || t.includes('bowl') || t.includes('poke')) ||
          p.product_name.toLowerCase().includes('bowl') ||
          p.product_name.toLowerCase().includes('sushi')
        );
      });
    } else if (activeFilter === 'desserts') {
      ranked = ranked.filter((p) => {
        const rest = restaurantsMap[p.restaurant_id];
        const tags = (p.tags || []).map((t) => t.toLowerCase());
        const cat = (rest?.category || '').toLowerCase();
        return (
          cat.includes('dessert') ||
          tags.some((t) => t.includes('dessert') || t.includes('sweet') || t.includes('cake') || t.includes('churros')) ||
          p.product_name.toLowerCase().includes('churros') ||
          p.product_name.toLowerCase().includes('tiramisu')
        );
      });
    }

    return ranked;
  }, [posts, restaurantsMap, userFollows, activeFilter, user, dismissedPostIds]);

  const filterTabs = [
    { key: 'all' as FeedFilter, label: 'Live Drops', icon: <Flame size={13} /> },
    { key: 'expiring_soon' as FeedFilter, label: 'Expiring Soon', icon: <Clock size={13} /> },
    { key: 'following' as FeedFilter, label: 'Kitchens You Follow', icon: <Users size={13} /> },
    { key: 'top_rated' as FeedFilter, label: 'Top Rated', icon: <Star size={13} /> },
    { key: 'desi' as FeedFilter, label: 'Desi & Biryani', icon: <Sparkles size={13} /> },
    { key: 'pizza' as FeedFilter, label: 'Artisan Pizza', icon: <Pizza size={13} /> },
    { key: 'burgers' as FeedFilter, label: 'Smash Burgers', icon: <Beef size={13} /> },
    { key: 'japanese' as FeedFilter, label: 'Bowls & Sushi', icon: <Soup size={13} /> },
    { key: 'desserts' as FeedFilter, label: 'Desserts', icon: <Sparkles size={13} /> },
  ];

  return (
    <div style={{ padding: '12px 14px 20px' }}>
      {/* Category / Urgency Filter Bar with Left & Right Arrow Navigation */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '10px',
        }}
      >
        {/* Left Arrow Button (Right-to-Left / Left-to-Right Scrolling) */}
        <button
          onClick={handleScrollLeft}
          title="Scroll Left"
          aria-label="Scroll Categories Left"
          style={{
            flexShrink: 0,
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-light)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: canScrollLeft ? 'pointer' : 'default',
            opacity: canScrollLeft ? 1 : 0.3,
            transition: 'all 0.18s ease',
            color: 'var(--text-primary)',
            zIndex: 2,
          }}
          disabled={!canScrollLeft}
        >
          <ChevronLeft size={14} />
        </button>

        {/* Scrollable Chips Container */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          style={{
            flex: 1,
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            padding: '2px 0',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth',
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
                  gap: '5px',
                  padding: '6px 11px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  backgroundColor: isActive ? 'var(--accent-coral)' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                  border: `1px solid ${isActive ? 'var(--accent-coral)' : 'var(--border-light)'}`,
                  boxShadow: isActive ? 'var(--shadow-floating)' : 'var(--shadow-xs)',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Arrow Button (Left-to-Right / Right-to-Left Scrolling) */}
        <button
          onClick={handleScrollRight}
          title="Scroll Right"
          aria-label="Scroll Categories Right"
          style={{
            flexShrink: 0,
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-light)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: canScrollRight ? 'pointer' : 'default',
            opacity: canScrollRight ? 1 : 0.3,
            transition: 'all 0.18s ease',
            color: 'var(--text-primary)',
            zIndex: 2,
          }}
          disabled={!canScrollRight}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Feed Stream */}
      {filteredPosts.length === 0 ? (
        activeFilter === 'all' ? (
          // Dedicated City Empty State: Local Home Feed has no active drops for user's city
          <div
            style={{
              textAlign: 'center',
              padding: '48px 20px',
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              border: '1px solid var(--border-light)',
              marginTop: '12px',
            }}
          >
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-butter)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: '#B45309',
              }}
            >
              <MapPin size={30} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              No Active Drops in {userCity || 'Your City'}
            </h3>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                marginTop: '8px',
                maxWidth: '300px',
                marginInline: 'auto',
                lineHeight: 1.5,
              }}
            >
              Artisanal kitchens in {userCity || 'this city'} haven't dropped live flash offers yet today.
              Explore trending drops in other cities or switch your location.
            </p>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'center',
                marginTop: '18px',
                flexWrap: 'wrap',
              }}
            >
              {onOpenLocationModal && (
                <button
                  onClick={onOpenLocationModal}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '12.5px' }}
                >
                  Change City
                </button>
              )}
              {onExploreOtherCities && (
                <button
                  onClick={onExploreOtherCities}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '12.5px' }}
                >
                  Explore Drops
                </button>
              )}
            </div>
          </div>
        ) : (
          // Category-specific empty state
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
            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                marginTop: '4px',
                maxWidth: '280px',
                marginInline: 'auto',
              }}
            >
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
        )
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
            onDismissPost={handleDismissPost}
          />
        ))
      )}
    </div>
  );
};

