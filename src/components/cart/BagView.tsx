import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useTranslation } from '../../i18n';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Store,
  Clock,
  Sparkles,
  ChevronRight,
  FileText,
  UtensilsCrossed,
  ShieldCheck,
} from 'lucide-react';
import { CheckoutModal } from './CheckoutModal';
import { Order } from '../../types';

interface BagViewProps {
  onStartOrdering: () => void;
  onSelectRestaurant?: (restaurantId: string) => void;
  onNavigateOrders?: () => void;
}

export const BagView: React.FC<BagViewProps> = ({
  onStartOrdering,
  onSelectRestaurant,
  onNavigateOrders,
}) => {
  const { cart, updateQuantity, removeFromCart, clearCart, totalItemCount } = useCart();
  const { t } = useTranslation();

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [kitchenNotes, setKitchenNotes] = useState('');
  const [includeCutlery, setIncludeCutlery] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleOrderSuccess = (order: Order) => {
    setIsCheckoutOpen(false);
    if (onNavigateOrders) {
      onNavigateOrders();
    }
  };

  return (
    <div
      id="bag-page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        backgroundColor: '#FAF7F2',
        paddingBottom: cart.items.length > 0 ? '110px' : '30px',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          backgroundColor: '#FAF7F2',
          borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              backgroundColor: '#FDEEEB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShoppingBag size={20} color="#E24B36" />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 900, color: '#1E242B', lineHeight: 1.2 }}>
              Your Food Bag
            </h1>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
              {totalItemCount === 0
                ? 'No dishes added'
                : `${totalItemCount} item${totalItemCount > 1 ? 's' : ''} in bag`}
            </span>
          </div>
        </div>

        {cart.items.length > 0 && (
          <div>
            {showClearConfirm ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => {
                    clearCart();
                    setShowClearConfirm(false);
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    backgroundColor: '#FEE2E2',
                    color: '#DC2626',
                    fontSize: '11px',
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Confirm Clear
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '8px',
                    backgroundColor: '#E5DFC9',
                    color: '#1E242B',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClearConfirm(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  color: '#DC2626',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '6px 8px',
                }}
              >
                <Trash2 size={14} />
                <span>Clear All</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {cart.items.length === 0 ? (
        /* Empty Bag View */
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '28px',
              backgroundColor: '#FEF7E4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              boxShadow: '0 8px 24px rgba(217, 119, 6, 0.12)',
            }}
          >
            <ShoppingBag size={44} color="#D97706" />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#1E242B', marginBottom: '8px' }}>
            Your Bag is Empty
          </h2>
          <p
            style={{
              fontSize: '13.5px',
              color: '#64748B',
              lineHeight: 1.5,
              maxWidth: '280px',
              marginBottom: '28px',
            }}
          >
            Discover live food drops, flash deals, and unique kitchen specials in your feed.
          </p>

          <button
            id="empty-bag-explore-btn"
            onClick={onStartOrdering}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 28px',
              backgroundColor: '#E24B36',
              color: '#FFFFFF',
              borderRadius: '16px',
              fontSize: '14px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(226, 75, 54, 0.3)',
              transition: 'transform 0.15s ease',
            }}
          >
            <span>Explore Food Drops</span>
            <ArrowRight size={17} />
          </button>
        </div>
      ) : (
        /* Filled Bag View */
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Restaurant Header Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '14px 16px',
              border: '1.5px solid #E5DFC9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(60, 40, 20, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  backgroundColor: '#FEF7E4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Store size={20} color="#D97706" />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#1E242B' }}>
                  {cart.restaurant_name}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#64748B' }}>
                  <Clock size={12} />
                  <span>Est. delivery: 25 - 35 mins</span>
                </div>
              </div>
            </div>

            {onSelectRestaurant && cart.restaurant_id && (
              <button
                onClick={() => onSelectRestaurant(cart.restaurant_id!)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  backgroundColor: '#FDEEEB',
                  color: '#E24B36',
                  fontSize: '12px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <span>+ Add More</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#64748B', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
              Items in Bag ({cart.items.length})
            </span>

            {cart.items.map((item) => {
              const price = item.product.discount_price ?? item.product.price;
              const itemTotal = price * item.quantity;

              return (
                <div
                  key={item.product.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '12px 14px',
                    border: '1.5px solid #E5DFC9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 2px 6px rgba(60, 40, 20, 0.03)',
                  }}
                >
                  <img
                    src={item.product.image_url}
                    alt={item.product.name}
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '12px',
                      objectFit: 'cover',
                      backgroundColor: '#F1ECE1',
                    }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4
                      style={{
                        fontSize: '14px',
                        fontWeight: 800,
                        color: '#1E242B',
                        marginBottom: '3px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.product.name}
                    </h4>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#E24B36' }}>
                        Rs. {price.toFixed(2)}
                      </span>
                      {item.product.discount_price !== undefined && (
                        <span style={{ fontSize: '11px', color: '#8E99A8', textDecoration: 'line-through' }}>
                          Rs. {item.product.price.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {item.special_instructions && (
                      <p
                        style={{
                          fontSize: '11px',
                          color: '#64748B',
                          fontStyle: 'italic',
                          marginTop: '3px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        "{item.special_instructions}"
                      </p>
                    )}
                  </div>

                  {/* Quantity Stepper */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: '#F7F4EE',
                      borderRadius: '12px',
                      padding: '4px 6px',
                      border: '1px solid #E5DFC9',
                    }}
                  >
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '8px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5DFC9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: item.quantity === 1 ? '#DC2626' : '#1E242B',
                      }}
                    >
                      {item.quantity === 1 ? <Trash2 size={13} /> : <Minus size={13} />}
                    </button>

                    <span style={{ fontSize: '13px', fontWeight: 800, minWidth: '18px', textAlign: 'center', color: '#1E242B' }}>
                      {item.quantity}
                    </span>

                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '8px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5DFC9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#1E242B',
                      }}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Kitchen / Delivery Notes */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '14px 16px',
              border: '1.5px solid #E5DFC9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <FileText size={16} color="#E24B36" />
              <label style={{ fontSize: '13px', fontWeight: 800, color: '#1E242B' }}>
                Cooking or Delivery Instructions
              </label>
            </div>
            <textarea
              placeholder="e.g. Please make it extra spicy, ring bell when outside..."
              value={kitchenNotes}
              onChange={(e) => setKitchenNotes(e.target.value)}
              rows={2}
              style={{
                width: '100%',
                borderRadius: '10px',
                border: '1px solid #E5DFC9',
                padding: '8px 10px',
                fontSize: '12.5px',
                color: '#1E242B',
                outline: 'none',
                resize: 'none',
                backgroundColor: '#FAF7F2',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Cutlery Toggle */}
          <div
            onClick={() => setIncludeCutlery(!includeCutlery)}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              padding: '12px 16px',
              border: '1.5px solid #E5DFC9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <UtensilsCrossed size={17} color="#64748B" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#1E242B' }}>
                  Include disposable cutlery & napkins
                </div>
                <div style={{ fontSize: '11px', color: '#8E99A8' }}>
                  Help restaurants reduce waste if you don't need them
                </div>
              </div>
            </div>

            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '6px',
                border: `2px solid ${includeCutlery ? '#E24B36' : '#C4BDB0'}`,
                backgroundColor: includeCutlery ? '#E24B36' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {includeCutlery && <span style={{ color: '#FFFFFF', fontSize: '12px', fontWeight: 900 }}>✓</span>}
            </div>
          </div>

          {/* Bill Breakdown Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '16px',
              border: '1.5px solid #E5DFC9',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E242B' }}>
              Bill Summary
            </span>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748B' }}>Items Subtotal</span>
              <span style={{ fontWeight: 700, color: '#1E242B' }}>Rs. {cart.subtotal.toFixed(2)}</span>
            </div>

            {cart.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#15803D' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={13} />
                  <span>Food Drop Discount</span>
                </span>
                <span style={{ fontWeight: 800 }}>- Rs. {cart.discount.toFixed(2)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748B' }}>Delivery Fee</span>
              <span style={{ fontWeight: 700, color: '#1E242B' }}>Rs. {cart.delivery_fee.toFixed(2)}</span>
            </div>

            <div
              style={{
                borderTop: '1px dashed #E5DFC9',
                paddingTop: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <div>
                <span style={{ fontSize: '15px', fontWeight: 900, color: '#1E242B' }}>Total Amount</span>
                <div style={{ fontSize: '11px', color: '#8E99A8' }}>Cash on Delivery (COD)</div>
              </div>
              <span style={{ fontSize: '18px', fontWeight: 900, color: '#E24B36' }}>
                Rs. {cart.total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Trust strip */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#8E99A8', fontSize: '11px' }}>
            <ShieldCheck size={14} color="#10B981" />
            <span>Guaranteed fresh drop by {cart.restaurant_name}</span>
          </div>
        </div>
      )}

      {/* Floating Sticky Checkout Action Bar (when bag has items) */}
      {cart.items.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '68px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '430px',
            padding: '12px 18px',
            backgroundColor: '#FFFFFF',
            borderTop: '1.5px solid #E5DFC9',
            boxShadow: '0 -4px 16px rgba(60, 40, 20, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 35,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '11px', color: '#8E99A8', fontWeight: 700, textTransform: 'uppercase' }}>
              Total Payable
            </span>
            <span style={{ fontSize: '18px', fontWeight: 900, color: '#E24B36' }}>
              Rs. {cart.total.toFixed(2)}
            </span>
          </div>

          <button
            id="bag-checkout-btn"
            onClick={() => setIsCheckoutOpen(true)}
            style={{
              flex: 1,
              height: '48px',
              backgroundColor: '#E24B36',
              color: '#FFFFFF',
              borderRadius: '14px',
              fontSize: '14.5px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(226, 75, 54, 0.3)',
            }}
          >
            <span>Proceed to Checkout</span>
            <ArrowRight size={17} />
          </button>
        </div>
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={handleOrderSuccess}
        initialNotes={kitchenNotes}
        initialCutlery={includeCutlery}
      />
    </div>
  );
};
