import React from 'react';
import { ChevronRight, Bookmark, ShoppingBag, Sparkles, AlertCircle, Trash2 } from 'lucide-react';
import { FoodPost } from '../../types';
import { useData } from '../../context/DataContext';
import { isPostExpired } from '../../services/expiryService';

interface MySavedViewProps {
  onBack: () => void;
  onOpenOrderModal: (post: FoodPost) => void;
  onSelectRestaurant: (restaurantId: string) => void;
}

export const MySavedView: React.FC<MySavedViewProps> = ({
  onBack,
  onOpenOrderModal,
  onSelectRestaurant,
}) => {
  const { posts, userSaves, toggleSave } = useData();

  // Filter saved posts that are active (auto-excludes expired items per Req #27)
  const savedPosts = posts.filter((post) => {
    if (!userSaves.has(post.id)) return false;
    const expired = isPostExpired(post.expires_at) || post.is_expired;
    return !expired;
  });

  return (
    <div style={{ padding: '16px 16px 40px', backgroundColor: '#FAF7F2', minHeight: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--border-light)',
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--border-light)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <ChevronRight size={20} color="var(--text-primary)" style={{ transform: 'rotate(180deg)' }} />
        </button>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
            My Saved Food Drops
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            {savedPosts.length} active saved drops available to order
          </p>
        </div>
      </div>

      {/* Saved Items List */}
      {savedPosts.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Bookmark size={40} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            No active saved food drops
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Tap the bookmark icon on any live food drop in your feed to save it here before it expires!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {savedPosts.map((post) => {
            const formattedPrice = post.product_price % 1 === 0 ? Math.round(post.product_price) : post.product_price.toFixed(2);

            return (
              <div
                key={post.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-light)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', padding: '12px', gap: '12px' }}>
                  {/* Thumbnail */}
                  <div style={{ position: 'relative', width: '90px', height: '90px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
                    <img
                      src={post.thumbnail_url || post.media_url}
                      alt={post.product_name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '4px',
                        left: '4px',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        color: '#FFF',
                        padding: '1px 5px',
                        borderRadius: '6px',
                        fontSize: '9px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      <Sparkles size={8} color="var(--accent-coral)" />
                      <span>DROP</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div
                        onClick={() => onSelectRestaurant(post.restaurant_id)}
                        style={{ cursor: 'pointer', display: 'inline-block' }}
                      >
                        <p style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--accent-coral)', margin: 0 }}>
                          {post.restaurant_name}
                        </p>
                      </div>
                      <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0 4px', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {post.product_name}
                      </h4>
                      <p style={{ fontSize: '13.5px', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                        Rs. {formattedPrice}
                      </p>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                      <button
                        onClick={() => toggleSave(post.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          background: 'none',
                          border: 'none',
                          color: '#DC2626',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        <Trash2 size={12} />
                        <span>Remove</span>
                      </button>

                      <button
                        onClick={() => onOpenOrderModal(post)}
                        className="btn-primary"
                        style={{
                          padding: '4px 10px',
                          borderRadius: '16px',
                          fontSize: '11px',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <ShoppingBag size={11} />
                        <span>Order Now</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
