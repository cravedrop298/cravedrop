import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { Order, OrderStatus, Product } from '../../types';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ShoppingBag,
  Users,
  Eye,
  Plus,
  Store,
  DollarSign,
  ChefHat,
  Bike,
  PackageCheck,
  AlertCircle,
} from 'lucide-react';

interface VendorDashboardProps {
  onOpenCreateDrop: () => void;
}

type VendorTab = 'orders' | 'menu' | 'analytics';
type OrderSubTab = 'new' | 'active' | 'completed' | 'cancelled';

export const VendorDashboard: React.FC<VendorDashboardProps> = ({ onOpenCreateDrop }) => {
  const { user } = useAuth();
  const {
    orders,
    products,
    updateOrderStatus,
    createProduct,
    updateProduct,
    getRestaurantAnalytics,
    restaurants,
  } = useData();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<VendorTab>('orders');
  const [orderSubTab, setOrderSubTab] = useState<OrderSubTab>('new');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  // New product form states
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Pizza');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdPrepTime, setNewProdPrepTime] = useState('15');

  const restaurantId = user?.restaurant_id || 'rest-1';
  const restaurant = restaurants.find((r) => r.id === restaurantId);
  const analytics = getRestaurantAnalytics(restaurantId);

  // Filter restaurant orders
  const restaurantOrders = orders.filter((o) => o.restaurant_id === restaurantId);
  const newOrders = restaurantOrders.filter((o) => o.status === 'pending');
  const activeOrders = restaurantOrders.filter(
    (o) =>
      o.status === 'accepted' ||
      o.status === 'preparing' ||
      o.status === 'ready' ||
      o.status === 'out_for_delivery'
  );
  const completedOrders = restaurantOrders.filter((o) => o.status === 'delivered');
  const cancelledOrders = restaurantOrders.filter(
    (o) => o.status === 'rejected' || o.status === 'cancelled'
  );

  const displayedOrders = {
    new: newOrders,
    active: activeOrders,
    completed: completedOrders,
    cancelled: cancelledOrders,
  }[orderSubTab];

  // Advance Order Lifecycle
  const getNextStatus = (current: OrderStatus): OrderStatus | null => {
    switch (current) {
      case 'accepted':
        return 'preparing';
      case 'preparing':
        return 'ready';
      case 'ready':
        return 'out_for_delivery';
      case 'out_for_delivery':
        return 'delivered';
      default:
        return null;
    }
  };

  const nextStatusLabel: Record<OrderStatus, string> = {
    pending: 'Accept',
    accepted: 'Start Cooking',
    preparing: 'Mark Ready',
    ready: 'Dispatch Delivery',
    out_for_delivery: 'Mark Delivered',
    delivered: 'Completed',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice) return;

    createProduct({
      restaurant_id: restaurantId,
      name: newProdName.trim(),
      description: newProdDesc.trim(),
      price: parseFloat(newProdPrice),
      category: newProdCategory,
      image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
      is_available: true,
      prep_time_mins: parseInt(newProdPrepTime) || 15,
      is_active: true,
    });

    setIsAddProductOpen(false);
    setNewProdName('');
    setNewProdPrice('');
    setNewProdDesc('');
  };

  return (
    <div style={{ padding: '16px 16px 40px' }}>
      {/* Restaurant Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Store size={18} color="var(--accent-coral)" />
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>{restaurant?.name || 'Kitchen Partner'}</h2>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Partner Dashboard · Cash on Delivery Orders
          </span>
        </div>

        <button
          onClick={onOpenCreateDrop}
          className="btn-primary"
          style={{ padding: '8px 14px', fontSize: '12.5px' }}
        >
          <Plus size={14} />
          <span>New Drop</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-md)',
          padding: '4px',
          border: '1px solid var(--border-light)',
          marginBottom: '16px',
        }}
      >
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: 700,
            backgroundColor: activeTab === 'orders' ? 'var(--accent-coral)' : 'transparent',
            color: activeTab === 'orders' ? '#FFFFFF' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <ClipboardList size={15} />
          <span>Orders ({newOrders.length + activeOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('menu')}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: 700,
            backgroundColor: activeTab === 'menu' ? 'var(--accent-coral)' : 'transparent',
            color: activeTab === 'menu' ? '#FFFFFF' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <ChefHat size={15} />
          <span>Menu</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: 700,
            backgroundColor: activeTab === 'analytics' ? 'var(--accent-coral)' : 'transparent',
            color: activeTab === 'analytics' ? '#FFFFFF' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <TrendingUp size={15} />
          <span>Analytics</span>
        </button>
      </div>

      {/* TAB 1: ORDERS DASHBOARD */}
      {activeTab === 'orders' && (
        <div>
          {/* Sub-tabs for order states */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {[
              { key: 'new' as OrderSubTab, label: `New (${newOrders.length})`, alert: newOrders.length > 0 },
              { key: 'active' as OrderSubTab, label: `Active (${activeOrders.length})` },
              { key: 'completed' as OrderSubTab, label: `Completed (${completedOrders.length})` },
              { key: 'cancelled' as OrderSubTab, label: `Rejected (${cancelledOrders.length})` },
            ].map((sub) => {
              const isSelected = orderSubTab === sub.key;
              return (
                <button
                  key={sub.key}
                  onClick={() => setOrderSubTab(sub.key)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '12px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    backgroundColor: isSelected ? 'var(--text-primary)' : '#FFFFFF',
                    color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                    border: `1px solid ${isSelected ? 'var(--text-primary)' : 'var(--border-light)'}`,
                    position: 'relative',
                  }}
                >
                  {sub.label}
                  {sub.alert && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        width: '7px',
                        height: '7px',
                        backgroundColor: 'var(--accent-coral)',
                        borderRadius: '50%',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Orders List */}
          {displayedOrders.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                border: '1px solid var(--border-light)',
              }}
            >
              <ClipboardList size={32} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
              <p style={{ fontSize: '14px', fontWeight: 700 }}>No {orderSubTab} orders</p>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                New orders placed from drops will appear here in real time.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {displayedOrders.map((order) => {
                const next = getNextStatus(order.status);

                return (
                  <div
                    key={order.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '18px',
                      padding: '16px',
                      border: '1px solid var(--border-light)',
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <h4 style={{ fontSize: '14.5px', fontWeight: 800 }}>Order #{order.id}</h4>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: 'var(--bg-butter)',
                              color: '#B45309',
                              padding: '2px 7px',
                              borderRadius: '8px',
                            }}
                          >
                            {order.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-coral)' }}>
                        ${order.total.toFixed(2)}
                      </span>
                    </div>

                    {/* Customer info */}
                    <div style={{ margin: '10px 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      <p><strong>Customer:</strong> {order.customer_name} ({order.customer_phone})</p>
                      <p><strong>Address:</strong> {order.delivery_address}</p>
                      {order.notes && <p style={{ fontStyle: 'italic', marginTop: '2px' }}><strong>Note:</strong> "{order.notes}"</p>}
                    </div>

                    {/* Items */}
                    <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '10px', borderRadius: '10px', fontSize: '12.5px', marginBottom: '12px' }}>
                      {order.items.map((i, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{i.quantity}x {i.product_name}</span>
                          <span style={{ fontWeight: 600 }}>${(i.price * i.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Order Action Buttons */}
                    {order.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          fullWidth
                          onClick={() => updateOrderStatus(order.id, 'rejected', 'Kitchen at capacity')}
                        >
                          <XCircle size={14} color="#DC2626" />
                          <span>Reject</span>
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          fullWidth
                          onClick={() => updateOrderStatus(order.id, 'accepted', 'Accepted and cooking started')}
                        >
                          <CheckCircle2 size={14} />
                          <span>Accept Order</span>
                        </Button>
                      </div>
                    )}

                    {next && (
                      <Button
                        variant="primary"
                        size="sm"
                        fullWidth
                        onClick={() => updateOrderStatus(order.id, next)}
                      >
                        <span>Advance Status: {nextStatusLabel[order.status]}</span>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MENU MANAGEMENT */}
      {activeTab === 'menu' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800 }}>Menu Catalog ({products.filter((p) => p.restaurant_id === restaurantId).length})</h3>
            <Button size="sm" variant="primary" onClick={() => setIsAddProductOpen(true)}>
              <Plus size={14} />
              <span>Add Dish</span>
            </Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {products
              .filter((p) => p.restaurant_id === restaurantId)
              .map((prod) => (
                <div
                  key={prod.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    border: '1px solid var(--border-light)',
                  }}
                >
                  <img
                    src={prod.image_url}
                    alt={prod.name}
                    style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <h4 style={{ fontSize: '13.5px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {prod.name}
                      </h4>
                      {!prod.is_available && (
                        <span style={{ fontSize: '10px', color: '#DC2626', fontWeight: 700 }}>
                          Out of stock
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '12.5px', color: 'var(--accent-coral)', fontWeight: 800 }}>
                      ${prod.price.toFixed(2)}
                    </p>
                  </div>

                  <button
                    onClick={() => updateProduct(prod.id, { is_available: !prod.is_available })}
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 8px',
                      borderRadius: '8px',
                      backgroundColor: prod.is_available ? 'var(--accent-green-light)' : '#FEF2F2',
                      color: prod.is_available ? 'var(--accent-green)' : '#DC2626',
                      border: 'none',
                    }}
                  >
                    {prod.is_available ? 'Available' : 'Unavailable'}
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 3: RESTAURANT ANALYTICS */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Key Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                padding: '14px',
                borderRadius: '16px',
                border: '1px solid var(--border-light)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                <Eye size={15} />
                <span style={{ fontSize: '12px', fontWeight: 600 }}>Drop Views</span>
              </div>
              <p style={{ fontSize: '22px', fontWeight: 800, marginTop: '6px' }}>
                {analytics.views_today.toLocaleString()}
              </p>
              <span style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: 700 }}>
                +{analytics.views_change_pct}% today
              </span>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                padding: '14px',
                borderRadius: '16px',
                border: '1px solid var(--border-light)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                <ShoppingBag size={15} />
                <span style={{ fontSize: '12px', fontWeight: 600 }}>Orders Today</span>
              </div>
              <p style={{ fontSize: '22px', fontWeight: 800, marginTop: '6px' }}>
                {analytics.orders_today}
              </p>
              <span style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: 700 }}>
                +{analytics.orders_change_pct}% conversion
              </span>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                padding: '14px',
                borderRadius: '16px',
                border: '1px solid var(--border-light)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                <DollarSign size={15} />
                <span style={{ fontSize: '12px', fontWeight: 600 }}>COD Revenue</span>
              </div>
              <p style={{ fontSize: '22px', fontWeight: 800, marginTop: '6px', color: 'var(--accent-coral)' }}>
                ${analytics.revenue_today.toFixed(2)}
              </p>
              <span style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: 700 }}>
                +{analytics.revenue_change_pct}% this week
              </span>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                padding: '14px',
                borderRadius: '16px',
                border: '1px solid var(--border-light)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                <TrendingUp size={15} />
                <span style={{ fontSize: '12px', fontWeight: 600 }}>Conversion</span>
              </div>
              <p style={{ fontSize: '22px', fontWeight: 800, marginTop: '6px' }}>
                {analytics.conversion_rate}%
              </p>
              <span style={{ fontSize: '11px', color: '#B45309', fontWeight: 700 }}>
                Content → Orders
              </span>
            </div>
          </div>

          {/* Popular Drops Performance Table */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              padding: '14px',
              border: '1px solid var(--border-light)',
            }}
          >
            <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '10px' }}>
              Top Performing Food Drops
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {analytics.popular_posts.map((drop) => (
                <div
                  key={drop.post_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <img
                    src={drop.thumbnail}
                    alt={drop.product_name}
                    style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h5 style={{ fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {drop.product_name}
                    </h5>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>{drop.views} views</span>
                      <span>{drop.likes} likes</span>
                      <span style={{ color: 'var(--accent-coral)', fontWeight: 700 }}>{drop.orders} orders</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-green)' }}>
                    {drop.conversion}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        title="Add Menu Item"
        subtitle="Create a food item to drop to customers."
      >
        <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>Dish Name</label>
            <input
              type="text"
              required
              value={newProdName}
              onChange={(e) => setNewProdName(e.target.value)}
              placeholder="e.g. Sourdough Garlic Bread"
              className="input-control"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>Price ($)</label>
              <input
                type="number"
                step="0.01"
                required
                value={newProdPrice}
                onChange={(e) => setNewProdPrice(e.target.value)}
                placeholder="12.99"
                className="input-control"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>Prep Time (mins)</label>
              <input
                type="number"
                value={newProdPrepTime}
                onChange={(e) => setNewProdPrepTime(e.target.value)}
                placeholder="15"
                className="input-control"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>Description</label>
            <textarea
              rows={2}
              value={newProdDesc}
              onChange={(e) => setNewProdDesc(e.target.value)}
              placeholder="Ingredients and description..."
              className="input-control"
              style={{ resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button type="button" variant="secondary" fullWidth onClick={() => setIsAddProductOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" fullWidth>
              Save Dish
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
