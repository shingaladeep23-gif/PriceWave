import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: async (credentials) => {
    const params = new URLSearchParams();
    params.append('username', credentials.email);
    params.append('password', credentials.password);
    const response = await api.post('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  },
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  googleLogin: async (credential) => {
    const response = await api.post('/auth/google', { id_token: credential });
    return response.data;
  },
};

export const productService = {
  getProducts: async (category) => {
    const response = await api.get('/products/', { params: { category } });
    return response.data;
  },
  getProduct: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },
  recordClick: async (id) => {
    const response = await api.post(`/products/${id}/click`);
    return response.data;
  },
};

export const userService = {
  getProfile: async () => {
    const response = await api.get('/user/profile');
    return response.data;
  },
  getRecommendations: async () => {
    const response = await api.get('/user/recommendations');
    return response.data;
  },
};

// Routes through Vite proxy (/api → http://localhost:8000) — no CORS issues
const CART_BASE = '/api';
const getUserId = () => parseInt(localStorage.getItem('userId') || '1');

export const cartService = {
  getCart: async () => {
    const userId = getUserId();
    console.log("CART: loading cart for user", userId);
    const res = await fetch(`${CART_BASE}/cart/${userId}`);
    if (!res.ok) {
      const text = await res.text();
      console.error("GET CART FAILED:", res.status, text);
      return { items: [], grand_total: 0 };
    }
    const data = await res.json();
    console.log("CART DATA:", data);
    return data;
  },

  addToCart: async (productId, quantity = 1) => {
    const userId = getUserId();
    const res = await fetch(`${CART_BASE}/cart/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, product_id: productId, quantity })
    });
    if (!res.ok) {
      let msg = `Cart error ${res.status}`;
      try { const j = await res.json(); msg = j.detail || msg; } catch {}
      throw new Error(msg);
    }
    return res.json();
  },

  updateQuantity: async (productId, quantity) => {
    const userId = getUserId();
    const res = await fetch(
      `${CART_BASE}/cart/update/${userId}?product_id=${productId}&quantity=${quantity}`,
      { method: 'POST' }
    );
    if (!res.ok) {
      let msg = `Update error ${res.status}`;
      try { const j = await res.json(); msg = j.detail || msg; } catch {}
      throw new Error(msg);
    }
    return res.json();
  },

  removeFromCart: async (productId) => {
    const userId = getUserId();
    const res = await fetch(`${CART_BASE}/cart/remove/${userId}/${productId}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  checkout: async (addressId) => {
    const userId = getUserId();
    const url = addressId
      ? `${CART_BASE}/cart/checkout/${userId}?address_id=${addressId}`
      : `${CART_BASE}/cart/checkout/${userId}`;
    const res = await fetch(url, { method: 'POST' });
    return res.json();
  },
};

export const adminService = {
  getStats: async () => {
    const response = await api.get('/admin/dashboard/stats');
    return response.data;
  },
  getOverview: async () => {
    const response = await api.get('/admin/analytics/overview');
    return response.data;
  },
  getTrends: async () => {
    const response = await api.get('/admin/analytics/trends');
    return response.data;
  },
  getTraffic: async () => {
    const response = await api.get('/admin/analytics/traffic');
    return response.data;
  },
  explainPricing: async (id) => {
    const response = await api.get(`/admin/pricing/explain/${id}`);
    return response.data;
  },
  recalculatePrices: async () => {
    const response = await api.post('/admin/pricing/recalculate');
    return response.data;
  },
  restockInventory: async () => {
    const response = await api.post('/admin/inventory/restock');
    return response.data;
  },
  getInventoryStatus: async () => {
    const response = await api.get('/admin/inventory/status');
    return response.data;
  },
};

export const orderService = {
  getOrders: async (userId) => {
    const response = await api.get(`/user/orders/${userId}`);
    return response.data;
  },
  getAnalytics: async (userId) => {
    const response = await api.get(`/user/analytics/${userId}`);
    return response.data;
  },
  getOrderDetail: async (orderId) => {
    const response = await api.get(`/user/order/${orderId}`);
    return response.data;
  },
  cancelOrder: async (orderId) => {
    const response = await api.put(`/user/order/cancel/${orderId}`);
    return response.data;
  },
};

export const addressService = {
  getAddresses: async (userId) => {
    const response = await api.get(`/user/addresses/${userId}`);
    return response.data;
  },
  addAddress: async (data) => {
    const response = await api.post('/user/address/add', data);
    return response.data;
  },
  updateAddress: async (id, data) => {
    const response = await api.put(`/user/address/update/${id}`, data);
    return response.data;
  },
  deleteAddress: async (id) => {
    const response = await api.delete(`/user/address/${id}`);
    return response.data;
  },
};

export const wishlistService = {
  getWishlist: async (userId) => {
    const response = await api.get(`/user/wishlist/${userId}`);
    return response.data;
  },
  addToWishlist: async (userId, productId) => {
    const response = await api.post('/user/wishlist/add', { user_id: userId, product_id: productId });
    return response.data;
  },
  removeFromWishlist: async (userId, productId) => {
    const response = await api.delete(`/user/wishlist/remove/${userId}/${productId}`);
    return response.data;
  },
};

export const profileService = {
  updateProfile: async (data) => {
    const response = await api.put('/user/profile/update', data);
    return response.data;
  },
};

export default api;
