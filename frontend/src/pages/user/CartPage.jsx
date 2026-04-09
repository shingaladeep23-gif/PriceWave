import React, { useState, useEffect } from 'react';
import { cartService, userService, addressService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { ShoppingCart, Trash2, ArrowRight, Loader2, CheckCircle, Package, AlertTriangle, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../../utils/format';

const DEFAULT_IMG = '/placeholder.png';

const CartPage = () => {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [], grand_total: 0 });
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutStatus, setCheckoutStatus] = useState(null);
  const [quantityErrors, setQuantityErrors] = useState({});
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);

  const loadCart = async () => {
    const data = await cartService.getCart();
    setCart(data);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await loadCart();
        const recList = await userService.getRecommendations();
        setRecommendations(recList);
        if (user) {
          const addrs = await addressService.getAddresses(user.id);
          setAddresses(addrs);
          const def = addrs.find(a => a.is_default);
          if (def) setSelectedAddress(def.id);
          else if (addrs.length > 0) setSelectedAddress(addrs[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch cart", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleUpdateQuantity = async (productId, newQuantity) => {
    setQuantityErrors(prev => ({ ...prev, [productId]: '' }));
    try {
      await cartService.updateQuantity(productId, newQuantity);
      await loadCart();
    } catch (err) {
      setQuantityErrors(prev => ({ ...prev, [productId]: err.message }));
    }
  };

  const handleRemove = async (productId) => {
    try {
      await cartService.removeFromCart(productId);
      await loadCart();
      toast('Removed from cart', { icon: '🗑️' });
    } catch (err) {
      console.error("Failed to remove item", err);
    }
  };

  const handleCheckout = async () => {
    try {
      setLoading(true);
      const res = await cartService.checkout(selectedAddress);
      setCheckoutStatus({ status: 'success', orderId: res.order_id });
      setCart({ items: [], grand_total: 0 });
      toast.success('Order placed successfully!');
    } catch (err) {
      console.error("Checkout failed", err);
      setCheckoutStatus({ status: 'error' });
      toast.error('Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && cart.items.length === 0) return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
      <Loader2 className="animate-spin" size={48} />
    </div>
  );

  if (checkoutStatus?.status === 'success') {
    return (
      <div className="empty-state" style={{ marginTop: '4rem' }}>
        <CheckCircle size={64} color="var(--success)" />
        <h1 style={{ marginBottom: '0.5rem' }}>Order Placed Successfully!</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '0.5rem' }}>
          Order ID: <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{checkoutStatus.orderId}</span>
        </p>
        <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
          Prices were locked at time of addition. Thank you for shopping with us!
        </p>
        <Link to="/"><button>Continue Shopping</button></Link>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <ShoppingCart size={32} /> Your Shopping Cart
      </h1>

      {cart.items.length === 0 ? (
        <div className="empty-state">
          <ShoppingCart size={56} color="var(--muted)" />
          <h3 style={{ margin: '0.5rem 0 0.25rem', fontWeight: 700, fontSize: '1.2rem' }}>Your cart is empty</h3>
          <p style={{ color: 'var(--muted)', margin: '0 0 1.25rem', fontSize: '0.95rem' }}>
            Looks like you haven't added anything yet. Start shopping to fill it up!
          </p>
          <Link to="/"><button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}>Start Shopping <ArrowRight size={18} /></button></Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '2rem', alignItems: 'start' }}>

          {/* Cart Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cart.items.map(item => (
              <div
                key={item.product_id}
                className="card"
                style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem', transition: 'none', transform: 'none' }}
              >
                <img
                  src={item.image_url || DEFAULT_IMG} onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_IMG; }}
                  alt={item.product_name}
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.product_name || `Product #${item.product_id}`}
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Locked Price</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{formatPrice(item.price_at_time)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#020617', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <button
                      onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}
                      style={{ padding: '0.4rem 0.75rem', background: 'transparent', minWidth: '36px' }}
                    >−</button>
                    <span style={{ padding: '0 0.75rem', fontWeight: '600' }}>{item.quantity}</span>
                    <button
                      onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                      style={{ padding: '0.4rem 0.75rem', background: 'transparent', minWidth: '36px' }}
                    >+</button>
                  </div>
                  {quantityErrors[item.product_id] && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--danger)', maxWidth: '160px', textAlign: 'center' }}>
                      <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                      {quantityErrors[item.product_id]}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right', minWidth: '90px', fontWeight: 'bold', flexShrink: 0 }}>
                  {formatPrice(item.total)}
                </div>

                <button
                  onClick={() => handleRemove(item.product_id)}
                  style={{ background: 'transparent', color: 'var(--danger)', padding: '0.4rem', border: 'none', flexShrink: 0 }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div style={{ position: 'sticky', top: '100px' }}>
            {addresses.length > 0 && (
              <div className="card" style={{ marginBottom: '1rem', transition: 'none', transform: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <MapPin size={18} color="var(--primary)" />
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Deliver To</h3>
                </div>
                <select
                  value={selectedAddress || ''}
                  onChange={e => setSelectedAddress(parseInt(e.target.value))}
                  className="input"
                  style={{ marginBottom: 0 }}
                >
                  {addresses.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} — {a.address_line}, {a.city} {a.pincode} {a.is_default ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="card" style={{ transition: 'none', transform: 'none' }}>
              <h2 style={{ marginBottom: '1.5rem' }}>Order Summary</h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--muted)' }}>Items ({cart.items.length})</span>
                <span>{formatPrice(cart.grand_total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--muted)' }}>Delivery</span>
                <span style={{ color: 'var(--success)' }}>FREE</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', marginTop: '1rem', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Total</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{formatPrice(cart.grand_total)}</span>
              </div>
              <button
                onClick={handleCheckout}
                style={{ width: '100%', marginTop: '1.5rem', padding: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}
              >
                Place Order <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {recommendations.length > 0 && (
        <section style={{ marginTop: '4rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>You might also like</h2>
          <div className="grid">
            {recommendations.slice(0, 4).map(product => (
              <Link to={`/product/${product.id}`} key={product.id} className="card product-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="image-container">
                  <img src={product.image_url || DEFAULT_IMG} onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_IMG; }} alt={product.name} />
                </div>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{product.name}</div>
                <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{formatPrice(product.current_price)}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default CartPage;
