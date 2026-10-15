import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useTranslation } from '../../i18n';
import {
  Banknote,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Phone,
  User as UserIcon,
  AlertCircle,
  Home,
  Briefcase,
  Plus,
  Check,
  Edit3,
  Trash2,
  Star,
  Store,
  Clock,
  FileText,
  Truck,
  ShoppingBag,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Order, UserAddress } from '../../types';
import { AddressModal } from '../profile/AddressModal';
import {
  fetchUserAddresses,
  deleteUserAddress,
  setDefaultUserAddress,
  validatePakistanPhone,
  formatPakistanPhoneDisplay,
  formatFullAddress,
  verifyDeliveryCoverage,
} from '../../services/addressService';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess?: (order: Order) => void;
  initialNotes?: string;
  initialCutlery?: boolean;
}

// Structured payment methods registry (extensible for future gateways)
const SUPPORTED_PAYMENT_METHODS = [
  {
    id: 'cash_on_delivery' as const,
    name: 'Cash on Delivery (COD)',
    description: 'Pay in cash at your doorstep when your food arrives',
    badge: 'ACTIVE',
    isEnabled: true,
  },
];

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderSuccess,
  initialNotes = '',
  initialCutlery = true,
}) => {
  const { cart, clearCart } = useCart();
  const { user, updateProfile } = useAuth();
  const { restaurants, products, placeOrder } = useData();
  const { t } = useTranslation();

  // Saved addresses state (loaded from Supabase + isolated user storage)
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isLocationSubmenuOpen, setIsLocationSubmenuOpen] = useState(false);

  // Address Modal state (Add / Edit / Map Pin)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [autoTriggerGpsInModal, setAutoTriggerGpsInModal] = useState(false);
  const [confirmDeleteAddressId, setConfirmDeleteAddressId] = useState<string | null>(null);

  // Contact & Order Notes for current checkout
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState(initialNotes);
  const [includeCutlery, setIncludeCutlery] = useState(initialCutlery);
  const [selectedPaymentMethod] = useState<'cash_on_delivery'>('cash_on_delivery');

  // Submission & Idempotency state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const submitLockRef = useRef(false);
  const [checkoutIdempotencyKey, setCheckoutIdempotencyKey] = useState<string>('');

  // Authoritative restaurant & product lookup
  const activeRestaurant = useMemo(
    () => restaurants.find((r) => r.id === cart.restaurant_id) || cart.items[0]?.restaurant || null,
    [restaurants, cart.restaurant_id, cart.items]
  );

  // Authoritative pricing calculation from trusted product & restaurant records
  const pricingSummary = useMemo(() => {
    let subtotal = 0;
    let discountSavings = 0;
    let unavailableItemName: string | null = null;

    const verifiedItems = cart.items.map((item) => {
      const liveProd = products.find((p) => p.id === item.product.id) || item.product;
      if (!liveProd.is_active || !liveProd.is_available) {
        unavailableItemName = liveProd.name;
      }
      const basePrice = Number(liveProd.price);
      const unitPrice =
        liveProd.discount_price !== undefined && liveProd.discount_price !== null
          ? Number(liveProd.discount_price)
          : basePrice;
      const lineTotal = Number((unitPrice * item.quantity).toFixed(2));
      const lineDiscount =
        basePrice > unitPrice
          ? Number(((basePrice - unitPrice) * item.quantity).toFixed(2))
          : 0;

      subtotal += lineTotal;
      discountSavings += lineDiscount;

      return {
        ...item,
        liveProduct: liveProd,
        unitPrice,
        basePrice,
        lineTotal,
        lineDiscount,
      };
    });

    const cleanSubtotal = Number(subtotal.toFixed(2));
    const cleanDiscount = Number(discountSavings.toFixed(2));
    const deliveryFee =
      verifiedItems.length > 0
        ? Number((activeRestaurant?.delivery_fee ?? cart.delivery_fee ?? 2.99).toFixed(2))
        : 0;
    const tax = 0;
    const finalTotal = Number((cleanSubtotal + deliveryFee + tax).toFixed(2));

    return {
      verifiedItems,
      subtotal: cleanSubtotal,
      discount: cleanDiscount,
      deliveryFee,
      tax,
      total: finalTotal,
      unavailableItemName,
    };
  }, [cart.items, cart.delivery_fee, products, activeRestaurant]);

  // Currently selected address object
  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === selectedAddressId) || null,
    [addresses, selectedAddressId]
  );

  // Real-time Delivery Coverage & Minimum Order check
  const coverageStatus = useMemo(
    () => verifyDeliveryCoverage(activeRestaurant, selectedAddress, pricingSummary.subtotal),
    [activeRestaurant, selectedAddress, pricingSummary.subtotal]
  );

  // Load user's saved addresses when checkout opens
  useEffect(() => {
    if (!isOpen) return;

    submitLockRef.current = false;
    setErrorMessage('');
    setCheckoutIdempotencyKey(`idem-${user?.id || 'usr'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

    if (initialNotes) setDeliveryNotes(initialNotes);
    setIncludeCutlery(initialCutlery);

    if (!user?.id) {
      setAddresses([]);
      setSelectedAddressId(null);
      return;
    }

    setIsLoadingAddresses(true);
    fetchUserAddresses(user.id, user.addresses)
      .then((loaded) => {
        setAddresses(loaded);
        if (loaded.length > 0) {
          // Prefer default address, or an address in the restaurant's city if available
          const restCity = (activeRestaurant?.city_id || activeRestaurant?.city || '').toLowerCase();
          const matchingDefault = loaded.find(
            (a) =>
              a.is_default &&
              (a.city_id?.toLowerCase() === restCity || a.city_name?.toLowerCase() === restCity)
          );
          const anyDefault = loaded.find((a) => a.is_default);
          const chosen = matchingDefault || anyDefault || loaded[0];

          setSelectedAddressId(chosen.id);
          setRecipientName(chosen.recipient_name || user.full_name || user.name || '');
          setRecipientPhone(chosen.phone_number || chosen.phone || user.phone || '');
          if (!initialNotes && chosen.delivery_instructions) {
            setDeliveryNotes(chosen.delivery_instructions);
          }
        } else {
          setSelectedAddressId(null);
          setRecipientName(user.full_name || user.name || '');
          setRecipientPhone(user.phone || '');
        }
      })
      .finally(() => setIsLoadingAddresses(false));
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  // Select a saved address card
  const handleSelectAddress = (addr: UserAddress) => {
    setSelectedAddressId(addr.id);
    setRecipientName(addr.recipient_name || user?.full_name || user?.name || '');
    setRecipientPhone(addr.phone_number || addr.phone || user?.phone || '');
    if (addr.delivery_instructions) {
      setDeliveryNotes(addr.delivery_instructions);
    }
    setErrorMessage('');
  };

  // Handle Address Saved from AddressModal (Add or Edit)
  const handleAddressSaved = async (savedAddr: UserAddress, savedToBook = true) => {
    let updatedList: UserAddress[];
    const exists = addresses.some((a) => a.id === savedAddr.id);
    if (exists) {
      updatedList = addresses.map((a) =>
        a.id === savedAddr.id
          ? savedAddr
          : savedAddr.is_default
          ? { ...a, is_default: false }
          : a
      );
    } else {
      updatedList = [
        ...(savedAddr.is_default
          ? addresses.map((a) => ({ ...a, is_default: false }))
          : addresses),
        savedAddr,
      ];
    }

    setAddresses(updatedList);
    if (savedToBook && user) {
      await updateProfile({ addresses: updatedList });
    }

    // Automatically select the newly added/edited address
    handleSelectAddress(savedAddr);
    setEditingAddress(null);
    setAutoTriggerGpsInModal(false);
  };

  // Handle setting default address directly from Checkout card
  const handleSetDefault = async (addrId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.id) return;
    const res = await setDefaultUserAddress(user.id, addrId);
    if (res.success && res.addresses) {
      setAddresses(res.addresses);
      await updateProfile({ addresses: res.addresses });
    }
  };

  // Handle deleting an address after confirmation
  const handleConfirmDelete = async (addrId: string) => {
    if (!user?.id) return;
    const res = await deleteUserAddress(user.id, addrId);
    if (res.success && res.addresses) {
      setAddresses(res.addresses);
      await updateProfile({ addresses: res.addresses });
      if (selectedAddressId === addrId) {
        const next = res.addresses.find((a) => a.is_default) || res.addresses[0] || null;
        if (next) {
          handleSelectAddress(next);
        } else {
          setSelectedAddressId(null);
        }
      }
    }
    setConfirmDeleteAddressId(null);
  };

  // Live phone check for contact details section
  const phoneValidation = validatePakistanPhone(recipientPhone);

  // Place Order Workflow
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate rapid clicks
    if (isSubmitting || submitLockRef.current) {
      return;
    }

    if (!user?.id) {
      setErrorMessage('Please sign in to your account before placing an order.');
      return;
    }

    if (!cart.restaurant_id || cart.items.length === 0) {
      setErrorMessage('Your food bag is empty.');
      return;
    }

    if (pricingSummary.unavailableItemName) {
      setErrorMessage(
        `Sorry, "${pricingSummary.unavailableItemName}" is no longer available. Please remove it from your bag.`
      );
      return;
    }

    if (!selectedAddress) {
      setErrorMessage('Please select a saved delivery address or add a new delivery address.');
      return;
    }

    if (!recipientName.trim() || recipientName.trim().length < 2) {
      setErrorMessage('Please provide a valid recipient full name.');
      return;
    }

    if (!phoneValidation.isValid) {
      setErrorMessage(
        phoneValidation.error || 'Please enter a valid Pakistani mobile phone number (+92).'
      );
      return;
    }

    if (!coverageStatus.canDeliver) {
      setErrorMessage(
        coverageStatus.errorMessage ||
          'This restaurant cannot deliver to the selected address.'
      );
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const addressWithContactOverride: UserAddress = {
        ...selectedAddress,
        recipient_name: recipientName.trim(),
        phone_number: phoneValidation.normalized,
        phone: phoneValidation.normalized,
        delivery_instructions: deliveryNotes.trim(),
        delivery_notes: deliveryNotes.trim(),
      };

      const result = await placeOrder({
        customerId: user.id,
        customerName: recipientName.trim(),
        customerPhone: phoneValidation.normalized,
        deliveryAddress: formatFullAddress(addressWithContactOverride),
        deliveryAddressObj: addressWithContactOverride,
        restaurantId: cart.restaurant_id,
        items: cart.items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          specialInstructions: i.special_instructions,
        })),
        deliveryNotes: deliveryNotes.trim(),
        includeCutlery,
        paymentMethod: selectedPaymentMethod,
        idempotencyKey: checkoutIdempotencyKey,
      });

      if (result.success && result.order) {
        clearCart();
        setPlacedOrder(result.order);
      } else {
        setErrorMessage(
          result.error || 'Failed to place order. Your bag and details have been preserved.'
        );
        // Generate fresh idempotency key only if validation failed so user can retry after fixing
        setCheckoutIdempotencyKey(
          `idem-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        );
      }
    } catch {
      setErrorMessage(
        'Network error while placing order. Your bag has been preserved — please try again.'
      );
    } finally {
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  };

  const handleFinishConfirmation = () => {
    const completed = placedOrder;
    setPlacedOrder(null);
    onClose();
    if (completed && onOrderSuccess) {
      onOrderSuccess(completed);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          if (placedOrder) {
            handleFinishConfirmation();
          } else {
            onClose();
          }
        }}
        title={placedOrder ? 'Order Confirmed!' : 'Checkout'}
        subtitle={
          placedOrder
            ? `Order #${placedOrder.id} · ${placedOrder.restaurant_name}`
            : `${activeRestaurant?.name || cart.restaurant_name || 'Kitchen'} · Cash on Delivery`
        }
      >
        {placedOrder ? (
          /* ============================================================
             ORDER CONFIRMATION VIEW (WITH ADDRESS SNAPSHOT)
             ============================================================ */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '6px 2px' }}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#F0FDF4',
                  border: '2px solid #BBF7D0',
                  color: '#15803D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <CheckCircle2 size={36} />
              </div>

              <span
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  backgroundColor: '#FEF7E4',
                  border: '1px solid #FCE7B0',
                  color: '#B45309',
                  fontSize: '11px',
                  fontWeight: 800,
                  marginBottom: '6px',
                }}
              >
                ORDER #{placedOrder.id.toUpperCase()} · PENDING KITCHEN ACCEPTANCE
              </span>

              <h3 style={{ fontSize: '19px', fontWeight: 900, color: '#1E242B', marginBottom: '4px' }}>
                Thank you, {placedOrder.customer_name}!
              </h3>
              <p style={{ fontSize: '13px', color: '#5A6472', lineHeight: 1.45 }}>
                Your order has been sent to <strong>{placedOrder.restaurant_name}</strong>. Prepare cash on delivery upon arrival.
              </p>
            </div>

            {/* Delivery Snapshot Card */}
            <div
              style={{
                padding: '14px',
                borderRadius: '14px',
                backgroundColor: '#FAF7F2',
                border: '1.5px solid #E5DFC9',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#5A6472', textTransform: 'uppercase' }}>
                  Delivery Details Snapshot
                </span>
                {placedOrder.delivery_address_snapshot?.label && (
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: '#FDEEEB',
                      color: '#E24B36',
                    }}
                  >
                    {placedOrder.delivery_address_snapshot.label}
                  </span>
                )}
              </div>

              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E242B' }}>
                {placedOrder.customer_name} · {formatPakistanPhoneDisplay(placedOrder.customer_phone)}
              </div>

              <div style={{ fontSize: '12.5px', color: '#5A6472', lineHeight: 1.4 }}>
                {placedOrder.delivery_address}
              </div>

              {placedOrder.notes && (
                <div
                  style={{
                    fontSize: '11.5px',
                    color: '#92400E',
                    backgroundColor: '#FEF7E4',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #FCE7B0',
                  }}
                >
                  <strong>Instructions:</strong> {placedOrder.notes}
                </div>
              )}
            </div>

            {/* Ordered Items & Price Summary */}
            <div
              style={{
                padding: '14px',
                borderRadius: '14px',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #E5DFC9',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#5A6472', textTransform: 'uppercase' }}>
                Order Items ({placedOrder.items.reduce((s, i) => s + i.quantity, 0)})
              </span>

              {placedOrder.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '13px',
                    paddingBottom: '6px',
                    borderBottom: idx < placedOrder.items.length - 1 ? '1px solid #F5F1EA' : 'none',
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#1E242B' }}>
                    {item.quantity}x {item.product_name}
                  </span>
                  <span style={{ fontWeight: 700, color: '#1E242B' }}>
                    Rs. {(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}

              <div
                style={{
                  borderTop: '1px dashed #D8D0BA',
                  paddingTop: '8px',
                  marginTop: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  fontSize: '12.5px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#5A6472' }}>
                  <span>Subtotal</span>
                  <span>Rs. {placedOrder.subtotal.toFixed(2)}</span>
                </div>
                {placedOrder.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803D', fontWeight: 700 }}>
                    <span>Drop Savings</span>
                    <span>- Rs. {placedOrder.discount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#5A6472' }}>
                  <span>Delivery Fee</span>
                  <span>Rs. {placedOrder.delivery_fee.toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '15px',
                    fontWeight: 900,
                    color: '#E24B36',
                    paddingTop: '6px',
                  }}
                >
                  <span>Total Payable (COD)</span>
                  <span>Rs. {placedOrder.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Button variant="primary" fullWidth size="lg" onClick={handleFinishConfirmation}>
              <span>View & Track Order</span>
            </Button>
          </div>
        ) : cart.items.length === 0 ? (
          /* Empty Cart Guard */
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <ShoppingBag size={40} color="#D97706" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>
              Your Food Bag is Empty
            </h4>
            <p style={{ fontSize: '13px', color: '#5A6472', marginBottom: '18px' }}>
              Add delicious dishes from a food drop before proceeding to checkout.
            </p>
            <Button variant="secondary" fullWidth onClick={onClose}>
              Return to Feed
            </Button>
          </div>
        ) : (
          /* ============================================================
             MAIN CHECKOUT FORM
             ============================================================ */
          <form
            onSubmit={handlePlaceOrder}
            noValidate
            style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
          >
            {errorMessage && (
              <div
                role="alert"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#FEF2F2',
                  border: '1.5px solid #FCA5A5',
                  color: '#B91C1C',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  lineHeight: 1.4,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* ============================================================
                1. ORDER SUMMARY SECTION
                ============================================================ */}
            <section
              style={{
                backgroundColor: '#FAF7F2',
                borderRadius: '16px',
                padding: '14px',
                border: '1.5px solid #E5DFC9',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Store size={16} color="#E24B36" />
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#1E242B', margin: 0 }}>
                      {activeRestaurant?.name || cart.restaurant_name}
                    </h4>
                    <span style={{ fontSize: '11px', color: '#5A6472', fontWeight: 600 }}>
                      {activeRestaurant?.city ? `${activeRestaurant.city} · ` : ''}
                      Est. {activeRestaurant?.delivery_time_min || 25}–{activeRestaurant?.delivery_time_max || 35} mins
                    </span>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '8px',
                    backgroundColor: activeRestaurant?.is_open !== false ? '#F0FDF4' : '#FEF2F2',
                    color: activeRestaurant?.is_open !== false ? '#15803D' : '#DC2626',
                  }}
                >
                  {activeRestaurant?.is_open !== false ? 'OPEN' : 'CLOSED'}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  borderTop: '1px solid #E5DFC9',
                  paddingTop: '10px',
                }}
              >
                {pricingSummary.verifiedItems.map((item) => (
                  <div
                    key={item.product.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <img
                        src={item.liveProduct.image_url}
                        alt={item.liveProduct.name}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          objectFit: 'cover',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#1E242B',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.quantity}x {item.liveProduct.name}
                        </div>
                        {item.special_instructions && (
                          <div style={{ fontSize: '11px', color: '#8E99A8', fontStyle: 'italic' }}>
                            Note: {item.special_instructions}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#1E242B' }}>
                        Rs. {item.lineTotal.toFixed(2)}
                      </div>
                      {item.lineDiscount > 0 && (
                        <div style={{ fontSize: '10.5px', color: '#8E99A8', textDecoration: 'line-through' }}>
                          Rs. {(item.basePrice * item.quantity).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ============================================================
                2. DELIVERY ADDRESS SELECTION SECTION (WITH SAVED LOCATIONS SUBMENU)
                ============================================================ */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={16} color="#E24B36" />
                  <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#1E242B', margin: 0 }}>
                    Select Delivery Address
                  </h4>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {addresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsLocationSubmenuOpen((prev) => !prev)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 10px',
                        borderRadius: '10px',
                        backgroundColor: isLocationSubmenuOpen ? '#1E242B' : '#FAF7F2',
                        border: `1px solid ${isLocationSubmenuOpen ? '#1E242B' : '#D8D0BA'}`,
                        color: isLocationSubmenuOpen ? '#FFFFFF' : '#1E242B',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      <span>Saved Locations ({addresses.length})</span>
                      {isLocationSubmenuOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setEditingAddress(null);
                      setAutoTriggerGpsInModal(false);
                      setIsAddressModalOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 10px',
                      borderRadius: '10px',
                      backgroundColor: '#FDEEEB',
                      border: '1px solid #F9C6BD',
                      color: '#E24B36',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={13} />
                    <span>Add New Address</span>
                  </button>
                </div>
              </div>

              {isLoadingAddresses ? (
                <div
                  style={{
                    padding: '20px',
                    textAlign: 'center',
                    borderRadius: '14px',
                    backgroundColor: '#FAF7F2',
                    border: '1px solid #E5DFC9',
                    fontSize: '13px',
                    color: '#5A6472',
                  }}
                >
                  Loading your saved addresses...
                </div>
              ) : addresses.length === 0 ? (
                /* Empty Saved Addresses Prompt */
                <div
                  style={{
                    padding: '20px 16px',
                    borderRadius: '16px',
                    backgroundColor: '#FAF7F2',
                    border: '1.5px dashed #D8D0BA',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <MapPin size={28} color="#E24B36" />
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#1E242B' }}>
                    No Saved Delivery Address
                  </div>
                  <p style={{ fontSize: '12px', color: '#5A6472', maxWidth: '300px', lineHeight: 1.4 }}>
                    Add your delivery address in{' '}
                    <strong>{activeRestaurant?.city || 'your city'}</strong> to proceed with checkout.
                  </p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAddress(null);
                        setAutoTriggerGpsInModal(false);
                        setIsAddressModalOpen(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '9px 16px',
                        borderRadius: '10px',
                        backgroundColor: '#E24B36',
                        color: '#FFFFFF',
                        fontSize: '12.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={14} />
                      <span>+ Add New Address</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Interactive Submenu Dropdown for Switching Between Multiple Saved Locations */}
                  {isLocationSubmenuOpen && (
                    <div
                      style={{
                        padding: '10px',
                        borderRadius: '14px',
                        backgroundColor: '#FAF7F2',
                        border: '1.5px solid #D8D0BA',
                        boxShadow: '0 8px 24px rgba(30, 36, 43, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '2px 4px 6px',
                          borderBottom: '1px solid #E5DFC9',
                        }}
                      >
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#5A6472', textTransform: 'uppercase' }}>
                          Choose From Saved Locations ({addresses.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsLocationSubmenuOpen(false);
                            setEditingAddress(null);
                            setAutoTriggerGpsInModal(false);
                            setIsAddressModalOpen(true);
                          }}
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color: '#E24B36',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            cursor: 'pointer',
                          }}
                        >
                          <Plus size={12} />
                          <span>Add Another Location</span>
                        </button>
                      </div>

                      {addresses.map((subAddr) => {
                        const isCurrent = selectedAddressId === subAddr.id;
                        const subCoverage = verifyDeliveryCoverage(
                          activeRestaurant,
                          subAddr,
                          pricingSummary.subtotal
                        );
                        return (
                          <div
                            key={subAddr.id}
                            onClick={() => {
                              handleSelectAddress(subAddr);
                              setIsLocationSubmenuOpen(false);
                            }}
                            style={{
                              padding: '9px 11px',
                              borderRadius: '10px',
                              backgroundColor: isCurrent ? '#FFFDF8' : '#FFFFFF',
                              border: `1.5px solid ${isCurrent ? '#E24B36' : '#E5DFC9'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#1E242B' }}>
                                  {subAddr.label}
                                </span>
                                {subAddr.is_default && (
                                  <span
                                    style={{
                                      fontSize: '9.5px',
                                      fontWeight: 800,
                                      backgroundColor: '#1E242B',
                                      color: '#FFFFFF',
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                    }}
                                  >
                                    DEFAULT
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: '5px',
                                    backgroundColor: subCoverage.cityMatches ? '#F0FDF4' : '#FEF2F2',
                                    color: subCoverage.cityMatches ? '#15803D' : '#DC2626',
                                  }}
                                >
                                  {subCoverage.cityMatches
                                    ? `✓ ${subAddr.city_name || subAddr.city}`
                                    : `Outside ${activeRestaurant?.city}`}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: '11.5px',
                                  color: '#5A6472',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {[
                                  subAddr.house_number || subAddr.house_no,
                                  subAddr.street,
                                  subAddr.area,
                                  subAddr.city_name || subAddr.city,
                                ]
                                  .filter(Boolean)
                                  .join(', ')}
                              </div>
                            </div>

                            <div
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                backgroundColor: isCurrent ? '#E24B36' : '#F5F1EA',
                                border: `1.5px solid ${isCurrent ? '#E24B36' : '#D8D0BA'}`,
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {isCurrent && <Check size={12} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Active Selected Address Card (or all cards if submenu is closed and user wants direct view) */}
                  {(selectedAddress ? [selectedAddress] : addresses.slice(0, 1)).map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    const isHome = addr.label.toLowerCase().includes('home');
                    const isWork = addr.label.toLowerCase().includes('work');
                    const cardCoverage = verifyDeliveryCoverage(
                      activeRestaurant,
                      addr,
                      pricingSummary.subtotal
                    );
                    const isDeletingThis = confirmDeleteAddressId === addr.id;

                    return (
                      <div
                        key={addr.id}
                        onClick={() => handleSelectAddress(addr)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '14px',
                          backgroundColor: isSelected ? '#FFFDF8' : '#FFFFFF',
                          border: `2px solid ${
                            isSelected
                              ? cardCoverage.cityMatches
                                ? '#E24B36'
                                : '#DC2626'
                              : '#E5DFC9'
                          }`,
                          boxShadow: isSelected
                            ? '0 4px 14px rgba(226, 75, 54, 0.1)'
                            : '0 1px 4px rgba(0,0,0,0.03)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        {/* Top Row: Label + Default Badge + Selection Status */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '8px',
                                backgroundColor: isSelected ? '#FDEEEB' : '#F5F1EA',
                                color: isSelected ? '#E24B36' : '#1E242B',
                                fontSize: '12px',
                                fontWeight: 800,
                              }}
                            >
                              {isHome ? (
                                <Home size={12} />
                              ) : isWork ? (
                                <Briefcase size={12} />
                              ) : (
                                <MapPin size={12} />
                              )}
                              <span>{addr.label}</span>
                            </span>

                            {addr.is_default && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  backgroundColor: '#1E242B',
                                  color: '#FFFFFF',
                                  padding: '2px 6px',
                                  borderRadius: '5px',
                                }}
                              >
                                DEFAULT
                              </span>
                            )}

                            {/* Coverage indicator per card */}
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: '6px',
                                backgroundColor: cardCoverage.cityMatches ? '#F0FDF4' : '#FEF2F2',
                                color: cardCoverage.cityMatches ? '#15803D' : '#DC2626',
                              }}
                            >
                              {cardCoverage.cityMatches
                                ? `✓ ${addr.city_name || addr.city}`
                                : `Outside ${activeRestaurant?.city} coverage`}
                            </span>
                          </div>

                          <div
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              backgroundColor: isSelected ? '#E24B36' : '#F5F1EA',
                              border: `1.5px solid ${isSelected ? '#E24B36' : '#D8D0BA'}`,
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {isSelected && <Check size={13} />}
                          </div>
                        </div>

                        {/* Recipient Name & Pakistani Phone */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            color: '#1E242B',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span>{addr.recipient_name || user?.full_name || user?.name}</span>
                          <span style={{ color: '#8E99A8' }}>•</span>
                          <span style={{ color: '#5A6472' }}>
                            {formatPakistanPhoneDisplay(addr.phone_number || addr.phone)}
                          </span>
                        </div>

                        {/* Full Delivery Address & Area / City */}
                        <div style={{ fontSize: '12.5px', color: '#5A6472', lineHeight: 1.4 }}>
                          {[addr.house_number || addr.house_no, addr.street, addr.block_or_phase]
                            .filter(Boolean)
                            .join(', ')}
                          <div style={{ fontWeight: 700, color: '#1E242B', marginTop: '2px' }}>
                            {[addr.area, addr.city_name || addr.city].filter(Boolean).join(', ')}
                            {addr.landmark ? ` · Near ${addr.landmark}` : ''}
                          </div>
                        </div>

                        {/* Card Actions: Change Location Submenu trigger, Set Default, Edit, Delete */}
                        {isDeletingThis ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              backgroundColor: '#FEF2F2',
                              border: '1px solid #FCA5A5',
                              marginTop: '4px',
                            }}
                          >
                            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#B91C1C' }}>
                              Delete this saved address?
                            </span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteAddressId(null)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #D8D0BA',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleConfirmDelete(addr.id)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: '#DC2626',
                                  color: '#FFFFFF',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                }}
                              >
                                Confirm Delete
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              borderTop: '1px solid #F5F1EA',
                              paddingTop: '6px',
                              marginTop: '2px',
                              flexWrap: 'wrap',
                              gap: '6px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {addresses.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsLocationSubmenuOpen((prev) => !prev);
                                  }}
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    color: '#1E242B',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    backgroundColor: '#F5F1EA',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <span>Change Location ({addresses.length})</span>
                                  {isLocationSubmenuOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                </button>
                              )}
                              {!addr.is_default && (
                                <button
                                  type="button"
                                  onClick={(e) => handleSetDefault(addr.id, e)}
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#E24B36',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Star size={11} />
                                  <span>Set as Default</span>
                                </button>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingAddress(addr);
                                  setAutoTriggerGpsInModal(false);
                                  setIsAddressModalOpen(true);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: '#FAF7F2',
                                  border: '1px solid #E5DFC9',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: '#1E242B',
                                  cursor: 'pointer',
                                }}
                              >
                                <Edit3 size={11} color="#E24B36" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteAddressId(addr.id);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: '#FEF2F2',
                                  border: '1px solid #FECACA',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: '#DC2626',
                                  cursor: 'pointer',
                                }}
                              >
                                <Trash2 size={11} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Delivery Coverage Feedback Banner */}
              {selectedAddress && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '12px',
                    backgroundColor: coverageStatus.canDeliver ? '#F0FDF4' : '#FEF2F2',
                    border: `1.5px solid ${coverageStatus.canDeliver ? '#BBF7D0' : '#FCA5A5'}`,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    {coverageStatus.canDeliver ? (
                      <Truck size={16} color="#15803D" style={{ flexShrink: 0, marginTop: '2px' }} />
                    ) : (
                      <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                    )}
                    <div style={{ fontSize: '12px', lineHeight: 1.4 }}>
                      <div
                        style={{
                          fontWeight: 800,
                          color: coverageStatus.canDeliver ? '#15803D' : '#B91C1C',
                        }}
                      >
                        {coverageStatus.canDeliver
                          ? coverageStatus.coverageNote
                          : !coverageStatus.isRestaurantOpen
                          ? 'Restaurant Currently Closed'
                          : coverageStatus.cityMatches && !coverageStatus.meetsMinOrder
                          ? `Minimum Order Not Reached (Rs. ${coverageStatus.minOrder.toFixed(2)})`
                          : 'Delivery Unavailable for Selected Address'}
                      </div>
                      <div style={{ color: coverageStatus.canDeliver ? '#166534' : '#991B1B', marginTop: '2px' }}>
                        {coverageStatus.canDeliver
                          ? `Delivery Fee: Rs. ${coverageStatus.deliveryFee.toFixed(2)} · Min. Order: Rs. ${coverageStatus.minOrder.toFixed(2)}`
                          : coverageStatus.errorMessage}
                      </div>
                    </div>
                  </div>

                  {!coverageStatus.cityMatches && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAddress(null);
                        setAutoTriggerGpsInModal(false);
                        setIsAddressModalOpen(true);
                      }}
                      style={{
                        flexShrink: 0,
                        padding: '6px 10px',
                        borderRadius: '8px',
                        backgroundColor: '#DC2626',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        fontWeight: 800,
                      }}
                    >
                      + Add {activeRestaurant?.city} Address
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* ============================================================
                3. CUSTOMER CONTACT DETAILS SECTION
                ============================================================ */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserIcon size={15} color="#E24B36" />
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#1E242B', margin: 0 }}>
                  Customer Contact Details
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label
                    htmlFor="checkout-recipient-name"
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#5A6472',
                      marginBottom: '4px',
                    }}
                  >
                    Recipient Full Name <span style={{ color: '#E24B36' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <UserIcon
                      size={14}
                      color="#8E99A8"
                      style={{ position: 'absolute', left: '11px', top: '12px' }}
                    />
                    <input
                      id="checkout-recipient-name"
                      type="text"
                      required
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Full name"
                      style={{
                        width: '100%',
                        padding: '9px 10px 9px 32px',
                        borderRadius: '10px',
                        border: '1.5px solid #E5DFC9',
                        fontSize: '13px',
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="checkout-recipient-phone"
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#5A6472',
                      marginBottom: '4px',
                    }}
                  >
                    Pakistani Mobile (+92) <span style={{ color: '#E24B36' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone
                      size={14}
                      color="#8E99A8"
                      style={{ position: 'absolute', left: '11px', top: '12px' }}
                    />
                    <input
                      id="checkout-recipient-phone"
                      type="tel"
                      required
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder="+92 300 1234567"
                      style={{
                        width: '100%',
                        padding: '9px 10px 9px 32px',
                        borderRadius: '10px',
                        border: `1.5px solid ${
                          recipientPhone && !phoneValidation.isValid
                            ? '#DC2626'
                            : phoneValidation.isValid
                            ? '#15803D'
                            : '#E5DFC9'
                        }`,
                        fontSize: '13px',
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                  </div>
                </div>
              </div>

              {recipientPhone && !phoneValidation.isValid && (
                <p style={{ fontSize: '11.5px', color: '#DC2626', fontWeight: 600, margin: 0 }}>
                  {phoneValidation.error}
                </p>
              )}
            </section>

            {/* ============================================================
                4. DELIVERY INSTRUCTIONS SECTION
                ============================================================ */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={15} color="#E24B36" />
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#1E242B', margin: 0 }}>
                  Delivery Instructions
                </h4>
              </div>

              <textarea
                rows={2}
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder='e.g. "Call when you arrive," "Use the side entrance," or "Apartment on the second floor."'
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #E5DFC9',
                  fontSize: '12.5px',
                  backgroundColor: '#FFFFFF',
                  resize: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </section>

            {/* ============================================================
                5. PAYMENT METHOD SECTION
                ============================================================ */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Banknote size={16} color="#E24B36" />
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#1E242B', margin: 0 }}>
                  Payment Method
                </h4>
              </div>

              {SUPPORTED_PAYMENT_METHODS.map((pm) => (
                <div
                  key={pm.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    backgroundColor: '#FEF7E4',
                    border: '1.5px solid #FCE7B0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #FCE7B0',
                      }}
                    >
                      <Banknote size={20} color="#B45309" />
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#92400E' }}>
                        {pm.name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#B45309' }}>
                        {pm.description}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 800,
                      backgroundColor: '#FFFFFF',
                      color: '#B45309',
                      padding: '4px 9px',
                      borderRadius: '8px',
                      border: '1px solid #FCE7B0',
                    }}
                  >
                    SELECTED
                  </span>
                </div>
              ))}
            </section>

            {/* ============================================================
                6. PRICE BREAKDOWN SECTION
                ============================================================ */}
            <section
              style={{
                padding: '14px',
                borderRadius: '16px',
                backgroundColor: '#FAF7F2',
                border: '1.5px solid #E5DFC9',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E242B' }}>
                Price Breakdown
              </span>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#5A6472' }}>
                <span>Items Subtotal</span>
                <span style={{ fontWeight: 700, color: '#1E242B' }}>
                  Rs. {pricingSummary.subtotal.toFixed(2)}
                </span>
              </div>

              {pricingSummary.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#15803D' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={13} />
                    <span>Food Drop Discount Savings</span>
                  </span>
                  <span style={{ fontWeight: 800 }}>
                    - Rs. {pricingSummary.discount.toFixed(2)}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#5A6472' }}>
                <span>Delivery Fee</span>
                <span style={{ fontWeight: 700, color: '#1E242B' }}>
                  Rs. {pricingSummary.deliveryFee.toFixed(2)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#5A6472' }}>
                <span>Tax</span>
                <span style={{ fontWeight: 600, color: '#5A6472' }}>
                  Rs. {pricingSummary.tax.toFixed(2)} (Inclusive)
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  borderTop: '1.5px dashed #D8D0BA',
                  paddingTop: '10px',
                  marginTop: '4px',
                }}
              >
                <div>
                  <span style={{ fontSize: '15px', fontWeight: 900, color: '#1E242B' }}>
                    Final Payable Amount
                  </span>
                  <div style={{ fontSize: '11px', color: '#8E99A8' }}>
                    Verified Server Total · Cash on Delivery
                  </div>
                </div>
                <span style={{ fontSize: '19px', fontWeight: 900, color: '#E24B36' }}>
                  Rs. {pricingSummary.total.toFixed(2)}
                </span>
              </div>
            </section>

            {/* ============================================================
                7. PLACE ORDER ACTION BAR
                ============================================================ */}
            <div
              style={{
                position: 'sticky',
                bottom: 0,
                backgroundColor: '#FFFFFF',
                paddingTop: '10px',
                borderTop: '1px solid #E5DFC9',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                zIndex: 15,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#8E99A8', textTransform: 'uppercase' }}>
                  Total Payable
                </span>
                <span style={{ fontSize: '18px', fontWeight: 900, color: '#E24B36' }}>
                  Rs. {pricingSummary.total.toFixed(2)}
                </span>
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                disabled={
                  isSubmitting ||
                  !selectedAddress ||
                  !coverageStatus.canDeliver ||
                  Boolean(pricingSummary.unavailableItemName)
                }
              >
                {isSubmitting ? (
                  <span>Placing Order...</span>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>Place Order · Rs. {pricingSummary.total.toFixed(2)}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add / Edit / Map Pin Address Modal (rendered above CheckoutModal) */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => {
          setIsAddressModalOpen(false);
          setEditingAddress(null);
          setAutoTriggerGpsInModal(false);
        }}
        onSave={handleAddressSaved}
        initialAddress={editingAddress}
        autoTriggerGps={autoTriggerGpsInModal}
        preferredCity={activeRestaurant?.city || user?.city}
      />
    </>
  );
};
