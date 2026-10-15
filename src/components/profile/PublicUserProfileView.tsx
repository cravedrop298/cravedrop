import React, { useState, useEffect } from 'react';
import { ChevronRight, MapPin, Award, Star, Sparkles, CheckCircle2, UserPlus, UserCheck } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { getFollowerIds, getFollowingIds, getProfilesForUserIds } from '../../services/followService';
import { getReviewsForUser } from '../../services/reviewService';
import { UserReview } from '../../types';

export interface PublicUser {
  id: string;
  name: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  city?: string;
  followers_count: number;
  following_count: number;
  reviews_count: number;
  is_following?: boolean;
  taste_preferences?: string[];
  reviews?: {
    id: string;
    restaurant_name: string;
    product_name: string;
    rating: number;
    comment: string;
    created_at: string;
    dish_image?: string;
  }[];
}

interface PublicUserProfileViewProps {
  user: PublicUser;
  onBack: () => void;
}

export const PublicUserProfileView: React.FC<PublicUserProfileViewProps> = ({ user, onBack }) => {
  const { userFollows, toggleFollow, getFollowStatus } = useData();

  // Nested navigation stack state
  const [subView, setSubView] = useState<'followers' | 'following' | null>(null);
  const [selectedUser, setSelectedUser] = useState<PublicUser | null>(null);

  // Real database-backed relationships and counts for this user
  const [targetFollowerIds, setTargetFollowerIds] = useState<Set<string>>(new Set());
  const [targetFollowingIds, setTargetFollowingIds] = useState<Set<string>>(new Set());
  const [targetReviews, setTargetReviews] = useState<UserReview[]>([]);
  const [subViewUsers, setSubViewUsers] = useState<PublicUser[]>([]);

  // Load real relationship counts & reviews for this target user
  useEffect(() => {
    getFollowerIds(user.id).then(setTargetFollowerIds);
    getFollowingIds(user.id).then(setTargetFollowingIds);
    getReviewsForUser(user.id).then(setTargetReviews);
  }, [user.id]);

  const isFollowing = userFollows.has(user.id);
  const followStatus = getFollowStatus(user.id);

  // Real database-calculated counts
  const followersCount = targetFollowerIds.size;
  const followingCount = targetFollowingIds.size;
  const reviewsCount = targetReviews.length;

  const handleToggleFollow = (targetId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    toggleFollow(targetId);
    if (targetId === user.id) {
      setTargetFollowerIds((prev) => {
        const next = new Set(prev);
        if (isFollowing) {
          next.delete(user.id);
        } else {
          next.add(user.id);
        }
        return next;
      });
    }
  };

  // If a nested user profile is selected, recursively render PublicUserProfileView
  if (selectedUser) {
    return <PublicUserProfileView user={selectedUser} onBack={() => setSelectedUser(null)} />;
  }

  // Load subView users on demand
  useEffect(() => {
    if (subView === 'followers') {
      const ids = Array.from(targetFollowerIds);
      if (ids.length === 0) {
        setSubViewUsers([]);
      } else {
        getProfilesForUserIds(ids).then((profiles) => {
          setSubViewUsers(
            profiles.map((p) => ({
              id: p.id,
              name: p.name || p.full_name || 'Food Explorer',
              username: p.username || 'foodie',
              avatar_url: p.avatar_url,
              bio: p.bio || '',
              city: p.city || p.location?.city || 'Lahore',
              followers_count: 0,
              following_count: 0,
              reviews_count: 0,
              is_following: userFollows.has(p.id),
              taste_preferences: p.taste_preferences || [],
            }))
          );
        });
      }
    } else if (subView === 'following') {
      const ids = Array.from(targetFollowingIds);
      if (ids.length === 0) {
        setSubViewUsers([]);
      } else {
        getProfilesForUserIds(ids).then((profiles) => {
          setSubViewUsers(
            profiles.map((p) => ({
              id: p.id,
              name: p.name || p.full_name || 'Food Explorer',
              username: p.username || 'foodie',
              avatar_url: p.avatar_url,
              bio: p.bio || '',
              city: p.city || p.location?.city || 'Lahore',
              followers_count: 0,
              following_count: 0,
              reviews_count: 0,
              is_following: userFollows.has(p.id),
              taste_preferences: p.taste_preferences || [],
            }))
          );
        });
      }
    }
  }, [subView, targetFollowerIds, targetFollowingIds, userFollows]);

  // If viewing this public user's Followers or Following list
  if (subView === 'followers' || subView === 'following') {
    const listTitle = subView === 'followers' ? 'Followers' : 'Following';
    const count = subView === 'followers' ? followersCount : followingCount;

    return (
      <div style={{ padding: '16px 16px 40px' }}>
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
            onClick={() => setSubView(null)}
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
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {user.name}'s {listTitle}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              {count} {count === 1 ? 'person' : 'people'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {count === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
              <p style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                {subView === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
              </p>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {subView === 'followers' ? "When someone follows this profile, they'll show up here." : "This user isn't following anyone yet."}
              </p>
            </div>
          ) : (
            subViewUsers.map((u) => {
              const isUserFollowed = userFollows.has(u.id);
              return (
                <div
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '12px 14px',
                    border: '1px solid var(--border-light)',
                    boxShadow: 'var(--shadow-sm)',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--accent-coral)' }}>
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 800, fontSize: '16px' }}>
                          {u.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{u.name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>@{u.username}</p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleToggleFollow(u.id, e)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 800,
                      border: isUserFollowed ? '1px solid var(--border-light)' : 'none',
                      backgroundColor: isUserFollowed ? 'var(--bg-butter)' : 'var(--accent-coral)',
                      color: isUserFollowed ? '#B45309' : '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    {isUserFollowed ? 'Following' : 'Follow'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 16px 40px' }}>
      {/* Header with Back Button */}
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
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          {user.name}
        </h2>
      </div>

      {/* Main Profile Info Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '24px 20px',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)',
          textAlign: 'center',
          marginBottom: '16px',
        }}
      >
        <div style={{ width: '84px', height: '84px', margin: '0 auto 12px', position: 'relative' }}>
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name}
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid var(--accent-coral-light)',
              }}
            />
          ) : (
            <div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #E2614A 0%, #F4956A 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '3px solid var(--accent-coral-light)',
              }}
            >
              <span style={{ fontSize: '30px', fontWeight: 800, color: '#FFFFFF' }}>
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <h3 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          {user.name}
        </h3>
        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px', margin: 0 }}>
          @{user.username}
        </p>

        {user.bio && (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4, margin: '8px 0 0' }}>
            {user.bio}
          </p>
        )}

        {/* Badges */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '10px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'var(--bg-subtle)',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '11.5px',
              color: 'var(--text-secondary)',
              fontWeight: 700,
            }}
          >
            <MapPin size={12} color="var(--accent-coral)" />
            <span>{user.city || 'Lahore'}</span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'var(--bg-butter)',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '11.5px',
              color: '#B45309',
              fontWeight: 700,
              border: '1px solid var(--bg-butter-border)',
            }}
          >
            <Award size={12} color="#B45309" />
            <span>Foodie Explorer</span>
          </div>
        </div>

        {/* Action Buttons (Follow / Follow Back / Following) */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', justifyContent: 'center' }}>
          <button
            onClick={() => handleToggleFollow(user.id)}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '14px',
              fontSize: '13px',
              fontWeight: 800,
              backgroundColor: isFollowing ? 'var(--bg-subtle)' : 'var(--accent-coral)',
              color: isFollowing ? 'var(--text-primary)' : '#FFFFFF',
              border: isFollowing ? '1px solid var(--border-light)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            {isFollowing ? (
              <>
                <UserCheck size={15} color="var(--accent-coral)" />
                <span>Following</span>
              </>
            ) : followStatus === 'follow_back' ? (
              <>
                <UserPlus size={15} color="#FFFFFF" />
                <span>Follow Back</span>
              </>
            ) : (
              <>
                <UserPlus size={15} color="#FFFFFF" />
                <span>Follow</span>
              </>
            )}
          </button>
        </div>

        {/* Public Stats Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            borderTop: '1px solid var(--border-subtle)',
            marginTop: '16px',
            paddingTop: '12px',
          }}
        >
          {/* Followers button */}
          <button
            onClick={() => setSubView('followers')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: '4px 12px', borderRadius: '10px' }}
          >
            <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>
              {followersCount}
            </span>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0 }}>Followers</p>
          </button>

          <div style={{ width: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />

          {/* Following button */}
          <button
            onClick={() => setSubView('following')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: '4px 12px', borderRadius: '10px' }}
          >
            <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>
              {followingCount}
            </span>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0 }}>Following</p>
          </button>

          <div style={{ width: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />

          {/* Reviews button */}
          <div style={{ textAlign: 'center', padding: '4px 12px' }}>
            <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>
              {reviewsCount}
            </span>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0 }}>Reviews</p>
          </div>
        </div>
      </div>

      {/* Foodie Taste & Cravings */}
      {user.taste_preferences && user.taste_preferences.length > 0 && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '16px',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <Sparkles size={16} color="var(--accent-coral)" />
            <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Foodie Taste Preferences
            </h4>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
            {user.taste_preferences.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: 'var(--bg-butter)',
                  color: 'var(--accent-coral)',
                  border: '1px solid var(--bg-butter-border)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reviews Header */}
      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Star size={18} color="var(--accent-amber)" fill="var(--accent-amber)" />
        <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          Food Reviews ({reviewsCount})
        </h4>
      </div>

      {/* Reviews List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {reviewsCount === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
            <Star size={36} color="var(--text-muted)" style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            <p style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>No reviews yet.</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>This user hasn't written any food reviews yet.</p>
          </div>
        ) : (
          targetReviews.map((rev) => (
            <div
              key={rev.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '14px',
                border: '1px solid var(--border-light)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    {rev.product_name}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                    {rev.restaurant_name}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={13}
                      color={s <= rev.rating ? '#F59E0B' : '#E5E7EB'}
                      fill={s <= rev.rating ? '#F59E0B' : 'none'}
                    />
                  ))}
                </div>
              </div>

              {rev.dish_image && (
                <img
                  src={rev.dish_image}
                  alt="dish"
                  style={{
                    width: '100%',
                    height: '140px',
                    objectFit: 'cover',
                    borderRadius: '12px',
                    marginBottom: '8px',
                  }}
                />
              )}

              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {rev.comment}
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '10px',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {new Date(rev.created_at).toLocaleDateString('en-PK', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#059669', fontWeight: 700 }}>
                  <CheckCircle2 size={12} /> Verified Foodie
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
