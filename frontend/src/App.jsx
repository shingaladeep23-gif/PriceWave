import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { WebSocketProvider, useWebSocket } from './context/WebSocketContext';
import LoginPage from './pages/LoginPage';
import ProductListing from './pages/user/ProductListing';
import ProductDetail from './pages/user/ProductDetail';
import CartPage from './pages/user/CartPage';
import ProfilePage from './pages/user/ProfilePage';
import OrderDetailPage from './pages/user/OrderDetailPage';
import Dashboard from './pages/admin/Dashboard';
import { ShoppingCart, LayoutDashboard, LogOut, Search, UserCircle } from 'lucide-react';

const CartInitializer = () => {
  const { user } = useAuth();
  const { refreshCartCount, setCartCount, setLastWsMessage } = useCart();
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (user) refreshCartCount();
    else setCartCount(0);
  }, [user]);

  // Bridge WebSocket messages into CartContext
  useEffect(() => {
    if (lastMessage) setLastWsMessage(lastMessage);
  }, [lastMessage, setLastWsMessage]);

  return null;
};

const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role === 'admin' && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const [searchVal, setSearchVal] = useState('');

  if (!user) return null;

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/?q=${encodeURIComponent(searchVal.trim())}`);
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">PriceWave</Link>

        {user.role !== 'admin' && (
          <form onSubmit={handleSearch} className="nav-search">
            <input
              className="nav-search-input"
              placeholder="Search products, brands and more..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
            />
            <button type="submit" className="nav-search-btn">
              <Search size={18} />
            </button>
          </form>
        )}

        <div className="nav-actions">
          {user.role === 'admin' ? (
            <Link to="/admin" className="nav-link">
              <LayoutDashboard size={20} /> Dashboard
            </Link>
          ) : (
            <>
              <Link to="/cart" className="nav-cart">
                <ShoppingCart size={22} />
                {cartCount > 0 && <span className="cart-badge">{cartCount > 99 ? '99+' : cartCount}</span>}
                <span>Cart</span>
              </Link>
              <Link to="/profile" className="nav-link" title="My Profile">
                <UserCircle size={20} />
                <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email?.split('@')[0] || 'Profile'}
                </span>
              </Link>
            </>
          )}
          <button onClick={logout} className="nav-logout">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WebSocketProvider>
        <Router>
          <CartInitializer />
          <Navbar />
          <main className="container">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<PrivateRoute role="user"><ProductListing /></PrivateRoute>} />
              <Route path="/product/:id" element={<PrivateRoute role="user"><ProductDetail /></PrivateRoute>} />
              <Route path="/cart" element={<PrivateRoute role="user"><CartPage /></PrivateRoute>} />
              <Route path="/profile" element={<PrivateRoute role="user"><ProfilePage /></PrivateRoute>} />
              <Route path="/order/:id" element={<PrivateRoute role="user"><OrderDetailPage /></PrivateRoute>} />
              <Route path="/admin" element={<PrivateRoute role="admin"><Dashboard /></PrivateRoute>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </Router>
        </WebSocketProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
