import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTranslation } from '../../i18n';
import { FoodPost, UserAddress, UserReview } from '../../types';
import { isPostExpired } from '../../services/expiryService';
import { ExpiryCountdown } from '../common/ExpiryCountdown';
import { Modal } from '../common/Modal';
import { AvatarCropModal } from './AvatarCropModal';
import { AddressModal } from './AddressModal';
import { EditProfileModal } from './EditProfileModal';
import { PublicUserProfileView, PublicUser } from './PublicUserProfileView';
import { getProfilesForUserIds } from '../../services/followService';
import {
  fetchUserAddresses,
  deleteUserAddress,
  setDefaultUserAddress,
  formatPakistanPhoneDisplay,
  formatFullAddress,
} from '../../services/addressService';
import {
  Bookmark,
  Store,
  Star,
  MapPin,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Globe,
  LogOut,
  ChevronRight,
  ChevronDown,
  Camera,
  Sparkles,
  Home,
  Briefcase,
  Phone,
  FileText,
  Check,
  Award,
  Clock,
  Compass,
} from 'lucide-react';

interface CustomerProfileViewProps {
  onOpenOrderModal: (post: FoodPost) => void;
  onSelectRestaurant: (restaurantId: string) => void;
  onOpenPage?: (page: 'followers' | 'following' | 'reviews') => void;
  onNavigateOrders?: () => void;
  onNavigateSaved?: () => void;
  onOpenEditProfile?: () => void;
}

type ProfileTab = 'saved' | 'following' | 'reviews';

const TASTE_TAG_OPTIONS = [
  '🔥 Extra Spicy',
  '🍕 Pizza Fanatic',
  '🌱 100% Halal',
  '🥩 Meat Lover',
  '🍔 Burger Beast',
  '🍰 Sweet Tooth',
  '🍜 Noodle Ninja',
  '🥗 Healthy & Clean',
  '🧀 Cheese Obsessed',
  '☕ Coffee Addict',
  '🍗 Crispy Fried Chicken',
  '🍣 Sushi Hunter',
];




export const CustomerProfileView: React.FC<CustomerProfileViewProps> = ({
  onOpenOrderModal,
  onSelectRestaurant,
  onOpenPage,
  onNavigateOrders,
  onNavigateSaved,
  onOpenEditProfile,
}) => {
  const { user, switchRole, logout, deleteAccount, uploadAvatar, updateProfile } = useAuth();
  const { posts, restaurants, userSaves, userFollows, followerIds, orders, allUsers, userReviews, toggleFollow, getFollowStatus } = useData();
  const { language, setLanguage, t } = useTranslation();

  const [activeTab, setActiveTab] = useState<ProfileTab>('saved');
  const [activePage, setActivePage] = useState<'followers' | 'following' | 'reviews' | null>(null);
  const [viewedUser, setViewedUser] = useState<PublicUser | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);

  // Collapse/expand state for sections
  const [tasteSectionOpen, setTasteSectionOpen] = useState(true);
  const [addressSectionOpen, setAddressSectionOpen] = useState(false);

  // Dynamically loaded follower & following public profiles
  const [followerProfiles, setFollowerProfiles] = useState<PublicUser[]>([]);
  const [followedUserProfiles, setFollowedUserProfiles] = useState<PublicUser[]>([]);

  useEffect(() => {
    if (activePage === 'followers') {
      const ids = Array.from(followerIds);
      if (ids.length === 0) {
        setFollowerProfiles([]);
      } else {
        getProfilesForUserIds(ids).then((profiles) => {
          setFollowerProfiles(
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
    } else if (activePage === 'following') {
      const restaurantIds = new Set(restaurants.map((r) => r.id));
      const userIdsToFetch = Array.from(userFollows).filter((id) => !restaurantIds.has(id));
      if (userIdsToFetch.length === 0) {
        setFollowedUserProfiles([]);
      } else {
        getProfilesForUserIds(userIdsToFetch).then((profiles) => {
          setFollowedUserProfiles(
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
              is_following: true,
              taste_preferences: p.taste_preferences || [],
            }))
          );
        });
      }
    }
  }, [activePage, followerIds, userFollows, restaurants]);

  // Real-time followed kitchens
  const followedRestaurantsList = restaurants.filter((r) => userFollows.has(r.id));

  // Saved food drops
  const savedPosts = posts.filter((p) => userSaves.has(p.id));

  // Followed restaurants
  const followedRestaurants = restaurants.filter((r) => userFollows.has(r.id));

  // Real user addresses loaded from Supabase / isolated user storage (Zero demo addresses)
  const [userAddresses, setUserAddresses] = useState<UserAddress[]>([]);

  useEffect(() => {
    if (!user?.id) {
      setUserAddresses([]);
      return;
    }
    fetchUserAddresses(user.id, user.addresses).then(setUserAddresses);
  }, [user?.id, user?.addresses]);

  const targetDeleteAddress = userAddresses.find((a) => a.id === deletingAddressId);

  // Taste preferences
  const userTastePrefs = user?.taste_preferences || [
    '🔥 Extra Spicy',
    '🍕 Pizza Fanatic',
    '🌱 100% Halal',
    '🥩 Meat Lover',
    '🍰 Sweet Tooth',
  ];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
  };

  const handleDeleteAccount = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsDeletingAccount(true);
    await deleteAccount();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropFile(file);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const handleCropSave = async (blob: Blob) => {
    setCropFile(null);
    setIsUploadingAvatar(true);
    try {
      const croppedFile = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      await uploadAvatar(croppedFile);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCropCancel = () => {
    setCropFile(null);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  // Address Handlers
  const handleOpenAddAddress = () => {
    setEditingAddress(null);
    setIsAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr: UserAddress) => {
    setEditingAddress(addr);
    setIsAddressModalOpen(true);
  };

  const handleSaveAddress = async (newAddress: UserAddress) => {
    const currentAddresses = userAddresses;
    let updated: UserAddress[];

    const isDefault = newAddress.is_default || currentAddresses.length === 0;
    const addressWithDefault = { ...newAddress, is_default: isDefault };

    const existingIndex = currentAddresses.findIndex((a) => a.id === newAddress.id);
    if (existingIndex >= 0) {
      updated = currentAddresses.map((a) => {
        if (a.id === newAddress.id) return addressWithDefault;
        if (isDefault) return { ...a, is_default: false };
        return a;
      });
    } else {
      const list = isDefault
        ? currentAddresses.map((a) => ({ ...a, is_default: false }))
        : [...currentAddresses];
      updated = [...list, addressWithDefault];
    }

    setUserAddresses(updated);
    await updateProfile({ addresses: updated });
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!user?.id) return;
    const res = await deleteUserAddress(user.id, addressId);
    if (res.success && res.addresses) {
      setUserAddresses(res.addresses);
      await updateProfile({ addresses: res.addresses });
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    if (!user?.id) return;
    const res = await setDefaultUserAddress(user.id, addressId);
    if (res.success && res.addresses) {
      setUserAddresses(res.addresses);
      await updateProfile({ addresses: res.addresses });
    }
  };

  // Taste tag toggle
  const handleToggleTaste = async (tag: string) => {
    const current = userTastePrefs;
    const updated = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    await updateProfile({ taste_preferences: updated });
  };

  // ── VIEW OTHER USER PUBLIC PROFILE ──
  if (viewedUser) {
    return <PublicUserProfileView user={viewedUser} onBack={() => setViewedUser(null)} />;
  }

  // ── SUB-PAGE: FOLLOWERS ──
  if (activePage === 'followers') {
    return (
      <div style={{ padding: '16px 16px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-light)' }}>
          <button
            onClick={() => setActivePage(null)}
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
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Followers</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{followerIds.size} people follow you</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {followerIds.size === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
              <p style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>No followers yet.</p>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>When someone follows you, they'll show up here.</p>
            </div>
          ) : (
            followerProfiles.map((f) => {
              const isFollowed = userFollows.has(f.id);
              return (
                <div
                  key={f.id}
                  onClick={() => setViewedUser(f)}
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
                      {f.avatar_url ? (
                        <img src={f.avatar_url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 800, fontSize: '16px' }}>
                          {f.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{f.name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>@{f.username}</p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFollow(f.id);
                    }}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 800,
                      border: isFollowed ? '1px solid var(--border-light)' : 'none',
                      backgroundColor: isFollowed ? 'var(--bg-butter)' : 'var(--accent-coral)',
                      color: isFollowed ? '#B45309' : '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    {isFollowed ? 'Following' : 'Follow Back'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ── SUB-PAGE: FOLLOWING ──
  if (activePage === 'following') {
    const totalFollowingCount = userFollows.size;

    return (
      <div style={{ padding: '16px 16px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-light)' }}>
          <button
            onClick={() => setActivePage(null)}
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
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Following</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{totalFollowingCount} users & kitchens followed</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {totalFollowingCount === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
              <Store size={40} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
              <p style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>You’re not following anyone yet.</p>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>Follow kitchens & foodies to see them here</p>
            </div>
          ) : (
            <>
              {/* Followed Kitchens */}
              {followedRestaurantsList.map((r) => (
                <div
                  key={r.id}
                  onClick={() => onSelectRestaurant(r.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '12px 14px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: 'var(--bg-subtle)', overflow: 'hidden', flexShrink: 0 }}>
                      {r.logo_url ? <img src={r.logo_url} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Store size={22} color="var(--accent-coral)" style={{ margin: '12px auto', display: 'block' }} />}
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{r.name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{r.cuisine?.join(', ') || r.category} · Kitchen</p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFollow(r.id);
                    }}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 800,
                      border: '1px solid var(--border-light)',
                      backgroundColor: 'var(--bg-butter)',
                      color: '#B45309',
                      cursor: 'pointer',
                    }}
                  >
                    Following
                  </button>
                </div>
              ))}

              {/* Followed Users */}
              {followedUserProfiles.map((u) => {
                return (
                  <div
                    key={u.id}
                    onClick={() => setViewedUser(u)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '12px 14px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }}
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
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>@{u.username} · Foodie</p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFollow(u.id);
                      }}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 800,
                        border: '1px solid var(--border-light)',
                        backgroundColor: 'var(--bg-butter)',
                        color: '#B45309',
                        cursor: 'pointer',
                      }}
                    >
                      Following
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── SUB-PAGE: REVIEWS ──
  if (activePage === 'reviews') {
    return (
      <div style={{ padding: '16px 16px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-light)' }}>
          <button
            onClick={() => setActivePage(null)}
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
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>My Reviews</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{userReviews.length} reviews written</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {userReviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
              <Star size={40} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
              <p style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>No reviews yet</p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Order food and share your experience!</p>
            </div>
          ) : (
            userReviews.map((rev) => (
              <div key={rev.id} style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '14px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{rev.product_name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{rev.restaurant_name}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={13} color={s <= rev.rating ? '#F59E0B' : '#E5E7EB'} fill={s <= rev.rating ? '#F59E0B' : 'none'} />)}
                  </div>
                </div>
                {rev.dish_image && (
                  <img src={rev.dish_image} alt="dish" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '12px', marginBottom: '8px' }} />
                )}
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{rev.comment}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(rev.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#059669', fontWeight: 700 }}>
                    <CheckCircle2 size={12} /> Verified Order
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Crop modal */}
      {cropFile && (
        <AvatarCropModal
          file={cropFile}
          onSave={handleCropSave}
          onCancel={handleCropCancel}
        />
      )}

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        user={user}
        onSave={updateProfile}
      />

      {/* Add / Edit Address Modal with Map & GPS Auto-fill */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => {
          setIsAddressModalOpen(false);
          setEditingAddress(null);
        }}
        onSave={handleSaveAddress}
        initialAddress={editingAddress}
      />

      {/* Custom Styled Delete Address Confirmation Modal */}
      <Modal
        isOpen={deletingAddressId !== null}
        onClose={() => setDeletingAddressId(null)}
        title="Delete Delivery Address"
        subtitle="This address will be removed from your saved locations"
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px 4px 6px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#FEF2F2',
              border: '2px solid #FCA5A5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
              color: '#DC2626',
            }}
          >
            <Trash2 size={26} />
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1E242B', marginBottom: '6px' }}>
            Delete Address?
          </h3>
          <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.4, marginBottom: '16px', maxWidth: '280px' }}>
            Are you sure you want to delete this address? It will no longer be available for 1-tap checkout.
          </p>

          {targetDeleteAddress && (
            <div
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: '#FAF7F2',
                border: '1px solid #E5DFC9',
                textAlign: 'left',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#1E242B' }}>
                  {targetDeleteAddress.label}
                </span>
                {targetDeleteAddress.is_default && (
                  <span style={{ fontSize: '10px', fontWeight: 800, backgroundColor: '#E24B36', color: '#FFF', padding: '2px 6px', borderRadius: '4px' }}>
                    DEFAULT
                  </span>
                )}
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                {[targetDeleteAddress.house_no, targetDeleteAddress.street, targetDeleteAddress.area, targetDeleteAddress.city].filter(Boolean).join(', ')}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            <button
              type="button"
              onClick={() => setDeletingAddressId(null)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid #E5DFC9',
                backgroundColor: '#FFFFFF',
                fontSize: '13.5px',
                fontWeight: 700,
                color: '#64748B',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (deletingAddressId) {
                  await handleDeleteAddress(deletingAddressId);
                  setDeletingAddressId(null);
                }
              }}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                fontSize: '13.5px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      <div style={{ padding: '16px 16px 40px' }}>
        {/* ============================================================
            1. USER PROFILE HEADER CARD
            ============================================================ */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '20px 16px 18px',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-sm)',
            textAlign: 'center',
            position: 'relative',
            marginBottom: '16px',
          }}
        >
          {/* Edit Profile Quick Button */}
          <button
            onClick={() => {
              if (onOpenEditProfile) {
                onOpenEditProfile();
              } else {
                setIsEditProfileOpen(true);
              }
            }}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: '20px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Edit3 size={13} color="var(--accent-coral)" />
            <span>Edit Profile</span>
          </button>

          {/* Hidden file input */}
          <input
            ref={avatarInputRef}
            id="avatar-upload-input"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
          />

          {/* Avatar with Camera Overlay */}
          <label
            htmlFor="avatar-upload-input"
            title="Tap to change profile picture"
            style={{
              position: 'relative',
              width: '84px',
              height: '84px',
              margin: '4px auto 12px',
              cursor: isUploadingAvatar ? 'wait' : 'pointer',
              flexShrink: 0,
              display: 'block',
              pointerEvents: isUploadingAvatar ? 'none' : 'auto',
            }}
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name || 'User'}
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid var(--accent-coral-light)',
                  display: 'block',
                  opacity: isUploadingAvatar ? 0.5 : 1,
                  transition: 'opacity 0.2s',
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
                  opacity: isUploadingAvatar ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: '30px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1, userSelect: 'none' }}>
                  {(user?.name || user?.full_name || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-coral)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #FFFFFF',
                boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
              }}
            >
              {isUploadingAvatar ? (
                <div style={{
                  width: '12px', height: '12px',
                  border: '2px solid rgba(255,255,255,0.4)',
                  borderTopColor: '#FFF',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
              ) : (
                <Camera size={14} color="#FFFFFF" />
              )}
            </div>
          </label>

          <h3 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {user?.full_name || user?.name || 'Fazal Rehman T'}
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '1px' }}>
            @{user?.username || 'fazalrehman'}
          </p>

          {/* Real City Badge — NO Metropolis, NO Verified Foodie */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '8px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: 'var(--bg-subtle)',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                fontWeight: 700,
                border: '1px solid var(--border-light)',
              }}
            >
              <MapPin size={13} color="var(--accent-coral)" />
              <span>{user?.city || user?.location?.city || 'Lahore'}</span>
            </div>
          </div>

          {/* Foodie Bio — directly below City */}
          {user?.bio && (
            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                marginTop: '10px',
                lineHeight: 1.4,
                padding: '0 8px',
              }}
            >
              {user.bio}
            </p>
          )}

          {/* Quick Stats — clickable, acts as tab switcher */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              borderTop: '1px solid var(--border-subtle)',
              marginTop: '16px',
              paddingTop: '12px',
            }}
          >
            {/* 1st: Followers */}
            <button
              onClick={() => setActivePage('followers')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: '4px 12px', borderRadius: '10px' }}
            >
              <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>
                {followerIds.size}
              </span>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Followers</p>
            </button>

            {/* Divider */}
            <div style={{ width: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />

            {/* 2nd: Following */}
            <button
              onClick={() => setActivePage('following')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: '4px 12px', borderRadius: '10px' }}
            >
              <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>
                {userFollows.size}
              </span>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Following</p>
            </button>

            {/* Divider */}
            <div style={{ width: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />

            {/* 3rd: Reviews */}
            <button
              onClick={() => setActivePage('reviews')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', padding: '4px 12px', borderRadius: '10px' }}
            >
              <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>
                {userReviews.length}
              </span>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Reviews</p>
            </button>
          </div>
        </div>



        {/* ============================================================
            3. SAVED DELIVERY ADDRESSES & MAP LOCATIONS (#1)
            ============================================================ */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '12px',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '16px',
            overflow: 'hidden',
          }}
        >
          {/* Section Header — toggle title + Add New button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px 10px' }}>
            <button
              onClick={() => setAddressSectionOpen((o) => !o)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <MapPin size={16} color="var(--accent-coral)" />
              <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Saved Delivery Addresses
              </span>
              <div
                style={{
                  transform: addressSectionOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                  transition: 'transform 0.2s ease',
                  marginLeft: '2px',
                }}
              >
                <ChevronDown size={15} color="var(--text-muted)" />
              </div>
            </button>
            <button
              onClick={handleOpenAddAddress}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 9px',
                borderRadius: '10px',
                backgroundColor: 'var(--accent-coral-light)',
                border: 'none',
                color: 'var(--accent-coral)',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <Plus size={12} />
              <span>Add New</span>
            </button>
          </div>

          {addressSectionOpen && (
            <div style={{ paddingTop: '4px' }}>
          {userAddresses.length === 0 ? (
            <div
              onClick={handleOpenAddAddress}
              style={{
                textAlign: 'center',
                padding: '20px 14px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: '14px',
                border: '1.5px dashed var(--border-light)',
                cursor: 'pointer',
              }}
            >
              <MapPin size={26} color="var(--accent-coral)" style={{ margin: '0 auto 6px' }} />
              <p style={{ fontSize: '13px', fontWeight: 700 }}>No saved addresses yet</p>
              <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Tap to add your home, office, or pin location on map
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {userAddresses.map((addr) => {
                const isHome = addr.label.toLowerCase().includes('home');
                const isWork = addr.label.toLowerCase().includes('work');

                return (
                  <div
                    key={addr.id}
                    style={{
                      borderRadius: '12px',
                      padding: '10px 12px',
                      backgroundColor: addr.is_default ? '#FFFDF8' : 'var(--bg-subtle)',
                      border: `1.5px solid ${addr.is_default ? 'var(--accent-coral)' : 'var(--border-light)'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                      boxSizing: 'border-box',
                      width: '100%',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '6px',
                            backgroundColor: addr.is_default ? 'var(--accent-coral)' : '#FFFFFF',
                            color: addr.is_default ? '#FFFFFF' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--border-light)',
                            flexShrink: 0,
                          }}
                        >
                          {isHome ? <Home size={12} /> : isWork ? <Briefcase size={12} /> : <MapPin size={12} />}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          {addr.label}
                        </span>
                        {addr.is_default && (
                          <span
                            style={{
                              fontSize: '9.5px',
                              fontWeight: 800,
                              backgroundColor: 'var(--accent-coral)',
                              color: '#FFFFFF',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              flexShrink: 0,
                            }}
                          >
                            DEFAULT
                          </span>
                        )}
                      </div>

                      {/* Action buttons (Edit / Delete) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditAddress(addr);
                          }}
                          title="Edit address"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #E5DFC9',
                            backgroundColor: '#FFFFFF',
                            color: 'var(--text-primary)',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                          }}
                        >
                          <Edit3 size={11} color="var(--accent-coral)" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingAddressId(addr.id);
                          }}
                          title="Delete address"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #FCA5A5',
                            backgroundColor: '#FEF2F2',
                            color: '#DC2626',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(220,38,38,0.05)',
                          }}
                        >
                          <Trash2 size={11} color="#DC2626" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Recipient Name & Phone */}
                    {(addr.recipient_name || addr.phone_number || addr.phone) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', flexWrap: 'wrap' }}>
                        {addr.recipient_name && <span>{addr.recipient_name}</span>}
                        {(addr.phone_number || addr.phone) && (
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                            📞 {formatPakistanPhoneDisplay(addr.phone_number || addr.phone)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Address Text */}
                    <p style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.35, fontWeight: 500, margin: 0, wordBreak: 'break-word' }}>
                      {formatFullAddress(addr)}
                    </p>

                    {/* Landmark / Notes */}
                    {addr.landmark && (
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                        <span>📍 Near:</span> {addr.landmark}
                      </p>
                    )}

                    {(addr.delivery_instructions || addr.delivery_notes) && (
                      <p style={{ fontSize: '11px', color: '#92400E', backgroundColor: 'var(--bg-butter)', padding: '2px 7px', borderRadius: '5px', width: 'fit-content', margin: 0 }}>
                        📝 {addr.delivery_instructions || addr.delivery_notes}
                      </p>
                    )}

                    {/* Set default trigger if not default */}
                    {!addr.is_default && (
                      <button
                        onClick={() => handleSetDefaultAddress(addr.id)}
                        style={{
                          alignSelf: 'flex-start',
                          marginTop: '2px',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--accent-coral)',
                          cursor: 'pointer',
                        }}
                      >
                        Set as Default Checkout Address →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
        </div>


        {/* ============================================================
            5. SETTINGS & PREFERENCES SECTION
            ============================================================ */}
        <div
          style={{
            marginTop: '20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '14px 16px',
            border: '1px solid var(--border-light)',
          }}
        >
          <h4 style={{ fontSize: '13px', fontWeight: 800, marginBottom: '12px', color: 'var(--text-secondary)' }}>
            Preferences & Settings
          </h4>

          {/* MY ORDERS */}
          <div
            onClick={onNavigateOrders}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              cursor: 'pointer',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--accent-coral-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock size={16} color="var(--accent-coral)" />
              </div>
              <div>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                  MY ORDERS
                </span>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  View active orders & order history
                </span>
              </div>
            </div>
            <ChevronRight size={16} color="var(--text-muted)" />
          </div>

          {/* MY SAVED */}
          <div
            onClick={onNavigateSaved}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              cursor: 'pointer',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-butter)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bookmark size={16} color="#B45309" />
              </div>
              <div>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                  MY SAVED
                </span>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  {userSaves.size} saved active drops
                </span>
              </div>
            </div>
            <ChevronRight size={16} color="var(--text-muted)" />
          </div>

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
                  padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                  backgroundColor: language === 'en' ? 'var(--accent-coral)' : 'var(--bg-subtle)',
                  color: language === 'en' ? 'white' : 'var(--text-secondary)', border: 'none', cursor: 'pointer',
                }}
              >
                English
              </button>
              <button
                onClick={() => setLanguage('ur')}
                style={{
                  padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                  backgroundColor: language === 'ur' ? 'var(--accent-coral)' : 'var(--bg-subtle)',
                  color: language === 'ur' ? 'white' : 'var(--text-secondary)', border: 'none', cursor: 'pointer',
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
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 0', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Store size={16} color="var(--accent-coral)" />
              <span style={{ fontSize: '13.5px', fontWeight: 600 }}>Open Kitchen Partner Dashboard</span>
            </div>
            <ChevronRight size={16} color="var(--text-muted)" />
          </div>

          {/* LOGOUT */}
          <button
            id="logout-button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              width: '100%', padding: '12px 0', background: 'none', border: 'none',
              borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer',
              color: '#E24B36', fontSize: '13.5px', fontWeight: 700,
            }}
          >
            <LogOut size={16} />
            <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>

          {/* DELETE ACCOUNT */}
          {confirmDelete ? (
            <div style={{ paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '12.5px', color: '#B91C1C', fontWeight: 600, lineHeight: 1.4 }}>
                Are you sure? This permanently deletes your account and all saved data. This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    flex: 1, height: '38px', borderRadius: '10px', border: '1px solid var(--border-light)',
                    backgroundColor: 'var(--bg-subtle)', fontSize: '13px', fontWeight: 700,
                    color: 'var(--text-secondary)', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  id="confirm-delete-account"
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                  style={{
                    flex: 1, height: '38px', borderRadius: '10px', border: 'none',
                    backgroundColor: '#B91C1C', fontSize: '13px', fontWeight: 700,
                    color: '#FFFFFF', cursor: 'pointer',
                  }}
                >
                  {isDeletingAccount ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          ) : (
            <button
              id="delete-account-button"
              onClick={handleDeleteAccount}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                width: '100%', paddingTop: '12px', background: 'none', border: 'none',
                cursor: 'pointer', color: '#8E99A8', fontSize: '12.5px', fontWeight: 600,
              }}
            >
              <Trash2 size={14} />
              <span>Delete Account</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};
