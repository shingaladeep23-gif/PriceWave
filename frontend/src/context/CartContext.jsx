import React, { createContext, useState, useContext, useCallback, useEffect, useRef } from 'react';
import { cartService } from '../services/api';

const CartContext = createContext({ cartCount: 0, refreshCartCount: () => {}, lastWsMessage: null, setLastWsMessage: () => {} });

export const CartProvider = ({ children }) => {
  const [cartCount, setCartCount] = useState(0);
  const [lastWsMessage, setLastWsMessage] = useState(null);

  const refreshCartCount = useCallback(async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) { setCartCount(0); return; }
    try {
      const data = await cartService.getCart();
      const count = (data.items || []).reduce((sum, item) => sum + item.quantity, 0);
      setCartCount(count);
    } catch {
      setCartCount(0);
    }
  }, []);

  // Auto-refresh cart count when WebSocket reports cart or purchase events for this user
  useEffect(() => {
    if (!lastWsMessage) return;
    const msg = lastWsMessage;
    const userId = parseInt(localStorage.getItem('userId') || '0');

    if (
      (msg.type === 'cart_update' && msg.user_id === userId) ||
      (msg.type === 'purchase_completed' && msg.user_id === userId)
    ) {
      refreshCartCount();
    }
  }, [lastWsMessage, refreshCartCount]);

  return (
    <CartContext.Provider value={{ cartCount, setCartCount, refreshCartCount, lastWsMessage, setLastWsMessage }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
