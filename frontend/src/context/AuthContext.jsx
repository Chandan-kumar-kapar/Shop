import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Fetch current user details if token exists on mount
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data);
            if (data.role === 'customer') {
              setAddresses(data.addresses || []);
            }
            // Fetch notifications
            fetchNotifications(token);
          } else {
            // Token expired or invalid
            logout();
          }
        } catch (err) {
          console.error("Auth initialization error:", err);
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      
      // Load addresses and notifications
      if (data.user.role === 'customer') {
        fetchAddresses(data.token);
      }
      fetchNotifications(data.token);
      
      setLoading(false);
      return data.user;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const register = async (name, email, password, role) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      return data;
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setAddresses([]);
    setNotifications([]);
  };

  const updateProfile = async (profileData) => {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Profile update failed');
      }
      setUser(data.user);
      return data.user;
    } catch (err) {
      throw err;
    }
  };

  const fetchAddresses = async (authToken = token) => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/auth/addresses', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
      }
    } catch (err) {
      console.error("Fetch addresses error:", err);
    }
  };

  const addAddress = async (addressData) => {
    try {
      const res = await fetch('/api/auth/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(addressData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Adding address failed');
      }
      fetchAddresses();
      return data.address;
    } catch (err) {
      throw err;
    }
  };

  const updateAddress = async (addressId, addressData) => {
    try {
      const res = await fetch(`/api/auth/addresses/${addressId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(addressData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Updating address failed');
      }
      fetchAddresses();
      return data.address;
    } catch (err) {
      throw err;
    }
  };

  const deleteAddress = async (addressId) => {
    try {
      const res = await fetch(`/api/auth/addresses/${addressId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Deleting address failed');
      }
      fetchAddresses();
    } catch (err) {
      throw err;
    }
  };

  const fetchNotifications = async (authToken = token) => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/dashboard/notifications', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Fetch notifications error:", err);
    }
  };

  const markNotificationRead = async (notifId) => {
    try {
      const res = await fetch(`/api/dashboard/notifications/${notifId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
        );
      }
    } catch (err) {
      console.error("Mark notification read error:", err);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      addresses,
      notifications,
      login,
      register,
      logout,
      updateProfile,
      fetchAddresses,
      addAddress,
      updateAddress,
      deleteAddress,
      fetchNotifications,
      markNotificationRead
    }}>
      {children}
    </AuthContext.Provider>
  );
};
