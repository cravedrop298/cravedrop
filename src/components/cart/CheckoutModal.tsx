import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTranslation } from '../../i18n';
import { Banknote, CheckCircle2, ShieldCheck, MapPin, Phone, User as UserIcon, AlertCircle } from 'lucide-react';
import { Order } from '../../types';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess?: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderSuccess,
}) => {
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const { placeOrder } = useData();
  const { t } = useTranslation();

  const [customerName, setCustomerName] = useState(user?.name || 'Hamza Khan');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '+1 555-019-2834');
  const [deliveryAddress, setDeliveryAddress] = useState(
    user?.location?.address || 'Apartment 4B, 32 Riverside Crescent, Metropolis'
  );
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
      setErrorMessage('Please fill in your name, contact phone, and delivery address.');
      return;
    }

    if (!cart.restaurant_id || cart.items.length === 0) {
      setErrorMessage('Your bag is empty.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const result = await placeOrder({
      customerId: user?.id || 'guest-customer',
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      restaurantId: cart.restaurant_id,
      items: cart.items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        specialInstructions: i.special_instructions,
      })),
      deliveryNotes: deliveryNotes.trim(),
    });

    setIsSubmitting(false);

    if (result.success && result.order) {
      clearCart();
      setPlacedOrder(result.order);
      if (onOrderSuccess) {
        onOrderSuccess(result.order);
      }
    } else {
      setErrorMessage(result.error || 'Failed to place order. Please try again.');
    }
  };

  const handleFinish = () => {
    setPlacedOrder(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleFinish}
      title={placedOrder ? t('order_success') : 'Checkout'}
      subtitle={placedOrder ? `Order #${placedOrder.id}` : `Cash on Delivery · ${cart.restaurant_name}`}
    >
      {placedOrder ? (
        <div style={{ textAlign: 'center', padding: '16px 8px' }}>
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-green-light)',
              color: 'var(--accent-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <CheckCircle2 size={38} />
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
            {t('order_success')}
          </h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            {placedOrder.restaurant_name} has received your order and is getting the ingredients ready!
          </p>

          {/* Order Summary box */}
          <div
            style={{
              textAlign: 'left',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              marginBottom: '20px',
              fontSize: '13px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
              <span style={{ fontWeight: 700, color: '#B45309' }}>Order Received</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Delivery To:</span>
              <span style={{ fontWeight: 600, maxWidth: '200px', textAlign: 'right' }}>
                {placedOrder.delivery_address}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Payment:</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-coral)' }}>
                Cash on Delivery (${placedOrder.total.toFixed(2)})
              </span>
            </div>
          </div>

          <Button variant="primary" fullWidth size="lg" onClick={handleFinish}>
            Track Order Status
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {errorMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                fontSize: '12.5px',
              }}
            >
              <AlertCircle size={15} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Customer Full Name */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
              {t('customer_name')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="input-control"
                style={{ paddingLeft: '36px' }}
                placeholder="Your full name"
              />
              <UserIcon size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '14px' }} />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
              {t('phone_number')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="input-control"
                style={{ paddingLeft: '36px' }}
                placeholder="+1 555-000-0000"
              />
              <Phone size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '14px' }} />
            </div>
          </div>

          {/* Delivery Address */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
              {t('delivery_address')}
            </label>
            <div style={{ position: 'relative' }}>
              <textarea
                required
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="input-control"
                rows={2}
                style={{ paddingLeft: '36px', resize: 'none' }}
                placeholder="Apartment, building, street, city..."
              />
              <MapPin size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '14px' }} />
            </div>
          </div>

          {/* Special Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '5px' }}>
              {t('special_notes')}
            </label>
            <input
              type="text"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              className="input-control"
              placeholder="e.g. Leave with security, extra napkins..."
            />
          </div>

          {/* Payment Method Banner (Cash on Delivery) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-butter)',
              border: '1px solid var(--bg-butter-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Banknote size={20} color="#B45309" />
              <div>
                <h5 style={{ fontSize: '13.5px', fontWeight: 700, color: '#B45309' }}>
                  {t('cash_on_delivery')}
                </h5>
                <p style={{ fontSize: '11.5px', color: '#92400E' }}>{t('cod_badge')}</p>
              </div>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                backgroundColor: '#FFFFFF',
                color: '#B45309',
                padding: '3px 8px',
                borderRadius: '8px',
                border: '1px solid var(--bg-butter-border)',
              }}
            >
              SELECTED
            </span>
          </div>

          {/* Verified Order Total */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Total Amount Due:</span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-coral)' }}>
              ${cart.total.toFixed(2)}
            </span>
          </div>

          <Button type="submit" variant="primary" fullWidth size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <span>{t('placing_order')}</span>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>{t('place_order')} · ${cart.total.toFixed(2)}</span>
              </>
            )}
          </Button>
        </form>
      )}
    </Modal>
  );
};
