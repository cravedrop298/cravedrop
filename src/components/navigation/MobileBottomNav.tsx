import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useData } from '../../context/DataContext';
import { useTranslation } from '../../i18n';
import {
  Flame,
  Compass,
  Plus,
  ShoppingBag,
  Clock,
  User,
  BarChart3,
  ShieldCheck,
  ClipboardList,
} from 'lucide-react';

export type TabKey = 'feed' | 'explore' | 'create_drop' | 'orders' | 'profile' | 'analytics' | 'admin_reports' | 'admin_restaurants';

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
  const { orders, reports } = useData();
  const { t } = useTranslation();

  const activeOrdersCount = orders.filter(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled' && o.status !== 'rejected'
  ).length;

  const pendingReportsCount = reports.filter((r) => r.status === 'pending').length;

  if (role === 'restaurant') {
    return (
      <nav className="bottom-nav">
        <button
          className={`nav-item ${activeTab === 'feed' ? 'active' : ''}`}
          onClick={() => onSelectTab('feed')}
        >
          <Flame size={21} />
          <span>{t('nav_home')}</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => onSelectTab('orders')}
        >
          <ClipboardList size={21} />
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
          onClick={() => onSelectTab('analytics')}
        >
          <BarChart3 size={21} />
          <span>{t('nav_analytics')}</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => onSelectTab('profile')}
        >
          <User size={21} />
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
          onClick={() => onSelectTab('feed')}
        >
          <Flame size={21} />
          <span>Live Feed</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'admin_reports' ? 'active' : ''}`}
          onClick={() => onSelectTab('admin_reports')}
        >
          <ShieldCheck size={21} />
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
          onClick={() => onSelectTab('admin_restaurants')}
        >
          <ClipboardList size={21} />
          <span>Kitchens</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => onSelectTab('analytics')}
        >
          <BarChart3 size={21} />
          <span>Metrics</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => onSelectTab('profile')}
        >
          <User size={21} />
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
        onClick={() => onSelectTab('feed')}
      >
        <Flame size={21} />
        <span>{t('nav_home')}</span>
      </button>

      <button
        className={`nav-item ${activeTab === 'explore' ? 'active' : ''}`}
        onClick={() => onSelectTab('explore')}
      >
        <Compass size={21} />
        <span>{t('nav_explore')}</span>
      </button>

      {/* Bag / Cart Trigger */}
      <button
        className="nav-item"
        onClick={() => setIsCartDrawerOpen(true)}
        title="View Food Bag"
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
          <ShoppingBag size={21} color={totalItemCount > 0 ? 'var(--accent-coral)' : 'currentColor'} />
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
        <span style={{ color: totalItemCount > 0 ? 'var(--accent-coral)' : undefined }}>Bag</span>
      </button>

      <button
        className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
        onClick={() => onSelectTab('orders')}
      >
        <Clock size={21} />
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

      <button
        className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
        onClick={() => onSelectTab('profile')}
      >
        <User size={21} />
        <span>{t('nav_profile')}</span>
      </button>
    </nav>
  );
};
