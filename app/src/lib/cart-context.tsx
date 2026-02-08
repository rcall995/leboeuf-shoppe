'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface CartItem {
  variant_id: string;
  product_name: string;
  variant_name: string;
  sku: string | null;
  quantity_lbs: number; // weight in lbs for catch/fixed weight, or quantity for 'each'
  price_per_unit: number;
  unit: string;
  weight_type: string;
  estimated_weight_per_piece: number | null; // for estimating piece count
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateItem: (variant_id: string, quantity_lbs: number) => void;
  removeItem: (variant_id: string) => void;
  clearCart: () => void;
  itemCount: number;
  estimatedTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_KEY = 'leboeuf-cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    }
  }, [items, loaded]);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.variant_id === item.variant_id);
      if (existing) {
        return prev.map((i) =>
          i.variant_id === item.variant_id
            ? { ...i, quantity_lbs: i.quantity_lbs + item.quantity_lbs }
            : i
        );
      }
      return [...prev, item];
    });
  }, []);

  const updateItem = useCallback((variant_id: string, quantity_lbs: number) => {
    if (quantity_lbs <= 0) {
      setItems((prev) => prev.filter((i) => i.variant_id !== variant_id));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.variant_id === variant_id ? { ...i, quantity_lbs } : i))
      );
    }
  }, []);

  const removeItem = useCallback((variant_id: string) => {
    setItems((prev) => prev.filter((i) => i.variant_id !== variant_id));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const itemCount = items.length;

  const estimatedTotal = items.reduce((sum, item) => {
    if (item.unit === 'case') {
      // Cases: quantity × case_weight × price_per_lb
      return sum + item.quantity_lbs * (item.estimated_weight_per_piece ?? 0) * item.price_per_unit;
    }
    // Weight-based: lbs × price_per_lb
    return sum + item.quantity_lbs * item.price_per_unit;
  }, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, updateItem, removeItem, clearCart, itemCount, estimatedTotal }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
