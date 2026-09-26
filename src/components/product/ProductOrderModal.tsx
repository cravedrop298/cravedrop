import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { FoodPost, Product, Restaurant } from '../../types';
import { useCart } from '../../context/CartContext';
import { useData } from '../../context/DataContext';
import { useTranslation } from '../../i18n';
import { isPostExpired } from '../../services/expiryService';
import { Clock, Plus, Minus, ShoppingBag, AlertCircle } from 'lucide-react';

interface ProductOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  post?: FoodPost | null;
}

export const ProductOrderModal: React.FC<ProductOrderModalProps> = ({
  isOpen,
  onClose,
  product,
  post,
}) => {
  const { addToCart, confirmSwitchRestaurantAndAdd, setIsCartDrawerOpen } = useCart();
  const { restaurants } = useData();
  const { t } = useTranslation();

  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [conflictPrompt, setConflictPrompt] = useState<{
    existingRestaurantName: string;
    pendingProduct: Product;
    pendingRestaurant: Restaurant;
  } | null>(null);

  if (!product) return null;

  const restaurant = restaurants.find((r) => r.id === product.restaurant_id);
  const expired = post ? isPostExpired(post.expires_at) : false;
  const unitPrice = product.discount_price !== undefined ? product.discount_price : product.price;
  const itemSubtotal = Number((unitPrice * quantity).toFixed(2));

  const handleAdd = () => {
    if (!restaurant || expired) return;

    const result = addToCart(product, restaurant, quantity, instructions);
    if (!result.added && result.conflict) {
      setConflictPrompt(result.conflict);
      return;
    }

    onClose();
    setIsCartDrawerOpen(true);
  };

  const handleConfirmSwitch = () => {
    if (!conflictPrompt) return;
    confirmSwitchRestaurantAndAdd(
      conflictPrompt.pendingProduct,
      conflictPrompt.pendingRestaurant,
      quantity,
      instructions
    );
    setConflictPrompt(null);
    onClose();
    setIsCartDrawerOpen(true);
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !conflictPrompt}
        onClose={onClose}
        title={product.name}
        subtitle={restaurant ? `${restaurant.name} · ${product.category}` : undefined}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Food Picture */}
          <div
            style={{
              width: '100%',
              height: '180px',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <img
              src={product.image_url}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {product.discount_price && (
              <span
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  backgroundColor: 'var(--accent-coral)',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '12px',
                }}
              >
                SPECIAL DROP PRICE
              </span>
            )}
          </div>

          {/* Description & Prep Time */}
          <div>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {product.description}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
              <Clock size={13} />
              <span>Cooked fresh in ~{product.prep_time_mins} minutes</span>
            </div>
          </div>

          {/* If Expired Warning */}
          {expired && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={16} />
              <span>{t('drop_expired_desc')}</span>
            </div>
          )}

          {/* Quantity Selector & Instructions */}
          {!expired && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Quantity</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ fontSize: '16px', fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {t('special_notes')}
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Extra sauce, mild spice, no onions..."
                  className="input-control"
                  style={{ padding: '10px 12px', fontSize: '13px' }}
                />
              </div>

              {/* Add to Bag CTA */}
              <Button variant="primary" fullWidth size="lg" onClick={handleAdd}>
                <ShoppingBag size={17} />
                <span>Add to Food Bag · ${itemSubtotal.toFixed(2)}</span>
              </Button>
            </>
          )}
        </div>
      </Modal>

      {/* Different Kitchen Conflict Modal */}
      {conflictPrompt && (
        <Modal
          isOpen={!!conflictPrompt}
          onClose={() => setConflictPrompt(null)}
          title="Start New Order?"
          subtitle="Your food bag contains items from another restaurant."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Your bag currently has meals from <strong>{conflictPrompt.existingRestaurantName}</strong>.
              Would you like to clear your bag and start a new order from <strong>{conflictPrompt.pendingRestaurant.name}</strong>?
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <Button variant="secondary" fullWidth onClick={() => setConflictPrompt(null)}>
                Keep Existing Bag
              </Button>
              <Button variant="primary" fullWidth onClick={handleConfirmSwitch}>
                Start New Order
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
