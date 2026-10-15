import React, { useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useData } from '../../context/DataContext';
import { useTranslation } from '../../i18n';
import {
  House,
  Plus,
  ShoppingBag,
  Clock,
  User,
  BarChart3,
  ShieldCheck,
  ClipboardList,
  Flame,
  MessageCircle,
} from 'lucide-react';

export type TabKey = 'feed' | 'explore' | 'bag' | 'create_drop' | 'messages' | 'orders' | 'profile' | 'analytics' | 'admin_reports' | 'admin_restaurants';

interface MobileBottomNavProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  onOpenCreateDrop: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenCreateDrop,
}) => {
  const { role } = useAuth();
  const { totalItemCount, setIsCartDrawerOpen } = useCart();
  const { orders, reports, conversations = [], reloadSystem, isReloading } = useData();
  const { t } = useTranslation();
  const lastTapRef = useRef<{ [key: string]: number }>({});

  const totalUnreadMessages = (conversations || []).reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const activeOrdersCount = orders.filter(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled' && o.status !== 'rejected'
  ).length;

  const pendingReportsCount = reports.filter((r) => r.status === 'pending').length;

  const triggerReloadAndScroll = () => {
    const scrollContainer = document.querySelector('.main-content-scroll');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
    reloadSystem();
  };

  const handleTabPress = (tab: TabKey) => {
    const now = Date.now();
    const lastTap = lastTapRef.current[tab] || 0;
    const isDoubleTap = now - lastTap < 380;
    lastTapRef.current[tab] = now;

    if (activeTab === tab || isDoubleTap) {
      triggerReloadAndScroll();
    }

    onSelectTab(tab);
  };

  const handleTabDoubleClick = (tab: TabKey) => {
    triggerReloadAndScroll();
    onSelectTab(tab);
  };

  if (role === 'restaurant') {
    return (
      <nav className="bottom-nav">
        <button
          className={`nav-item ${activeTab === 'feed' ? 'active' : ''}`}
          onClick={() => handleTabPress('feed')}
          onDoubleClick={() => handleTabDoubleClick('feed')}
          title="Home / Double-click to reload"
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Flame size={20} />
            {isReloading && activeTab === 'feed' && <div className="tab-spinner-ring" />}
          </div>
          <span>{t('nav_home')}</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => handleTabPress('orders')}
          onDoubleClick={() => handleTabDoubleClick('orders')}
          title="Orders / Double-click to reload"
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardList size={20} />
            {isReloading && activeTab === 'orders' && <div className="tab-spinner-ring" />}
          </div>
          <span>{t('nav_orders')}</span>
          {activeOrdersCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '5px',
                right: '25%',
                backgroundColor: 'var(--accent-coral)',
                color: 'white',
                fontSize: '9.5px',
                fontWeight: 800,
                padding: '1px 5px',
                borderRadius: '10px',
              }}
            >
              {activeOrdersCount}
            </span>
          )}
        </button>

        {/* Highlighted Center Drop Button */}
        <button
          className="nav-item special-action"
          onClick={onOpenCreateDrop}
          title="Drop New Limited-Time Special"
        >
          <div className="drop-button-icon">
            <Plus size={24} color="#FFFFFF" strokeWidth={3} />
          </div>
          <span style={{ color: 'var(--accent-coral)', fontWeight: 700 }}>Drop</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => handleTabPress('analytics')}
          onDoubleClick={() => handleTabDoubleClick('analytics')}
          title="Analytics / Double-click to reload"
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 size={20} />
            {isReloading && activeTab === 'analytics' && <div className="tab-spinner-ring" />}
          </div>
          <span>{t('nav_analytics')}</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => handleTabPress('profile')}
          onDoubleClick={() => handleTabDoubleClick('profile')}
          title="Profile / Double-click to reload"
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={20} />
            {isReloading && activeTab === 'profile' && <div className="tab-spinner-ring" />}
          </div>
          <span>{t('nav_profile')}</span>
        </button>
      </nav>
    );
  }

  if (role === 'admin') {
    return (
      <nav className="bottom-nav">
        <button
          className={`nav-item ${activeTab === 'feed' ? 'active' : ''}`}
          onClick={() => handleTabPress('feed')}
          onDoubleClick={() => handleTabDoubleClick('feed')}
          title="Live Feed / Double-click to reload"
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Flame size={20} />
            {isReloading && activeTab === 'feed' && <div className="tab-spinner-ring" />}
          </div>
          <span>Live Feed</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'admin_reports' ? 'active' : ''}`}
          onClick={() => handleTabPress('admin_reports')}
          onDoubleClick={() => handleTabDoubleClick('admin_reports')}
          title="Reports / Double-click to reload"
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={20} />
            {isReloading && activeTab === 'admin_reports' && <div className="tab-spinner-ring" />}
          </div>
          <span>Reports</span>
          {pendingReportsCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '5px',
                right: '20%',
                backgroundColor: 'var(--accent-coral)',
                color: 'white',
                fontSize: '9.5px',
                fontWeight: 800,
                padding: '1px 5px',
                borderRadius: '10px',
              }}
            >
              {pendingReportsCount}
            </span>
          )}
        </button>

        <button
          className={`nav-item ${activeTab === 'admin_restaurants' ? 'active' : ''}`}
          onClick={() => handleTabPress('admin_restaurants')}
          onDoubleClick={() => handleTabDoubleClick('admin_restaurants')}
          title="Kitchens / Double-click to reload"
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardList size={20} />
            {isReloading && activeTab === 'admin_restaurants' && <div className="tab-spinner-ring" />}
          </div>
          <span>Kitchens</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => handleTabPress('analytics')}
          onDoubleClick={() => handleTabDoubleClick('analytics')}
          title="Metrics / Double-click to reload"
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 size={20} />
            {isReloading && activeTab === 'analytics' && <div className="tab-spinner-ring" />}
          </div>
          <span>Metrics</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => handleTabPress('profile')}
          onDoubleClick={() => handleTabDoubleClick('profile')}
          title="Account / Double-click to reload"
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={20} />
            {isReloading && activeTab === 'profile' && <div className="tab-spinner-ring" />}
          </div>
          <span>Account</span>
        </button>
      </nav>
    );
  }

  // Customer Navigation
  return (
    <nav className="bottom-nav">
      <button
        className={`nav-item ${activeTab === 'feed' ? 'active' : ''}`}
        onClick={() => handleTabPress('feed')}
        onDoubleClick={() => handleTabDoubleClick('feed')}
        title="Home / Double-click to reload feed"
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <House size={20} />
          {isReloading && activeTab === 'feed' && <div className="tab-spinner-ring" />}
        </div>
        <span>{t('nav_home')}</span>
      </button>

      <button
        className={`nav-item ${activeTab === 'explore' ? 'active' : ''}`}
        onClick={() => handleTabPress('explore')}
        onDoubleClick={() => handleTabDoubleClick('explore')}
        title="Feed / Double-click to reload feed"
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Flame size={20} />
          {isReloading && activeTab === 'explore' && <div className="tab-spinner-ring" />}
        </div>
        <span>{t('nav_feed')}</span>
      </button>

      {/* Bag / Cart Page Tab */}
      <button
        className={`nav-item ${activeTab === 'bag' ? 'active' : ''}`}
        onClick={() => handleTabPress('bag')}
        onDoubleClick={() => handleTabDoubleClick('bag')}
        title="Food Bag / Double-click to reload"
        style={{ position: 'relative' }}
      >
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ShoppingBag size={20} color={activeTab === 'bag' || totalItemCount > 0 ? 'var(--accent-coral)' : 'currentColor'} />
          {isReloading && activeTab === 'bag' && <div className="tab-spinner-ring" />}
          {totalItemCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-5px',
                right: '-8px',
                backgroundColor: 'var(--accent-coral)',
                color: 'white',
                fontSize: '10px',
                fontWeight: 800,
                padding: '1px 5px',
                borderRadius: '10px',
              }}
            >
              {totalItemCount}
            </span>
          )}
        </div>
        <span style={{ color: activeTab === 'bag' || totalItemCount > 0 ? 'var(--accent-coral)' : undefined }}>Bag</span>
      </button>

      <button
        className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`}
        onClick={() => handleTabPress('messages')}
        onDoubleClick={() => handleTabDoubleClick('messages')}
        title="Messages / Double-click to reload"
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MessageCircle size={20} />
          {isReloading && activeTab === 'messages' && <div className="tab-spinner-ring" />}
        </div>
        <span>{t('nav_messages')}</span>
        {totalUnreadMessages > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '5px',
              right: '25%',
              backgroundColor: 'var(--accent-coral)',
              color: 'white',
              fontSize: '9.5px',
              fontWeight: 800,
              padding: '1px 5px',
              borderRadius: '10px',
            }}
          >
            {totalUnreadMessages}
          </span>
        )}
      </button>

      <button
        className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
        onClick={() => handleTabPress('profile')}
        onDoubleClick={() => handleTabDoubleClick('profile')}
        title="Profile / Double-click to reload"
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={20} />
          {isReloading && activeTab === 'profile' && <div className="tab-spinner-ring" />}
        </div>
        <span>{t('nav_profile')}</span>
      </button>
    </nav>
  );
};

