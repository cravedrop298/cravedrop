import React, { useState } from 'react';
import { BottomSheet } from '../common/BottomSheet';
import { Button } from '../common/Button';
import { useCart } from '../../context/CartContext';
import { useTranslation } from '../../i18n';
import { Plus, Minus, Trash2, ShoppingBag, ArrowRight, Store } from 'lucide-react';
import { CheckoutModal } from './CheckoutModal';

export const CartDrawer: React.FC = () => {
  const { cart, updateQuantity, removeFromCart, clearCart, isCartDrawerOpen, setIsCartDrawerOpen } = useCart();
  const { t } = useTranslation();

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const handleProceedToCheckout = () => {
    setIsCartDrawerOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <>
      <BottomSheet
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        title={t('cart_title')}
        subtitle={cart.restaurant_name ? `From ${cart.restaurant_name}` : undefined}
      >
        {cart.items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 10px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-butter)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
                color: '#B45309',
              }}
            >
              <ShoppingBag size={28} />
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>{t('cart_empty')}</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '260px', marginInline: 'auto' }}>
              {t('cart_empty_sub')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Restaurant header badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-butter)',
                border: '1px solid var(--bg-butter-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Store size={14} color="#B45309" />
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#B45309' }}>
                  {cart.restaurant_name}
                </span>
              </div>
              <button
                onClick={clearCart}
                style={{ fontSize: '11px', color: 'var(--accent-coral)', fontWeight: 700 }}
              >
                Clear All
              </button>
            </div>

            {/* Cart Items list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cart.items.map((item) => {
                const price = item.product.discount_price ?? item.product.price;
                const itemTotal = Number((price * item.quantity).toFixed(2));

                return (
                  <div
                    key={item.product.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-light)',
                    }}
                  >
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
                    />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ fontSize: '13.5px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.product.name}
                      </h4>
                      <p style={{ fontSize: '12px', color: 'var(--accent-coral)', fontWeight: 800 }}>
                        ${price.toFixed(2)}
                      </p>
                      {item.special_instructions && (
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          "{item.special_instructions}"
                        </p>
                      )}
                    </div>

                    {/* Quantity controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid var(--border-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {item.quantity === 1 ? <Trash2 size={12} color="#DC2626" /> : <Minus size={12} />}
                      </button>

                      <span style={{ fontSize: '14px', fontWeight: 700, minWidth: '16px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>

                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid var(--border-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bill Breakdown */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-light)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('subtotal')}</span>
                <span style={{ fontWeight: 600 }}>${cart.subtotal.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t('delivery_fee')}</span>
                <span style={{ fontWeight: 600 }}>${cart.delivery_fee.toFixed(2)}</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '15px',
                  fontWeight: 800,
                  borderTop: '1px dashed var(--border-medium)',
                  paddingTop: '8px',
                  marginTop: '4px',
                }}
              >
                <span>{t('total')}</span>
                <span style={{ color: 'var(--accent-coral)' }}>${cart.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Proceed to Checkout CTA */}
            <Button variant="primary" fullWidth size="lg" onClick={handleProceedToCheckout}>
              <span>{t('proceed_to_checkout')}</span>
              <ArrowRight size={17} />
            </Button>
          </div>
        )}
      </BottomSheet>

      {/* Checkout Modal */}
      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />
    </>
  );
};
