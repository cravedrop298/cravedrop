import React, { useState } from 'react';
import { Order, OrderStatus } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import {
  Clock,
  CheckCircle2,
  ChefHat,
  Bike,
  PackageCheck,
  AlertCircle,
  Store,
  ChevronRight,
  Star,
  MapPin,
} from 'lucide-react';


export const OrdersView: React.FC = () => {
  const { orders } = useData();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Filter orders strictly for the authenticated user — NO hard-coded demo accounts
  const userOrders = orders.filter((o) => user?.id && o.customer_id === user.id);

  const activeOrders = userOrders.filter(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled' && o.status !== 'rejected'
  );

  const pastOrders = userOrders.filter(
    (o) => o.status === 'delivered' || o.status === 'cancelled' || o.status === 'rejected'
  );

  const statusSteps: { key: OrderStatus; label: string; icon: React.ReactNode }[] = [
    { key: 'pending', label: 'Received', icon: <Clock size={16} /> },
    { key: 'accepted', label: 'Accepted', icon: <CheckCircle2 size={16} /> },
    { key: 'preparing', label: 'Cooking', icon: <ChefHat size={16} /> },
    { key: 'ready', label: 'Ready', icon: <PackageCheck size={16} /> },
    { key: 'out_for_delivery', label: 'Out for Delivery', icon: <Bike size={16} /> },
    { key: 'delivered', label: 'Delivered', icon: <CheckCircle2 size={16} /> },
  ];

  const getStepIndex = (status: OrderStatus) => {
    return statusSteps.findIndex((s) => s.key === status);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReviewSubmitted(true);
    setTimeout(() => {
      setReviewSubmitted(false);
      setReviewOrder(null);
      setReviewText('');
    }, 1800);
  };

  return (
    <div style={{ padding: '16px 16px 30px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>
        {t('nav_orders')}
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
        Live tracking and delivery history
      </p>

      {/* ACTIVE ORDERS SECTION */}
      {activeOrders.length > 0 && (
        <section style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-coral)',
                display: 'inline-block',
              }}
            />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Active Orders ({activeOrders.length})
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {activeOrders.map((order) => {
              const currentStepIdx = getStepIndex(order.status);

              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '20px',
                    padding: '16px',
                    border: '1.5px solid var(--accent-coral-light)',
                    boxShadow: 'var(--shadow-sm)',
                    cursor: 'pointer',
                  }}
                >
                  {/* Order header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Store size={15} color="var(--accent-coral)" />
                        <h4 style={{ fontSize: '15px', fontWeight: 800 }}>{order.restaurant_name}</h4>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Order #{order.id} · {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <span
                      style={{
                        backgroundColor: 'var(--bg-butter)',
                        color: '#B45309',
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '12px',
                        border: '1px solid var(--bg-butter-border)',
                      }}
                    >
                      {order.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  {/* Step Progress Line */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 4px 16px' }}>
                    {statusSteps.map((step, idx) => {
                      const isComplete = idx <= currentStepIdx;
                      const isCurrent = idx === currentStepIdx;

                      return (
                        <div
                          key={step.key}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            flex: 1,
                            position: 'relative',
                          }}
                        >
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              backgroundColor: isComplete ? 'var(--accent-coral)' : 'var(--bg-subtle)',
                              color: isComplete ? '#FFFFFF' : 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: isCurrent ? '2px solid #FFFFFF' : 'none',
                              boxShadow: isCurrent ? '0 0 0 3px rgba(226, 75, 54, 0.3)' : 'none',
                              zIndex: 2,
                            }}
                          >
                            {step.icon}
                          </div>
                          <span
                            style={{
                              fontSize: '9.5px',
                              fontWeight: isCurrent ? 800 : 600,
                              color: isComplete ? 'var(--text-primary)' : 'var(--text-muted)',
                              textAlign: 'center',
                              lineHeight: 1.1,
                            }}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Items brief */}
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {order.items.reduce((s, i) => s + i.quantity, 0)} items · Cash on Delivery
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-coral)' }}>
                      Rs. {order.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* PAST ORDERS */}
      <section>
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>
          Past Deliveries
        </h3>

        {pastOrders.length === 0 && activeOrders.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid var(--border-light)',
            }}
          >
            <Clock size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Your next meal is waiting</h4>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Order a limited-time food drop from your favorite kitchen.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pastOrders.map((order) => (
              <div
                key={order.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '14px',
                  border: '1px solid var(--border-light)',
                  boxShadow: 'var(--shadow-xs)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 800 }}>{order.restaurant_name}</h4>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        color: order.status === 'delivered' ? 'var(--accent-green)' : '#DC2626',
                        backgroundColor: order.status === 'delivered' ? 'var(--accent-green-light)' : '#FEF2F2',
                        padding: '1px 6px',
                        borderRadius: '6px',
                      }}
                    >
                      {order.status === 'delivered' ? 'Delivered' : 'Cancelled'}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {order.items.map((i) => `${i.quantity}x ${i.product_name}`).join(', ')}
                  </p>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Rs. {order.total.toFixed(2)}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                  <button
                    onClick={() => setSelectedOrder(order)}
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--accent-coral)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    <span>Details</span>
                    <ChevronRight size={14} />
                  </button>

                  {order.status === 'delivered' && (
                    <button
                      onClick={() => setReviewOrder(order)}
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#B45309',
                        backgroundColor: 'var(--bg-butter)',
                        border: '1px solid var(--bg-butter-border)',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <Star size={11} fill="#B45309" />
                      <span>Review</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Order Details & Full Tracking Modal */}
      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Order #${selectedOrder.id}`}
          subtitle={`${selectedOrder.restaurant_name} · ${selectedOrder.status.replace('_', ' ').toUpperCase()}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Status History Timeline */}
            <div>
              <h5 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Status Updates
              </h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedOrder.status_history.map((hist, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '12.5px' }}>
                    <span style={{ color: 'var(--accent-coral)', fontWeight: 700 }}>•</span>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {hist.status.replace('_', ' ').toUpperCase()}
                      </strong>{' '}
                      <span style={{ color: 'var(--text-muted)' }}>
                        ({new Date(hist.timestamp).toLocaleTimeString()})
                      </span>
                      {hist.note && (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '11.5px', marginTop: '2px' }}>
                          {hist.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>



            {/* Preserved Delivery Address Snapshot */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <h5 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} color="var(--accent-coral)" /> Delivery Address Snapshot
              </h5>
              <div
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  fontSize: '12.5px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedOrder.delivery_address_snapshot?.recipient_name || selectedOrder.customer_name}
                  </span>
                  {selectedOrder.delivery_address_snapshot?.label && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '2px 7px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--accent-coral-soft)',
                        color: 'var(--accent-coral)',
                      }}
                    >
                      {selectedOrder.delivery_address_snapshot.label}
                    </span>
                  )}
                </div>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {selectedOrder.delivery_address_snapshot?.phone_number || selectedOrder.customer_phone}
                </span>
                <span style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {selectedOrder.delivery_address_snapshot?.formatted_address || selectedOrder.delivery_address}
                </span>
                {selectedOrder.delivery_address_snapshot?.landmark && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>
                    Landmark: {selectedOrder.delivery_address_snapshot.landmark}
                  </span>
                )}
                {(selectedOrder.notes || selectedOrder.delivery_address_snapshot?.delivery_instructions) && (
                  <span style={{ color: 'var(--text-secondary)', fontSize: '11.5px', fontStyle: 'italic', marginTop: '2px' }}>
                    Note: "{selectedOrder.notes || selectedOrder.delivery_address_snapshot?.delivery_instructions}"
                  </span>
                )}
              </div>
            </div>

            {/* Items */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <h5 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Food Items
              </h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span>
                      {item.quantity}x {item.product_name}
                    </span>
                    <span style={{ fontWeight: 600 }}>Rs. {(item.price * item.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total breakdown */}
            <div
              style={{
                backgroundColor: 'var(--bg-subtle)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                fontSize: '12.5px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal</span>
                <span>Rs. {selectedOrder.subtotal.toFixed(0)}</span>
              </div>
              {selectedOrder.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-green)', fontWeight: 700 }}>
                  <span>Food Drop Discount</span>
                  <span>-Rs. {selectedOrder.discount.toFixed(0)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Delivery Fee</span>
                <span>Rs. {selectedOrder.delivery_fee.toFixed(0)}</span>
              </div>
              {(selectedOrder.tax ?? 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Service / Tax Fee</span>
                  <span>Rs. {(selectedOrder.tax ?? 0).toFixed(0)}</span>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 800,
                  fontSize: '14px',
                  color: 'var(--accent-coral)',
                  borderTop: '1px dashed var(--border-medium)',
                  paddingTop: '6px',
                  marginTop: '4px',
                }}
              >
                <span>Total (Cash on Delivery)</span>
                <span>Rs. {selectedOrder.total.toFixed(0)}</span>
              </div>
            </div>

            <Button variant="secondary" fullWidth onClick={() => setSelectedOrder(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}

      {/* Review Modal */}
      {reviewOrder && (
        <Modal
          isOpen={!!reviewOrder}
          onClose={() => setReviewOrder(null)}
          title="Review Your Meal"
          subtitle={`How was your food from ${reviewOrder.restaurant_name}?`}
        >
          {reviewSubmitted ? (
            <div style={{ textAlign: 'center', padding: '24px 8px' }}>
              <CheckCircle2 size={42} color="var(--accent-green)" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ fontSize: '16px', fontWeight: 700 }}>Review Published!</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Thank you for supporting your local food creator!
              </p>
            </div>
          ) : (
            <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Star Rating Selector */}
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Tap Stars to Rate
                </span>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      style={{ padding: '6px', cursor: 'pointer' }}
                    >
                      <Star
                        size={28}
                        color={star <= rating ? '#B45309' : '#CBD5E1'}
                        fill={star <= rating ? '#F59E0B' : 'none'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                  Your Review & Taste Feedback
                </label>
                <textarea
                  rows={3}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Tell others what you loved about this food drop..."
                  className="input-control"
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <Button type="button" variant="secondary" fullWidth onClick={() => setReviewOrder(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" fullWidth>
                  Submit Review
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
};
