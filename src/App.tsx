import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { CartProvider, useCart } from './context/CartContext';
import { I18nProvider } from './i18n';
import { MobileTopBar } from './components/navigation/MobileTopBar';
import { MobileBottomNav, TabKey } from './components/navigation/MobileBottomNav';
import { FeedView } from './components/feed/FeedView';
import { ExploreView } from './components/explore/ExploreView';
import { ReelsView } from './components/reels/ReelsView';
import { OrdersView } from './components/orders/OrdersView';
import { CustomerProfileView } from './components/profile/CustomerProfileView';
import { MySavedView } from './components/profile/MySavedView';
import { EditProfileView } from './components/profile/EditProfileView';
import { MessagesView } from './components/messages/MessagesView';
import { RestaurantProfileView } from './components/restaurant/RestaurantProfileView';
import { VendorDashboard } from './components/vendor/VendorDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ProductOrderModal } from './components/product/ProductOrderModal';
import { CartDrawer } from './components/cart/CartDrawer';
import { BagView } from './components/cart/BagView';
import { CommentsBottomSheet } from './components/feed/CommentsBottomSheet';
import { ShareModal } from './components/feed/ShareModal';
import { CreateDropModal } from './components/vendor/CreateDropModal';
import { NotificationsModal } from './components/notifications/NotificationsModal';
import { Modal } from './components/common/Modal';

// NEW: Auth/Onboarding flow
import { SplashScreen } from './components/auth/SplashScreen';
import { AuthScreen } from './components/auth/AuthScreen';
import { OnboardingView } from './components/auth/OnboardingView';
import { RestaurantSetupView } from './components/auth/RestaurantSetupView';

import { FoodPost, Product } from './types';
import { MapPin, CheckCircle2 } from 'lucide-react';

import { PAKISTAN_CITIES, getCityByName } from './utils/userUtils';

const CITIES = PAKISTAN_CITIES;

// ============================================================
// MAIN APP CONTENT (rendered after auth is confirmed)
// ============================================================
const MainAppContent: React.FC = () => {
  const { role, user, updateProfile } = useAuth();
  const { posts, products, isReloading, reloadSystem } = useData();
  const { isCartDrawerOpen, setIsCartDrawerOpen } = useCart();

  const [activeTab, setActiveTab] = useState<TabKey>('feed');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [profileSubView, setProfileSubView] = useState<'my_saved' | 'edit_profile' | null>(null);

  const [orderModalPost, setOrderModalPost] = useState<FoodPost | null>(null);
  const [orderModalProduct, setOrderModalProduct] = useState<Product | null>(null);
  const [commentsModalPost, setCommentsModalPost] = useState<FoodPost | null>(null);
  const [shareModalPost, setShareModalPost] = useState<FoodPost | null>(null);
  const [isCreateDropOpen, setIsCreateDropOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const [slideAnimation, setSlideAnimation] = useState<'tab-slide-next' | 'tab-slide-prev' | ''>('');
  const dragStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    if (slideAnimation) {
      const timer = setTimeout(() => setSlideAnimation(''), 240);
      return () => clearTimeout(timer);
    }
  }, [slideAnimation, activeTab]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dropId = params.get('drop');
    if (dropId) {
      const match = posts.find((p) => p.id === dropId);
      if (match) {
        setOrderModalPost(match);
        const prod = products.find((pr) => pr.id === match.product_id);
        if (prod) setOrderModalProduct(prod);
      }
    }
  }, [posts, products]);

  useEffect(() => {
    if (role === 'admin' && (activeTab === 'orders' || activeTab === 'explore')) {
      setActiveTab('admin_reports');
    }
  }, [role]);

  const handleOpenOrderModalForPost = (post: FoodPost) => {
    setOrderModalPost(post);
    const prod = products.find((p) => p.id === post.product_id);
    setOrderModalProduct(prod || null);
  };

  const handleSelectProduct = (product: Product) => {
    setOrderModalProduct(product);
    setOrderModalPost(null);
  };

  const handleSelectRestaurant = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId);
  };

  const handleSelectCity = (cityName: string) => {
    const cityOpt = getCityByName(cityName);
    const resolvedName = cityOpt ? cityOpt.name : cityName;
    const resolvedId = cityOpt ? cityOpt.id : cityName.toLowerCase().replace(/\s+/g, '-');
    const lat = cityOpt?.lat || 31.5204;
    const lng = cityOpt?.lng || 74.3587;

    updateProfile({
      city: resolvedName,
      city_id: resolvedId,
      location: {
        address: resolvedName,
        city: resolvedName,
        lat,
        lng,
      },
    });
    setIsLocationModalOpen(false);
  };

  const handlePointerStart = (clientX: number, clientY: number, target: HTMLElement | null) => {
    if (!target) return;
    
    // Ignore swipe on inputs, textareas, selects, buttons, sliders, or explicit no-swipe elements
    if (target.closest('input, textarea, select, button, [role="slider"], .no-swipe')) {
      dragStartRef.current = null;
      return;
    }

    // Ignore swipe if inside a horizontal scrolling container
    let parent: HTMLElement | null = target;
    while (parent && parent !== document.body) {
      const style = window.getComputedStyle(parent);
      if ((style.overflowX === 'auto' || style.overflowX === 'scroll') && parent.scrollWidth > parent.clientWidth + 10) {
        dragStartRef.current = null;
        return;
      }
      parent = parent.parentElement;
    }

    dragStartRef.current = {
      x: clientX,
      y: clientY,
      time: Date.now(),
    };
  };

  const handlePointerEnd = (clientX: number, clientY: number) => {
    if (!dragStartRef.current) return;

    const startX = dragStartRef.current.x;
    const startY = dragStartRef.current.y;
    const startTime = dragStartRef.current.time;
    dragStartRef.current = null;

    const deltaX = clientX - startX;
    const deltaY = clientY - startY;
    const duration = Date.now() - startTime;

    // Minimum displacement 40px, maximum duration 650ms, must be horizontal (|deltaX| > |deltaY| * 0.85)
    if (duration > 650 || Math.abs(deltaX) < 40 || Math.abs(deltaY) > Math.abs(deltaX) * 0.85) {
      return;
    }

    // Disable tab swiping when any modal popup is open
    if (orderModalPost || orderModalProduct || commentsModalPost || shareModalPost || isCreateDropOpen || isNotificationsOpen || isLocationModalOpen) {
      return;
    }

    const isRTL = document.documentElement.dir === 'rtl' || document.body.dir === 'rtl';
    const isNext = isRTL ? deltaX > 0 : deltaX < 0;

    // Sub-views navigation
    if (selectedRestaurantId) {
      if (!isNext) setSelectedRestaurantId(null);
      return;
    }

    if (profileSubView) {
      if (!isNext) setProfileSubView(null);
      return;
    }

    // Tab sequence per user role
    if (role === 'customer' || !role) {
      const sequence: TabKey[] = ['feed', 'explore', 'bag', 'messages', 'profile'];
      const currIdx = sequence.indexOf(activeTab);
      if (currIdx !== -1) {
        if (isNext && currIdx < sequence.length - 1) {
          setSlideAnimation('tab-slide-next');
          setActiveTab(sequence[currIdx + 1]);
        } else if (!isNext && currIdx > 0) {
          setSlideAnimation('tab-slide-prev');
          setActiveTab(sequence[currIdx - 1]);
        }
      }
    } else if (role === 'restaurant') {
      const sequence: TabKey[] = ['feed', 'orders', 'analytics', 'profile'];
      const currIdx = sequence.indexOf(activeTab);
      if (currIdx !== -1) {
        if (isNext && currIdx < sequence.length - 1) {
          setSlideAnimation('tab-slide-next');
          setActiveTab(sequence[currIdx + 1]);
        } else if (!isNext && currIdx > 0) {
          setSlideAnimation('tab-slide-prev');
          setActiveTab(sequence[currIdx - 1]);
        }
      }
    } else if (role === 'admin') {
      const sequence: TabKey[] = ['feed', 'admin_reports', 'admin_restaurants', 'analytics', 'profile'];
      const currIdx = sequence.indexOf(activeTab);
      if (currIdx !== -1) {
        if (isNext && currIdx < sequence.length - 1) {
          setSlideAnimation('tab-slide-next');
          setActiveTab(sequence[currIdx + 1]);
        } else if (!isNext && currIdx > 0) {
          setSlideAnimation('tab-slide-prev');
          setActiveTab(sequence[currIdx - 1]);
        }
      }
    }
  };

  return (
    <div className="simulator-layout">
      <div className="device-frame">
        <div
          className="screen-viewport"
          onTouchStart={(e) => {
            if (e.touches.length === 1) {
              handlePointerStart(e.touches[0].clientX, e.touches[0].clientY, e.target as HTMLElement);
            }
          }}
          onTouchEnd={(e) => {
            if (e.changedTouches.length > 0) {
              handlePointerEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            }
          }}
          onMouseDown={(e) => {
            if (e.button === 0) {
              handlePointerStart(e.clientX, e.clientY, e.target as HTMLElement);
            }
          }}
          onMouseUp={(e) => {
            if (e.button === 0) {
              handlePointerEnd(e.clientX, e.clientY);
            }
          }}
        >
          <MobileTopBar
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            onOpenLocationModal={() => setIsLocationModalOpen(true)}
            onOpenProfile={() => {
              setSelectedRestaurantId(null);
              setProfileSubView(null);
              setActiveTab('profile');
            }}
            onLogoClick={() => {
              setSelectedRestaurantId(null);
              setProfileSubView(null);
              setActiveTab('feed');
              const scrollContainer = document.querySelector('.main-content-scroll');
              if (scrollContainer) {
                scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
              }
              reloadSystem();
            }}
          />

          {/* Floating Circling Refresh Loader */}
          {isReloading && (
            <div className="reload-indicator-floating" aria-label="Refreshing feed">
              <div className="reload-circle-spinner" />
            </div>
          )}

          <main className={`main-content-scroll ${slideAnimation} ${activeTab === 'explore' ? 'reels-mode' : ''}`}>
            {selectedRestaurantId ? (
              <RestaurantProfileView
                restaurantId={selectedRestaurantId}
                onBack={() => setSelectedRestaurantId(null)}
                onOpenOrderModal={handleOpenOrderModalForPost}
                onSelectProduct={handleSelectProduct}
              />
            ) : (
              <>
                {activeTab === 'feed' && (
                  <FeedView
                    onOpenOrderModal={handleOpenOrderModalForPost}
                    onOpenComments={(post) => setCommentsModalPost(post)}
                    onOpenShare={(post) => setShareModalPost(post)}
                    onSelectRestaurant={handleSelectRestaurant}
                    onOpenLocationModal={() => setIsLocationModalOpen(true)}
                    onExploreOtherCities={() => setActiveTab('explore')}
                  />
                )}

                {activeTab === 'explore' && (
                  <ReelsView
                    onOpenOrderModal={handleOpenOrderModalForPost}
                    onOpenComments={(post) => setCommentsModalPost(post)}
                    onOpenShare={(post) => setShareModalPost(post)}
                    onSelectRestaurant={handleSelectRestaurant}
                  />
                )}

                {activeTab === 'bag' && (
                  <BagView
                    onStartOrdering={() => {
                      setSelectedRestaurantId(null);
                      setActiveTab('feed');
                    }}
                    onSelectRestaurant={handleSelectRestaurant}
                    onNavigateOrders={() => {
                      setSelectedRestaurantId(null);
                      setActiveTab('orders');
                    }}
                  />
                )}

                {activeTab === 'messages' && (
                  <MessagesView
                    onOpenOrderModal={handleOpenOrderModalForPost}
                    onSelectRestaurant={handleSelectRestaurant}
                  />
                )}

                {activeTab === 'orders' && (
                  role === 'restaurant' ? (
                    <VendorDashboard onOpenCreateDrop={() => setIsCreateDropOpen(true)} />
                  ) : (
                    <OrdersView />
                  )
                )}

                {activeTab === 'profile' && (
                  profileSubView === 'my_saved' ? (
                    <MySavedView
                      onBack={() => setProfileSubView(null)}
                      onOpenOrderModal={handleOpenOrderModalForPost}
                      onSelectRestaurant={handleSelectRestaurant}
                    />
                  ) : profileSubView === 'edit_profile' ? (
                    <EditProfileView
                      onBack={() => setProfileSubView(null)}
                    />
                  ) : (
                    <CustomerProfileView
                      onOpenOrderModal={handleOpenOrderModalForPost}
                      onSelectRestaurant={handleSelectRestaurant}
                      onNavigateOrders={() => {
                        setProfileSubView(null);
                        setActiveTab('orders');
                      }}
                      onNavigateSaved={() => setProfileSubView('my_saved')}
                      onOpenEditProfile={() => setProfileSubView('edit_profile')}
                    />
                  )
                )}

                {activeTab === 'analytics' && (
                  <VendorDashboard onOpenCreateDrop={() => setIsCreateDropOpen(true)} />
                )}

                {(activeTab === 'admin_reports' || activeTab === 'admin_restaurants') && (
                  <AdminDashboard />
                )}
              </>
            )}
          </main>

          <MobileBottomNav
            activeTab={activeTab}
            onSelectTab={(tab) => {
              setSelectedRestaurantId(null);
              setProfileSubView(null);
              setActiveTab(tab);
            }}
            onOpenCreateDrop={() => setIsCreateDropOpen(true)}
          />
        </div>
      </div>

      {/* Global Modals */}
      <ProductOrderModal
        isOpen={!!orderModalProduct}
        onClose={() => { setOrderModalProduct(null); setOrderModalPost(null); }}
        product={orderModalProduct}
        post={orderModalPost}
        onNavigateToBag={() => {
          setSelectedRestaurantId(null);
          setProfileSubView(null);
          setActiveTab('bag');
        }}
      />
      <CartDrawer
        onOpenBagPage={() => {
          setSelectedRestaurantId(null);
          setProfileSubView(null);
          setActiveTab('bag');
        }}
      />
      <CommentsBottomSheet
        isOpen={!!commentsModalPost}
        onClose={() => setCommentsModalPost(null)}
        postId={commentsModalPost?.id || ''}
        postTitle={commentsModalPost?.product_name}
      />
      <ShareModal
        isOpen={!!shareModalPost}
        onClose={() => setShareModalPost(null)}
        post={shareModalPost}
      />
      <CreateDropModal
        isOpen={isCreateDropOpen}
        onClose={() => setIsCreateDropOpen(false)}
      />
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onSelectActionUrl={(url) => {
          if (url.includes('/orders')) setActiveTab('orders');
        }}
      />

      {/* Location Selector Modal */}
      <Modal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        title="Select Your City"
        subtitle="Discover artisanal kitchens and live drops near you"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {CITIES.map((city) => {
            const isSelected = (user?.city || user?.location?.city || 'Lahore') === city;
            return (
              <button
                key={city}
                onClick={() => handleSelectCity(city)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isSelected ? 'var(--bg-butter)' : 'var(--bg-subtle)',
                  border: `1px solid ${isSelected ? 'var(--bg-butter-border)' : 'var(--border-light)'}`,
                  fontSize: '14px',
                  fontWeight: isSelected ? 700 : 500,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={15} color={isSelected ? 'var(--accent-coral)' : 'var(--text-muted)'} />
                  <span>{city}</span>
                </div>
                {isSelected && <CheckCircle2 size={16} color="var(--accent-green)" />}
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};

// ============================================================
// APP SHELL — handles splash → auth → onboarding → main
// ============================================================
const AppShell: React.FC = () => {
  const {
    authStatus,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
    sendPasswordResetEmail,
    resendVerificationEmail,
    checkEmailVerification,
    completeOnboarding,
    completeRestaurantSetup,
  } = useAuth();

  const [splashDone, setSplashDone] = useState(false);
  const [showRestaurantSetup, setShowRestaurantSetup] = useState(false);

  // Splash shows until animation completes, regardless of auth status
  const showSplash = !splashDone;

  // After splash, determine what to show based on authStatus
  const showAuth = splashDone && authStatus === 'unauthenticated';
  const showOnboarding = splashDone && authStatus === 'onboarding_required' && !showRestaurantSetup;
  const showRestSetup = splashDone && (authStatus === 'restaurant_setup_required' || showRestaurantSetup);
  const showApp = splashDone && authStatus === 'authenticated';
  // Show a subtle loading pulse if auth is still being determined after splash
  const showLoading = splashDone && authStatus === 'loading';

  return (
    <>
      {/* ---- SPLASH SCREEN ---- */}
      {showSplash && (
        <SplashScreen
          onComplete={() => setSplashDone(true)}
        />
      )}

      {/* ---- LOADING STATE (after splash, checking session) ---- */}
      {showLoading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FAF7F2',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '36px' }}>🔥</span>
            <span style={{ fontSize: '13px', color: '#8E99A8', fontWeight: 600 }}>Loading...</span>
          </div>
        </div>
      )}

      {/* ---- AUTH SCREENS (unauthenticated) ---- */}
      {showAuth && (
        <div className="simulator-layout">
          <div className="device-frame">
            <div className="screen-viewport" style={{ overflow: 'hidden' }}>
              <AuthScreen
                onSignInWithEmail={signInWithEmail}
                onSignUpWithEmail={signUpWithEmail}
                onGoogleSignIn={signInWithGoogle}
                onAppleSignIn={signInWithApple}
                onSendResetEmail={sendPasswordResetEmail}
                onResendVerification={resendVerificationEmail}
                onCheckVerification={checkEmailVerification}
              />
            </div>
          </div>
        </div>
      )}

      {/* ---- CUSTOMER ONBOARDING ---- */}
      {showOnboarding && (
        <div className="simulator-layout">
          <div className="device-frame">
            <div className="screen-viewport" style={{ overflow: 'hidden auto' }}>
              <OnboardingView
                onComplete={completeOnboarding}
                onRestaurantSetup={() => setShowRestaurantSetup(true)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ---- RESTAURANT SETUP ---- */}
      {showRestSetup && (
        <div className="simulator-layout">
          <div className="device-frame">
            <div className="screen-viewport" style={{ overflow: 'hidden auto' }}>
              <RestaurantSetupView
                onComplete={completeRestaurantSetup}
                onBack={() => setShowRestaurantSetup(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ---- MAIN APP (authenticated) ---- */}
      {showApp && (
        <DataProvider>
          <CartProvider>
            <MainAppContent />
          </CartProvider>
        </DataProvider>
      )}
    </>
  );
};

// ============================================================
// ROOT EXPORT
// ============================================================
export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </I18nProvider>
  );
}
