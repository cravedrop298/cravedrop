import React, { useRef, useState, useEffect } from 'react';
import { FoodPost, Restaurant } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { isPostExpired } from '../../services/expiryService';
import { interactionTracker } from '../../services/interactionTrackingService';
import { ExpiryCountdown } from '../common/ExpiryCountdown';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  CheckCircle2,
  Volume2,
  VolumeX,
  Play,
  ShoppingBag,
  AlertCircle,
  Sparkles,
  MoreVertical,
  EyeOff,
} from 'lucide-react';

interface FoodPostCardProps {
  post: FoodPost;
  restaurant?: Restaurant;
  onOpenOrderModal: (post: FoodPost) => void;
  onOpenComments: (post: FoodPost) => void;
  onOpenShare: (post: FoodPost) => void;
  onSelectRestaurant: (restaurantId: string) => void;
  onDismissPost?: (postId: string) => void;
  isFeedActive?: boolean;
}

export const FoodPostCard: React.FC<FoodPostCardProps> = ({
  post,
  restaurant,
  onOpenOrderModal,
  onOpenComments,
  onOpenShare,
  onSelectRestaurant,
  onDismissPost,
  isFeedActive = true,
}) => {
  const { user } = useAuth();
  const { userLikes, userSaves, userFollows, toggleLike, toggleSave, toggleFollow, incrementPostViews } = useData();
  const { t } = useTranslation();

  const isLiked = userLikes.has(post.id);
  const isSaved = userSaves.has(post.id);
  const isFollowing = userFollows.has(post.restaurant_id);
  const expired = isPostExpired(post.expires_at) || post.is_expired;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Playback tracking refs
  const accumulatedWatchMs = useRef<number>(0);
  const hasCompletedRef = useRef<boolean>(false);
  const lastTimeRef = useRef<number>(0);
  const postCategory = post.category || restaurant?.category || '';
  const postCityId = post.city_id || restaurant?.city_id || '';

  // 1. Impression tracking
  useEffect(() => {
    incrementPostViews(post.id);
    if (user?.id) {
      interactionTracker.trackImpression(user.id, post.id, postCategory, postCityId);
    }
  }, [post.id, user?.id]);

  // 2. Playback tracking and skip detection on unmount / navigation
  useEffect(() => {
    return () => {
      if (user?.id && post.media_type === 'video') {
        const totalMs = accumulatedWatchMs.current;
        const durationSec = post.duration_seconds || 15;
        const completionPct = Math.min(100, (totalMs / 1000 / durationSec) * 100);

        if (totalMs < 2500 && completionPct < 20) {
          // Negative signal: Quick skip
          interactionTracker.trackSkip(user.id, post.id, totalMs, postCategory, postCityId);
        } else if (totalMs >= 1000) {
          // Positive signal: Engaged watch
          interactionTracker.trackWatch(user.id, post.id, totalMs, completionPct, postCategory, postCityId);
        }
      }
    };
  }, [post.id, user?.id, post.media_type, post.duration_seconds]);

  // Autoplay video when appropriate with muted default
  useEffect(() => {
    if (post.media_type === 'video' && videoRef.current) {
      if (isFeedActive && !expired && !isDismissed) {
        videoRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isFeedActive, post.media_type, expired, isDismissed]);

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleDoubleTap = () => {
    if (!isLiked) {
      toggleLike(post.id);
      if (user?.id) {
        interactionTracker.trackLike(user.id, post.id, postCategory, postCityId);
      }
    }
    setShowHeartAnimation(true);
    setTimeout(() => setShowHeartAnimation(false), 800);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const vid = videoRef.current;
      const current = vid.currentTime;
      const prog = (current / vid.duration) * 100;
      setVideoProgress(prog || 0);

      // Check if looped (rewatch signal)
      if (current < lastTimeRef.current && lastTimeRef.current > 0.8) {
        if (user?.id) {
          interactionTracker.trackRewatch(user.id, post.id, postCategory, postCityId);
        }
      }

      // Check if completed (>= 90%)
      if (prog >= 90 && !hasCompletedRef.current) {
        hasCompletedRef.current = true;
        if (user?.id) {
          interactionTracker.trackComplete(user.id, post.id, postCategory, postCityId);
        }
      }

      lastTimeRef.current = current;
      accumulatedWatchMs.current += 250;
    }
  };

  const handleNotInterested = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowOptionsDropdown(false);
    setIsDismissed(true);
    if (user?.id) {
      interactionTracker.trackNotInterested(user.id, post.id, postCategory, postCityId);
    }
    if (onDismissPost) {
      onDismissPost(post.id);
    }
  };

  if (isDismissed) {
    return null;
  }

  return (
    <article
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        overflow: 'hidden',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '20px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 1. TOP HEADER: Restaurant Profile, Name, Verification, Follow */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div
          onClick={() => onSelectRestaurant(post.restaurant_id)}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <img
            src={post.restaurant_logo}
            alt={post.restaurant_name}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '1.5px solid var(--border-light)',
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'nowrap' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {post.restaurant_name}
              </h3>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              {restaurant?.category || 'Specialty Kitchen'} · {restaurant?.city || 'Downtown'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
          <button
            onClick={() => {
              toggleFollow(post.restaurant_id);
              if (!isFollowing && user?.id) {
                interactionTracker.trackFollow(user.id, post.restaurant_id, postCategory, postCityId);
              }
            }}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: isFollowing ? 'var(--bg-subtle)' : 'var(--bg-butter)',
              color: isFollowing ? 'var(--text-secondary)' : '#B45309',
              border: `1px solid ${isFollowing ? 'var(--border-light)' : 'var(--bg-butter-border)'}`,
              transition: 'all 0.15s ease',
            }}
          >
            {isFollowing ? t('following') : t('follow')}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowOptionsDropdown(!showOptionsDropdown);
            }}
            title="Options"
            style={{
              background: 'none',
              border: 'none',
              padding: '5px',
              borderRadius: '50%',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MoreVertical size={16} />
          </button>

          {showOptionsDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                border: '1px solid var(--border-light)',
                zIndex: 50,
                minWidth: '160px',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={handleNotInterested}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  background: 'none',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#DC2626',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <EyeOff size={15} />
                <span>Not interested</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. CENTER: Large Food Video or Image */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          backgroundColor: '#1C1917',
          aspectRatio: '4 / 5',
          overflow: 'hidden',
          cursor: 'pointer',
        }}
        onClick={togglePlayPause}
        onDoubleClick={handleDoubleTap}
      >
        {post.media_type === 'video' ? (
          <>
            <video
              ref={videoRef}
              src={post.media_url}
              poster={post.thumbnail_url}
              loop
              muted={isMuted}
              playsInline
              preload="metadata"
              onTimeUpdate={handleTimeUpdate}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />

            {/* Video Progress Bar */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '3px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                zIndex: 10,
              }}
            >
              <div
                style={{
                  width: `${videoProgress}%`,
                  height: '100%',
                  backgroundColor: 'var(--accent-coral)',
                  transition: 'width 0.1s linear',
                }}
              />
            </div>

            {/* Sound Toggle Button */}
            <button
              onClick={toggleSound}
              style={{
                position: 'absolute',
                bottom: '14px',
                right: '14px',
                backgroundColor: 'rgba(25, 20, 15, 0.65)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(4px)',
                zIndex: 10,
              }}
              title={isMuted ? 'Tap to enable sound' : 'Mute'}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            {/* Play overlay indicator if paused */}
            {!isPlaying && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.25)',
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-primary)',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                  }}
                >
                  <Play size={24} style={{ marginLeft: '3px' }} />
                </div>
              </div>
            )}
          </>
        ) : (
          <img
            src={post.media_url}
            alt={post.product_name}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}

        {/* Double-tap floating heart animation */}
        {showHeartAnimation && (
          <div
            className="animate-heart-pulse"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 20,
            }}
          >
            <Heart size={84} fill="var(--accent-coral)" color="white" />
          </div>
        )}

        {/* Live Expiry Badge (Top Right of Media) */}
        <div style={{ position: 'absolute', top: '14px', right: '14px', zIndex: 10 }}>
          <ExpiryCountdown expiresAt={post.expires_at} />
        </div>

        {/* Floating Quick Drop Tag (Top Left of Media) */}
        <div
          style={{
            position: 'absolute',
            top: '14px',
            left: '14px',
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(4px)',
            borderRadius: 'var(--radius-full)',
            padding: '3px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 800,
            color: 'var(--accent-coral)',
            zIndex: 10,
          }}
        >
          <Sparkles size={11} />
          <span>FOOD DROP</span>
        </div>
      </div>

      {/* 3. POST DETAILS & CAPTION */}
      <div style={{ padding: '12px 14px 8px' }}>
        {/* Product Title & Price Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '10px',
            marginBottom: '4px',
          }}
        >
          <h4 style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.25, flex: 1, margin: 0 }}>
            {post.product_name}
          </h4>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <span style={{ fontSize: '14px', fontWeight: 900, color: 'var(--accent-coral)' }}>
              Rs. {post.product_price % 1 === 0 ? Math.round(post.product_price) : post.product_price.toFixed(2)}
            </span>
            {post.product_discount_price && (
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textDecoration: 'line-through',
                }}
              >
                Rs. {post.product_discount_price % 1 === 0 ? Math.round(post.product_discount_price) : post.product_discount_price.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Caption (1-line truncated initially, toggleable on tap) */}
        {post.caption && (
          <div
            onClick={() => setIsCaptionExpanded(!isCaptionExpanded)}
            style={{ cursor: 'pointer', marginBottom: '4px' }}
            title={isCaptionExpanded ? 'Click to collapse' : 'Click to read full description'}
          >
            <p
              style={{
                fontSize: '12.5px',
                color: 'var(--text-secondary)',
                lineHeight: 1.4,
                margin: 0,
                display: isCaptionExpanded ? 'block' : '-webkit-box',
                WebkitLineClamp: isCaptionExpanded ? 'unset' : 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {post.caption}
            </p>
            {post.caption.length > 45 && (
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-coral)', textDecoration: 'underline', marginTop: '2px', display: 'inline-block' }}>
                {isCaptionExpanded ? 'Show less' : '... more'}
              </span>
            )}
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
            {post.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: '10.5px',
                  color: 'var(--accent-coral)',
                  fontWeight: 600,
                  backgroundColor: 'var(--accent-coral-light)',
                  padding: '2px 6px',
                  borderRadius: '6px',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 4. BOTTOM BORDERED FOOTER: SOCIAL ACTIONS & PRIMARY ORDER CTA */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          borderTop: '1px solid var(--border-light)',
          backgroundColor: '#FAFAFA',
        }}
      >
        {/* Left social interaction buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Like Button */}
          <button
            onClick={() => {
              toggleLike(post.id);
              if (!isLiked && user?.id) {
                interactionTracker.trackLike(user.id, post.id, postCategory, postCityId);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              color: isLiked ? 'var(--accent-coral)' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            <Heart size={16} fill={isLiked ? 'var(--accent-coral)' : 'none'} />
            <span>{post.likes_count}</span>
          </button>

          {/* Comment Button */}
          <button
            onClick={() => {
              if (user?.id) {
                interactionTracker.trackComment(user.id, post.id, postCategory, postCityId);
              }
              onOpenComments(post);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            <MessageCircle size={16} />
            <span>{post.comments_count}</span>
          </button>

          {/* Share Button */}
          <button
            onClick={() => {
              if (user?.id) {
                interactionTracker.trackShare(user.id, post.id, postCategory, postCityId);
              }
              onOpenShare(post);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            <Share2 size={16} />
          </button>

          {/* Save Button */}
          <button
            onClick={() => {
              toggleSave(post.id);
              if (!isSaved && user?.id) {
                interactionTracker.trackSave(user.id, post.id, postCategory, postCityId);
              }
            }}
            style={{
              color: isSaved ? 'var(--accent-coral)' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Bookmark size={16} fill={isSaved ? 'var(--accent-coral)' : 'none'} />
          </button>
        </div>

        {/* PRIMARY CTA: ORDER DROP */}
        {expired ? (
          <button
            disabled
            style={{
              backgroundColor: '#F1F5F9',
              color: '#94A3B8',
              padding: '4px 8px',
              borderRadius: '20px',
              fontSize: '10.5px',
              fontWeight: 800,
              cursor: 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              border: '1px solid #CBD5E1',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <AlertCircle size={11} />
            <span>{t('order_disabled')}</span>
          </button>
        ) : (
          <button
            onClick={() => {
              if (user?.id) {
                interactionTracker.trackOrder(user.id, post.id, postCategory, postCityId);
              }
              onOpenOrderModal(post);
            }}
            className="btn-primary"
            style={{
              padding: '4px 9px',
              borderRadius: '20px',
              fontSize: '10.5px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <ShoppingBag size={11} />
            <span>{t('order_now')} · Rs. {post.product_price % 1 === 0 ? Math.round(post.product_price) : post.product_price.toFixed(2)}</span>
          </button>
        )}
      </div>
    </article>
  );
};
