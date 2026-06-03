import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const useCart = () => useContext(CartContext);

// Simple session ID generator for guest users
const getOrCreateSessionId = () => {
  let sessId = localStorage.getItem('sessionId');
  if (!sessId) {
    sessId = 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('sessionId', sessId);
  }
  return sessId;
};

export const CartProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [cart, setCart] = useState({ items: [], total_price: 0.0 });
  const [loading, setLoading] = useState(true);
  const [sessionId] = useState(getOrCreateSessionId());

  // Fetch cart on mount and when token/user changes
  useEffect(() => {
    fetchCart();
  }, [token, user]);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const url = `/api/cart?session_id=${sessionId}`;
      const res = await fetch(url, { headers });
      
      if (res.ok) {
        const data = await res.json();
        setCart({
          items: data.items || [],
          total_price: data.total_price || 0.0
        });
      }
    } catch (err) {
      console.error("Error fetching cart:", err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId, quantity = 1) => {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const body = {
        product_id: productId,
        quantity: quantity,
        session_id: sessionId
      };
      
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to add item to cart');
      }
      
      // Refresh cart state
      await fetchCart();
      return data;
    } catch (err) {
      console.error("Add to cart error:", err);
      throw err;
    }
  };

  const updateCartItem = async (itemId, quantity) => {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const url = `/api/cart/${itemId}?session_id=${sessionId}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ quantity })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update cart item');
      }
      
      await fetchCart();
      return data;
    } catch (err) {
      console.error("Update cart item error:", err);
      throw err;
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const url = `/api/cart/${itemId}?session_id=${sessionId}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to remove cart item');
      }
      
      await fetchCart();
      return data;
    } catch (err) {
      console.error("Remove from cart error:", err);
      throw err;
    }
  };

  const getItemsCount = () => {
    return cart.items.reduce((total, item) => total + item.quantity, 0);
  };

  return (
    <CartContext.Provider value={{
      cart,
      loading,
      sessionId,
      addToCart,
      updateCartItem,
      removeFromCart,
      fetchCart,
      getItemsCount
    }}>
      {children}
    </CartContext.Provider>
  );
};
