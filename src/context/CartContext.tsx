// Single-Restaurant Cart Context with safety checks

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Cart, CartItem, Product, Restaurant } from '../types';

interface CartContextType {
  cart: Cart;
  totalItemCount: number;
  addToCart: (product: Product, restaurant: Restaurant, quantity?: number, instructions?: string) => { added: boolean; conflict?: { existingRestaurantName: string; pendingProduct: Product; pendingRestaurant: Restaurant } };
  confirmSwitchRestaurantAndAdd: (product: Product, restaurant: Restaurant, quantity?: number, instructions?: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  activeCheckoutProduct: Product | null;
  setActiveCheckoutProduct: (prod: Product | null) => void;
}

const EMPTY_CART: Cart = {
  restaurant_id: null,
  restaurant_name: null,
  items: [],
  subtotal: 0,
  delivery_fee: 0,
  discount: 0,
  total: 0,
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<Cart>(() => {
    const saved = localStorage.getItem('cravedrop_cart');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return EMPTY_CART;
      }
    }
    return EMPTY_CART;
  });

  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [activeCheckoutProduct, setActiveCheckoutProduct] = useState<Product | null>(null);

  useEffect(() => {
    localStorage.setItem('cravedrop_cart', JSON.stringify(cart));
  }, [cart]);

  const recalculateCart = (items: CartItem[], deliveryFee: number): Cart => {
    if (items.length === 0) {
      return EMPTY_CART;
    }
    const restId = items[0].restaurant.id;
    const restName = items[0].restaurant.name;

    const subtotal = items.reduce((sum, item) => {
      const price = item.product.discount_price !== undefined ? item.product.discount_price : item.product.price;
      return sum + price * item.quantity;
    }, 0);

    const discount = items.reduce((sum, item) => {
      if (item.product.discount_price !== undefined && item.product.discount_price < item.product.price) {
        return sum + (item.product.price - item.product.discount_price) * item.quantity;
      }
      return sum;
    }, 0);

    const roundedSubtotal = Number(subtotal.toFixed(2));
    const roundedDiscount = Number(discount.toFixed(2));
    const total = Number((roundedSubtotal + deliveryFee).toFixed(2));

    return {
      restaurant_id: restId,
      restaurant_name: restName,
      items,
      subtotal: roundedSubtotal,
      delivery_fee: deliveryFee,
      discount: roundedDiscount,
      total,
    };
  };

  const addToCart = (
    product: Product,
    restaurant: Restaurant,
    quantity = 1,
    instructions = ''
  ) => {
    // Check if adding from a different kitchen
    if (cart.restaurant_id && cart.restaurant_id !== restaurant.id && cart.items.length > 0) {
      return {
        added: false,
        conflict: {
          existingRestaurantName: cart.restaurant_name || 'another restaurant',
          pendingProduct: product,
          pendingRestaurant: restaurant,
        },
      };
    }

    const existingIndex = cart.items.findIndex((item) => item.product.id === product.id);
    let updatedItems: CartItem[];

    if (existingIndex > -1) {
      updatedItems = [...cart.items];
      updatedItems[existingIndex].quantity += quantity;
      if (instructions) {
        updatedItems[existingIndex].special_instructions = instructions;
      }
    } else {
      updatedItems = [
        ...cart.items,
        {
          product,
          restaurant,
          quantity,
          special_instructions: instructions,
        },
      ];
    }

    setCart(recalculateCart(updatedItems, restaurant.delivery_fee || 2.99));
    return { added: true };
  };

  const confirmSwitchRestaurantAndAdd = (
    product: Product,
    restaurant: Restaurant,
    quantity = 1,
    instructions = ''
  ) => {
    const newItems: CartItem[] = [
      {
        product,
        restaurant,
        quantity,
        special_instructions: instructions,
      },
    ];
    setCart(recalculateCart(newItems, restaurant.delivery_fee || 2.99));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const updated = cart.items.map((item) =>
      item.product.id === productId ? { ...item, quantity } : item
    );
    setCart(recalculateCart(updated, cart.delivery_fee));
  };

  const removeFromCart = (productId: string) => {
    const updated = cart.items.filter((item) => item.product.id !== productId);
    setCart(recalculateCart(updated, updated.length > 0 ? cart.delivery_fee : 0));
  };

  const clearCart = () => {
    setCart(EMPTY_CART);
  };

  const totalItemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        totalItemCount,
        addToCart,
        confirmSwitchRestaurantAndAdd,
        updateQuantity,
        removeFromCart,
        clearCart,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        activeCheckoutProduct,
        setActiveCheckoutProduct,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
