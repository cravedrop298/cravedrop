import React, { useRef, useState, useEffect } from 'react';
import { FoodPost, Restaurant } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { isPostExpired } from '../../services/expiryService';
import { rankFoodPostsStrict } from '../../services/recommendationService';
import { interactionTracker } from '../../services/interactionTrackingService';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Play,
  Volume2,
  VolumeX,
  ShoppingBag,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface ReelsViewProps {
  onOpenOrderModal: (post: FoodPost) => void;
  onOpenComments: (post: FoodPost) => void;
  onOpenShare: (post: FoodPost) => void;
  onSelectRestaurant: (restaurantId: string) => void;
}

function getTimeLabel(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m left`;
  return `${Math.floor(mins / 60)}h left`;
}

interface ReelCardProps {
  post: FoodPost;
  restaurant?: Restaurant;
  isActive: boolean;
  onOpenOrderModal: (post: FoodPost) => void;
  onOpenComments: (post: FoodPost) => void;
  onOpenShare: (post: FoodPost) => void;
  onSelectRestaurant: (restaurantId: string) => void;
}

const ReelCard: React.FC<ReelCardProps> = ({
  post,
  restaurant,
  isActive,
  onOpenOrderModal,
  onOpenComments,
  onOpenShare,
  onSelectRestaurant,
}) => {
  const { user } = useAuth();
  const { userLikes, userSaves, userFollows, toggleLike, toggleSave, toggleFollow } = useData();
  const { t } = useTranslation();
  const isLiked = userLikes.has(post.id);
  const isSaved = userSaves.has(post.id);
  const isFollowing = userFollows.has(post.restaurant_id);
  const expired = isPostExpired(post.expires_at) || post.is_expired;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);

  const watchStartMs = useRef<number>(0);
  const hasCompletedRef = useRef<boolean>(false);
  const lastTimeRef = useRef<number>(0);
  const postCategory = post.category || restaurant?.category || '';
  const postCityId = post.city_id || restaurant?.city_id || '';

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || post.media_type !== 'video') return;
    if (isActive && !expired) {
      vid.currentTime = 0;
      watchStartMs.current = Date.now();
      hasCompletedRef.current = false;
      if (user?.id) {
        interactionTracker.trackImpression(user.id, post.id, postCategory, postCityId);
      }
      vid
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      if (watchStartMs.current > 0 && user?.id) {
        const elapsedMs = Date.now() - watchStartMs.current;
        const durationSec = post.duration_seconds || 15;
        const completionPct = Math.min(100, (elapsedMs / 1000 / durationSec) * 100);
        if (elapsedMs < 2500 && completionPct < 20) {
          interactionTracker.trackSkip(user.id, post.id, elapsedMs, postCategory, postCityId);
        } else if (elapsedMs >= 1000) {
          interactionTracker.trackWatch(user.id, post.id, elapsedMs, completionPct, postCategory, postCityId);
        }
        watchStartMs.current = 0;
      }
      vid.pause();
      setIsPlaying(false);
    }
  }, [isActive, post.media_type, expired, user?.id]);

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play();
      setIsPlaying(true);
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setIsMuted(vid.muted);
  };

  const handleDoubleTap = () => {
    if (!isLiked) {
      toggleLike(post.id);
      if (user?.id) {
        interactionTracker.trackLike(user.id, post.id, postCategory, postCityId);
      }
    }
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);
  };

  const onTimeUpdate = () => {
    const vid = videoRef.current;
    if (vid) {
      const current = vid.currentTime;
      const prog = (current / vid.duration) * 100 || 0;
      setProgress(prog);

      // Check if rewatched / looped
      if (current < lastTimeRef.current && lastTimeRef.current > 0.8) {
        if (user?.id) {
          interactionTracker.trackRewatch(user.id, post.id, postCategory, postCityId);
        }
      }

      // Check if completed
      if (prog >= 90 && !hasCompletedRef.current) {
        hasCompletedRef.current = true;
        if (user?.id) {
          interactionTracker.trackComplete(user.id, post.id, postCategory, postCityId);
        }
      }

      lastTimeRef.current = current;
    }
  };

  const formattedPrice =
    post.product_price % 1 === 0 ? Math.round(post.product_price) : post.product_price.toFixed(2);
  const origPriceFormatted = post.product_discount_price
    ? post.product_discount_price % 1 === 0
      ? Math.round(post.product_discount_price)
      : post.product_discount_price.toFixed(2)
    : null;

  const iconBubble = (active?: boolean) =>
    ({
      width: 36,
      height: 36,
      borderRadius: '50%',
      backgroundColor: active ? 'rgba(226,75,54,0.9)' : 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease',
    } as React.CSSProperties);

  const actionLabel = {
    fontSize: 10,
    fontWeight: 800,
    color: '#fff',
    textShadow: '0 1px 4px rgba(0,0,0,0.8)',
    marginTop: 1,
  } as React.CSSProperties;

  const actionBtn = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
  } as React.CSSProperties;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#0D0D0D' }}>
      {/* Media Background */}
      <div style={{ position: 'absolute', inset: 0, cursor: 'pointer' }} onClick={togglePlay} onDoubleClick={handleDoubleTap}>
        {post.media_type === 'video' ? (
          <video
            ref={videoRef}
            src={post.media_url}
            poster={post.thumbnail_url}
            loop
            muted={isMuted}
            playsInline
            preload="metadata"
            onTimeUpdate={onTimeUpdate}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <img src={post.media_url} alt={post.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}

        {/* Gradient shadow mask */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 25%, transparent 45%, rgba(0,0,0,0.92) 100%)' }} />

        {post.media_type === 'video' && !isPlaying && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 50, height: 50, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Play size={24} color="#fff" style={{ marginLeft: 3 }} />
            </div>
          </div>
        )}

        {showHeart && (
          <div className="animate-heart-pulse" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 25, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Heart size={84} fill="var(--accent-coral)" color="white" />
          </div>
        )}
      </div>

      {/* Progress bar */}
      {post.media_type === 'video' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.2)', zIndex: 30 }}>
          <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--accent-coral)', transition: 'width 0.1s linear' }} />
        </div>
      )}

      {/* FOOD DROP badge */}
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 20, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', borderRadius: 20, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 800, color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
        <Sparkles size={10} color="var(--accent-coral)" />
        <span>FOOD DROP</span>
      </div>

      {/* Top-right: expiry + mute */}
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <div style={{ backgroundColor: expired ? 'rgba(100,100,100,0.85)' : 'var(--accent-coral)', backdropFilter: 'blur(6px)', borderRadius: 20, padding: '3px 8px', fontSize: 10.5, fontWeight: 800, color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          {expired ? 'EXPIRED' : `⏱ ${getTimeLabel(post.expires_at)}`}
        </div>
        {post.media_type === 'video' && (
          <button onClick={toggleMute} style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
            {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>
        )}
      </div>

      {/* Right-side action column (Floating on right edge) */}
      <div style={{ position: 'absolute', right: 8, bottom: 12, zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <button style={actionBtn} onClick={() => toggleLike(post.id)}>
          <div style={iconBubble(isLiked)}><Heart size={16} fill={isLiked ? '#fff' : 'none'} color="#fff" /></div>
          <span style={actionLabel}>{post.likes_count}</span>
        </button>

        <button style={actionBtn} onClick={() => onOpenComments(post)}>
          <div style={iconBubble()}><MessageCircle size={16} color="#fff" /></div>
          <span style={actionLabel}>{post.comments_count}</span>
        </button>

        <button style={actionBtn} onClick={() => toggleSave(post.id)}>
          <div style={iconBubble(isSaved)}><Bookmark size={15} fill={isSaved ? '#fff' : 'none'} color="#fff" /></div>
          <span style={actionLabel}>Save</span>
        </button>

        <button style={actionBtn} onClick={() => onOpenShare(post)}>
          <div style={iconBubble()}><Share2 size={15} color="#fff" /></div>
          <span style={actionLabel}>Share</span>
        </button>
      </div>

      {/* Bottom info panel - positioned cleanly at the bottom edge with no top border line */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          padding: '10px 56px 8px 10px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.82) 70%, transparent 100%)',
        }}
      >
        {/* Restaurant Header: Avatar, Name, Verified Badge, Follow */}
        <div
          onClick={() => onSelectRestaurant(post.restaurant_id)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer', flexWrap: 'nowrap' }}
        >
          <img
            src={post.restaurant_logo}
            alt={post.restaurant_name}
            style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--accent-coral)', flexShrink: 0 }}
          />
          <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.8)', whiteSpace: 'nowrap' }}>
            {post.restaurant_name}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFollow(post.restaurant_id);
            }}
            style={{
              padding: '2px 7px',
              borderRadius: 20,
              fontSize: 10,
              fontWeight: 800,
              cursor: 'pointer',
              backgroundColor: isFollowing ? 'rgba(255,255,255,0.2)' : 'var(--accent-coral)',
              color: '#fff',
              border: isFollowing ? '1px solid rgba(255,255,255,0.35)' : 'none',
              backdropFilter: 'blur(4px)',
              flexShrink: 0,
            }}
          >
            {isFollowing ? t('following') : t('follow')}
          </button>
        </div>

        {/* Product Name (Price removed as requested, since Order button contains price) */}
        <h3 style={{ fontSize: 13.5, fontWeight: 900, color: '#fff', textShadow: '0 1px 8px rgba(0,0,0,0.9)', margin: 0, marginBottom: 3, lineHeight: 1.2 }}>
          {post.product_name}
        </h3>

        {/* Caption & Tags Collapsible (Hidden by default; shown only when expanded via "... see more") */}
        {(post.caption || (post.tags && post.tags.length > 0)) && (
          <div
            onClick={() => setIsCaptionExpanded(!isCaptionExpanded)}
            style={{ cursor: 'pointer', marginBottom: 6 }}
            title={isCaptionExpanded ? 'Click to collapse description & tags' : 'Click to see description & tags'}
          >
            {isCaptionExpanded && (
              <>
                {post.caption && (
                  <p
                    style={{
                      fontSize: 11.5,
                      color: 'rgba(255,255,255,0.88)',
                      lineHeight: 1.35,
                      margin: 0,
                      textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                    }}
                  >
                    {post.caption}
                  </p>
                )}

                {post.tags && post.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 9.5,
                          fontWeight: 700,
                          color: 'rgba(255,255,255,0.9)',
                          backgroundColor: 'rgba(255,255,255,0.15)',
                          backdropFilter: 'blur(4px)',
                          padding: '1px 6px',
                          borderRadius: 6,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}

            <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--accent-coral)', textDecoration: 'underline', marginTop: isCaptionExpanded ? 4 : 1, display: 'inline-block' }}>
              {isCaptionExpanded ? 'Show less' : '... see more'}
            </span>
          </div>
        )}

        {/* ── Order Section ── */}
        {expired ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              padding: '7px 0',
              borderRadius: 10,
              backgroundColor: 'rgba(120,120,120,0.4)',
              backdropFilter: 'blur(6px)',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 11,
              fontWeight: 800,
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <AlertCircle size={13} /> Drop Ended
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {/* Add to Bag Icon Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenOrderModal(post);
              }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                backgroundColor: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff',
                flexShrink: 0,
              }}
              title="Add to Bag"
            >
              <ShoppingBag size={15} />
            </button>

            {/* ORDER DROP CTA */}
            <button
              onClick={() => onOpenOrderModal(post)}
              style={{
                flex: 1,
                padding: '0 10px',
                height: 34,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #E2614A 0%, #F4956A 100%)',
                color: '#fff',
                fontSize: 11.5,
                fontWeight: 900,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                boxShadow: '0 3px 14px rgba(226,97,74,0.5)',
                whiteSpace: 'nowrap',
              }}
            >
              🔥 Order · <span style={{ fontWeight: 800 }}>Rs. {formattedPrice}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const ReelsView: React.FC<ReelsViewProps> = ({
  onOpenOrderModal,
  onOpenComments,
  onOpenShare,
  onSelectRestaurant,
}) => {
  const { user } = useAuth();
  const { posts, restaurants, userFollows } = useData();
  const restaurantsMap = Object.fromEntries(restaurants.map((r) => [r.id, r]));
  const userCity = user?.city || user?.location?.city || '';

  const reelPosts = rankFoodPostsStrict(
    posts.filter((p) => p.media_type === 'video'),
    restaurantsMap,
    user,
    Array.from(userFollows)
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    slideRefs.current.forEach((el, idx) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting && e.intersectionRatio >= 0.6) setActiveIndex(idx);
          });
        },
        { root: containerRef.current, threshold: 0.6 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [reelPosts.length]);

  if (reelPosts.length === 0) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0D0D0D',
          color: '#fff',
          gap: 12,
          padding: 24,
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: 48 }}>🔥</span>
        <p style={{ fontSize: 16, fontWeight: 800 }}>
          No active video drops in {userCity || 'Your City'}
        </p>
        <p style={{ fontSize: 13, opacity: 0.65, maxWidth: 260 }}>
          Check back later for sizzling live kitchen drops in your area!
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        overflowY: 'scroll',
        scrollSnapType: 'y mandatory',
        scrollbarWidth: 'none',
        backgroundColor: '#0D0D0D',
      }}
    >
      {reelPosts.map((post, idx) => (
        <div
          key={post.id}
          ref={(el) => {
            slideRefs.current[idx] = el;
          }}
          style={{ height: '100%', scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
        >
          <ReelCard
            post={post}
            restaurant={restaurantsMap[post.restaurant_id]}
            isActive={idx === activeIndex}
            onOpenOrderModal={onOpenOrderModal}
            onOpenComments={onOpenComments}
            onOpenShare={onOpenShare}
            onSelectRestaurant={onSelectRestaurant}
          />
        </div>
      ))}
    </div>
  );
};
