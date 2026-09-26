import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { CartProvider } from './context/CartContext';
import { I18nProvider } from './i18n';
import { MobileTopBar } from './components/navigation/MobileTopBar';
import { MobileBottomNav, TabKey } from './components/navigation/MobileBottomNav';
import { SimulatorControls } from './components/navigation/SimulatorControls';
import { FeedView } from './components/feed/FeedView';
import { ExploreView } from './components/explore/ExploreView';
import { OrdersView } from './components/orders/OrdersView';
import { CustomerProfileView } from './components/profile/CustomerProfileView';
import { RestaurantProfileView } from './components/restaurant/RestaurantProfileView';
import { VendorDashboard } from './components/vendor/VendorDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ProductOrderModal } from './components/product/ProductOrderModal';
import { CartDrawer } from './components/cart/CartDrawer';
import { CommentsBottomSheet } from './components/feed/CommentsBottomSheet';
import { ShareModal } from './components/feed/ShareModal';
import { CreateDropModal } from './components/vendor/CreateDropModal';
import { NotificationsModal } from './components/notifications/NotificationsModal';
import { Modal } from './components/common/Modal';
import { FoodPost, Product } from './types';
import { MapPin, CheckCircle2 } from 'lucide-react';

const CITIES = ['Metropolis', 'Lahore', 'Karachi', 'Islamabad', 'Dubai', 'London', 'New York'];

const MainAppContent: React.FC = () => {
  const { role, user, updateProfile } = useAuth();
  const { posts, products } = useData();

  // Navigation State
  const [activeTab, setActiveTab] = useState<TabKey>('feed');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [isPhoneFrame, setIsPhoneFrame] = useState(true);

  // Modals state
  const [orderModalPost, setOrderModalPost] = useState<FoodPost | null>(null);
  const [orderModalProduct, setOrderModalProduct] = useState<Product | null>(null);
  const [commentsModalPost, setCommentsModalPost] = useState<FoodPost | null>(null);
  const [shareModalPost, setShareModalPost] = useState<FoodPost | null>(null);
  const [isCreateDropOpen, setIsCreateDropOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Check URL query parameters for direct shared drop links (e.g. ?drop=post-1 or ?drop=post-5)
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

  // When role changes, switch appropriate default tab
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

  const handleSelectCity = (city: string) => {
    if (user?.location) {
      updateProfile({
        location: {
          ...user.location,
          city,
        },
      });
    }
    setIsLocationModalOpen(false);
  };

  return (
    <div className={`simulator-layout ${!isPhoneFrame ? 'full-width' : ''}`}>
      {/* Top Demo Toolbar: Allows switching role & toggling phone frame */}
      <SimulatorControls
        isPhoneFrame={isPhoneFrame}
        onToggleFrame={() => setIsPhoneFrame(!isPhoneFrame)}
        onOpenCreateDrop={() => setIsCreateDropOpen(true)}
      />

      {/* Mobile Device Frame Shell */}
      <div className="device-frame">
        {/* Phone Notch (Visual Hardware Simulator) */}
        <div className="phone-notch">
          <div className="notch-camera" />
          <div className="notch-speaker" />
        </div>

        {/* Viewport Screen Content */}
        <div className="screen-viewport">
          {/* Mobile Top Bar */}
          <MobileTopBar
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            onOpenLocationModal={() => setIsLocationModalOpen(true)}
          />

          {/* Main Content Area */}
          <main className="main-content-scroll">
            {selectedRestaurantId ? (
              <RestaurantProfileView
                restaurantId={selectedRestaurantId}
                onBack={() => setSelectedRestaurantId(null)}
                onOpenOrderModal={handleOpenOrderModalForPost}
                onSelectProduct={handleSelectProduct}
              />
            ) : (
              <>
                {/* FEED VIEW */}
                {activeTab === 'feed' && (
                  <FeedView
                    onOpenOrderModal={handleOpenOrderModalForPost}
                    onOpenComments={(post) => setCommentsModalPost(post)}
                    onOpenShare={(post) => setShareModalPost(post)}
                    onSelectRestaurant={handleSelectRestaurant}
                  />
                )}

                {/* EXPLORE / SEARCH VIEW */}
                {activeTab === 'explore' && (
                  <ExploreView
                    onOpenOrderModal={handleOpenOrderModalForPost}
                    onSelectProduct={handleSelectProduct}
                    onSelectRestaurant={handleSelectRestaurant}
                  />
                )}

                {/* ORDERS VIEW */}
                {activeTab === 'orders' && (
                  role === 'restaurant' ? (
                    <VendorDashboard onOpenCreateDrop={() => setIsCreateDropOpen(true)} />
                  ) : (
                    <OrdersView />
                  )
                )}

                {/* PROFILE VIEW */}
                {activeTab === 'profile' && (
                  <CustomerProfileView
                    onOpenOrderModal={handleOpenOrderModalForPost}
                    onSelectRestaurant={handleSelectRestaurant}
                  />
                )}

                {/* VENDOR ANALYTICS */}
                {activeTab === 'analytics' && (
                  <VendorDashboard onOpenCreateDrop={() => setIsCreateDropOpen(true)} />
                )}

                {/* ADMIN TABS */}
                {(activeTab === 'admin_reports' || activeTab === 'admin_restaurants') && (
                  <AdminDashboard />
                )}
              </>
            )}
          </main>

          {/* Bottom Navigation */}
          <MobileBottomNav
            activeTab={activeTab}
            onSelectTab={(tab) => {
              setSelectedRestaurantId(null);
              setActiveTab(tab);
            }}
            onOpenCreateDrop={() => setIsCreateDropOpen(true)}
          />
        </div>
      </div>

      {/* Global Modals & Bottom Sheets */}
      <ProductOrderModal
        isOpen={!!orderModalProduct}
        onClose={() => {
          setOrderModalProduct(null);
          setOrderModalPost(null);
        }}
        product={orderModalProduct}
        post={orderModalPost}
      />

      <CartDrawer />

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
          if (url.includes('/orders')) {
            setActiveTab('orders');
          }
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
            const isSelected = (user?.location?.city || 'Metropolis') === city;
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

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <DataProvider>
          <CartProvider>
            <MainAppContent />
          </CartProvider>
        </DataProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
