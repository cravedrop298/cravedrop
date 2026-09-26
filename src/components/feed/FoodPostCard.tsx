import React, { useRef, useState, useEffect } from 'react';
import { FoodPost, Restaurant } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { isPostExpired } from '../../services/expiryService';
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
} from 'lucide-react';

interface FoodPostCardProps {
  post: FoodPost;
  restaurant?: Restaurant;
  onOpenOrderModal: (post: FoodPost) => void;
  onOpenComments: (post: FoodPost) => void;
  onOpenShare: (post: FoodPost) => void;
  onSelectRestaurant: (restaurantId: string) => void;
  isFeedActive?: boolean;
}

export const FoodPostCard: React.FC<FoodPostCardProps> = ({
  post,
  restaurant,
  onOpenOrderModal,
  onOpenComments,
  onOpenShare,
  onSelectRestaurant,
  isFeedActive = true,
}) => {
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

  // Increment views once when card enters
  useEffect(() => {
    incrementPostViews(post.id);
  }, [post.id]);

  // Autoplay video when appropriate with muted default
  useEffect(() => {
    if (post.media_type === 'video' && videoRef.current) {
      if (isFeedActive && !expired) {
        videoRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isFeedActive, post.media_type, expired]);

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
    }
    setShowHeartAnimation(true);
    setTimeout(() => setShowHeartAnimation(false), 800);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const prog = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setVideoProgress(prog || 0);
    }
  };

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <h3 style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {post.restaurant_name}
              </h3>
              {post.restaurant_verified && (
                <span className="badge-verified" title="Verified Kitchen">
                  ✓
                </span>
              )}
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              {restaurant?.category || 'Specialty Kitchen'} · {restaurant?.city || 'Downtown'}
            </p>
          </div>
        </div>

        <button
          onClick={() => toggleFollow(post.restaurant_id)}
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

      {/* 3. SOCIAL ACTIONS & PRIMARY ORDER CTA */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px 8px',
        }}
      >
        {/* Left social interaction buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Like Button */}
          <button
            onClick={() => toggleLike(post.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              color: isLiked ? 'var(--accent-coral)' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            <Heart size={20} fill={isLiked ? 'var(--accent-coral)' : 'none'} />
            <span>{post.likes_count}</span>
          </button>

          {/* Comment Button */}
          <button
            onClick={() => onOpenComments(post)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            <MessageCircle size={20} />
            <span>{post.comments_count}</span>
          </button>

          {/* Share Button */}
          <button
            onClick={() => onOpenShare(post)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            <Share2 size={19} />
          </button>

          {/* Save Button */}
          <button
            onClick={() => toggleSave(post.id)}
            style={{
              color: isSaved ? 'var(--accent-coral)' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Bookmark size={20} fill={isSaved ? 'var(--accent-coral)' : 'none'} />
          </button>
        </div>

        {/* PRIMARY CTA: ORDER DROP */}
        {expired ? (
          <button
            disabled
            style={{
              backgroundColor: '#F1F5F9',
              color: '#94A3B8',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid #CBD5E1',
            }}
          >
            <AlertCircle size={14} />
            <span>{t('order_disabled')}</span>
          </button>
        ) : (
          <button
            onClick={() => onOpenOrderModal(post)}
            className="btn-primary"
            style={{
              padding: '9px 18px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: 800,
            }}
          >
            <ShoppingBag size={15} />
            <span>{t('order_now')} · ${post.product_price.toFixed(2)}</span>
          </button>
        )}
      </div>

      {/* 4. BOTTOM CAPTION & FOOD INFO */}
      <div style={{ padding: '0 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '3px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {post.product_name}
          </h4>
          {post.product_discount_price && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
              ${post.product_discount_price.toFixed(2)}
            </span>
          )}
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
          {post.caption}
        </p>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            {post.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: '11px',
                  color: 'var(--accent-coral)',
                  fontWeight: 600,
                  backgroundColor: 'var(--accent-coral-light)',
                  padding: '2px 7px',
                  borderRadius: '6px',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
};
