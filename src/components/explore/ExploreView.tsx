import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useTranslation } from '../../i18n';
import { FoodPost, Product, Restaurant } from '../../types';
import { Search, Flame, Clock, MapPin, Store, Sparkles, Star } from 'lucide-react';
import { isPostExpired } from '../../services/expiryService';
import { ExpiryCountdown } from '../common/ExpiryCountdown';

interface ExploreViewProps {
  onOpenOrderModal: (post: FoodPost) => void;
  onSelectProduct: (product: Product) => void;
  onSelectRestaurant: (restaurantId: string) => void;
}

const CATEGORIES = [
  { label: 'All', icon: '✨' },
  { label: 'Pizza', icon: '🍕' },
  { label: 'Burgers', icon: '🍔' },
  { label: 'Desi', icon: '🍲' },
  { label: 'Japanese', icon: '🍣' },
  { label: 'Cafe', icon: '☕' },
  { label: 'Shawarma', icon: '🌯' },
  { label: 'Desserts', icon: '🍫' },
];

export const ExploreView: React.FC<ExploreViewProps> = ({
  onOpenOrderModal,
  onSelectProduct,
  onSelectRestaurant,
}) => {
  const { restaurants, products, posts } = useData();
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Search filter
  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const matchedRestaurants = restaurants.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.cuisine.some((c) => c.toLowerCase().includes(q))
    );

    const matchedProducts = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );

    const matchedPosts = posts.filter(
      (post) =>
        !isPostExpired(post.expires_at) &&
        (post.product_name.toLowerCase().includes(q) ||
          post.caption.toLowerCase().includes(q) ||
          post.restaurant_name.toLowerCase().includes(q) ||
          post.tags.some((tag) => tag.toLowerCase().includes(q)))
    );

    return {
      restaurants: matchedRestaurants,
      products: matchedProducts,
      posts: matchedPosts,
    };
  }, [searchQuery, restaurants, products, posts]);

  // Expiring soon drops
  const expiringSoonDrops = useMemo(() => {
    return posts.filter((p) => {
      if (isPostExpired(p.expires_at)) return false;
      const remainingHours = (new Date(p.expires_at).getTime() - Date.now()) / (1000 * 60 * 60);
      return remainingHours > 0 && remainingHours <= 4;
    });
  }, [posts]);

  // Filtered products by category
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'All') return products;
    return products.filter((p) => p.category.toLowerCase() === selectedCategory.toLowerCase());
  }, [products, selectedCategory]);

  return (
    <div style={{ padding: '16px 16px 30px' }}>
      {/* Search Bar Input */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('search_placeholder')}
          className="input-control"
          style={{
            paddingLeft: '40px',
            backgroundColor: '#FFFFFF',
            boxShadow: 'var(--shadow-xs)',
          }}
        />
        <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: '12px',
              top: '14px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              fontWeight: 600,
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* If Searching, show grouped search results */}
      {searchQuery.trim().length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Matched Kitchens */}
          {searchResults.restaurants.length > 0 && (
            <section>
              <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '10px' }}>
                Kitchens ({searchResults.restaurants.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {searchResults.restaurants.map((rest) => (
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
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {rest.category} · {rest.rating} ★ ({rest.review_count})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Matched Live Food Drops */}
          {searchResults.posts.length > 0 && (
            <section>
              <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '10px' }}>
                Live Drops ({searchResults.posts.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {searchResults.posts.map((post) => (
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
                    <div style={{ height: '110px', position: 'relative' }}>
                      <img
                        src={post.thumbnail_url}
                        alt={post.product_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{ position: 'absolute', top: '6px', right: '6px' }}>
                        <ExpiryCountdown expiresAt={post.expires_at} compact />
                      </div>
                    </div>
                    <div style={{ padding: '8px 10px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {post.product_name}
                      </h4>
                      <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--accent-coral)' }}>
                        ${post.product_price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Matched Menu Products */}
          {searchResults.products.length > 0 && (
            <section>
              <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '10px' }}>
                Menu Items ({searchResults.products.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {searchResults.products.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => onSelectProduct(prod)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '14px',
                      border: '1px solid var(--border-light)',
                      cursor: 'pointer',
                    }}
                  >
                    <img
                      src={prod.image_url}
                      alt={prod.name}
                      style={{ width: '50px', height: '50px', borderRadius: '10px', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '13.5px', fontWeight: 700 }}>{prod.name}</h4>
                      <span style={{ fontSize: '12.5px', color: 'var(--accent-coral)', fontWeight: 800 }}>
                        ${prod.price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {searchResults.restaurants.length === 0 &&
            searchResults.posts.length === 0 &&
            searchResults.products.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                <p style={{ fontSize: '14px', fontWeight: 700 }}>No results found for "{searchQuery}"</p>
                <p style={{ fontSize: '12.5px', marginTop: '4px' }}>Try searching for pizza, burgers, biryani or coffee.</p>
              </div>
            )}
        </div>
      ) : (
        /* Discovery Main Content */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Category Chips Bar */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.label;
              return (
                <button
                  key={cat.label}
                  onClick={() => setSelectedCategory(cat.label)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    backgroundColor: active ? 'var(--accent-coral)' : '#FFFFFF',
                    color: active ? '#FFFFFF' : 'var(--text-primary)',
                    border: `1px solid ${active ? 'var(--accent-coral)' : 'var(--border-light)'}`,
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Expiring Soon Drops Carousel */}
          {expiringSoonDrops.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} color="var(--accent-coral)" />
                  <h3 style={{ fontSize: '15px', fontWeight: 800 }}>{t('expiring_soon')}</h3>
                </div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Urgent Drops</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  overflowX: 'auto',
                  paddingBottom: '8px',
                  scrollbarWidth: 'none',
                }}
              >
                {expiringSoonDrops.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => onOpenOrderModal(post)}
                    style={{
                      minWidth: '160px',
                      maxWidth: '160px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      border: '1.5px solid var(--bg-butter-border)',
                      boxShadow: 'var(--shadow-xs)',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ height: '110px', position: 'relative' }}>
                      <img
                        src={post.thumbnail_url}
                        alt={post.product_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{ position: 'absolute', top: '6px', right: '6px' }}>
                        <ExpiryCountdown expiresAt={post.expires_at} compact />
                      </div>
                    </div>
                    <div style={{ padding: '8px 10px' }}>
                      <h4 style={{ fontSize: '12.5px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {post.product_name}
                      </h4>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{post.restaurant_name}</p>
                      <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--accent-coral)' }}>
                        ${post.product_price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Popular Kitchens Grid */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Store size={16} color="var(--accent-coral)" />
                <h3 style={{ fontSize: '15px', fontWeight: 800 }}>Top Rated Kitchens</h3>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {restaurants.slice(0, 4).map((rest) => (
                <div
                  key={rest.id}
                  onClick={() => onSelectRestaurant(rest.id)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '1px solid var(--border-light)',
                    boxShadow: 'var(--shadow-xs)',
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src={rest.cover_url}
                    alt={rest.name}
                    style={{ width: '100%', height: '80px', objectFit: 'cover' }}
                  />
                  <div style={{ padding: '8px 10px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {rest.name}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '3px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{rest.category}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#B45309', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Star size={10} fill="#B45309" />
                        {rest.rating}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recommended Food Dishes */}
          <section>
            <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '12px' }}>
              {selectedCategory === 'All' ? 'Curated Specials' : `${selectedCategory} Specials`}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredProducts.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => onSelectProduct(prod)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px',
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
                    <h4 style={{ fontSize: '13.5px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {prod.name}
                    </h4>
                    <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {prod.description}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-coral)' }}>
                        ${prod.price.toFixed(2)}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        ~{prod.prep_time_mins}m prep
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
