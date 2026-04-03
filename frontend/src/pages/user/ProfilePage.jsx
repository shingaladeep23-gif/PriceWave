import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  orderService, cartService, addressService,
  wishlistService, profileService,
} from '../../services/api';
import {
  ShoppingBag, Package, TrendingUp, IndianRupee,
  ChevronDown, ChevronUp, RotateCcw, Loader2, UserCircle,
  CalendarDays, Tag, MapPin, Heart, Settings, Plus,
  Edit3, Trash2, Check, X, ShoppingCart, Eye, FileText,
} from 'lucide-react';

const formatPrice = (price) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(price || 0);

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const STATUS_COLORS = {
  processing: '#2563eb',
  shipped: '#f59e0b',
  out_for_delivery: '#7c3aed',
  delivered: '#16a34a',
  cancelled: '#dc2626',
};

const STATUS_LABELS = {
  processing: 'Processing',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/* ════════════════════════════════════════
   Tab: Account Settings
   ════════════════════════════════════════ */
const AccountTab = ({ user, onProfileUpdated }) => {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {};
      if (name !== (user?.name || '')) data.name = name;
      if (email !== user?.email) data.email = email;
      if (Object.keys(data).length === 0) {
        toast('No changes to save.');
        setSaving(false);
        return;
      }
      await profileService.updateProfile(data);
      toast.success('Profile updated!');
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h3 style={{ marginBottom: '1.25rem', fontWeight: 700 }}>Account Settings</h3>
      <div className="card" style={{ maxWidth: 480, padding: '1.5rem', transition: 'none', transform: 'none' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.35rem', display: 'block' }}>Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={{ marginBottom: 0 }} />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.35rem', display: 'block' }}>Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ marginBottom: 0 }} />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Save Changes
          </button>
        </div>
        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontSize: '0.82rem', color: 'var(--muted)' }}>
          <div><strong>Role:</strong> {user?.role?.toUpperCase()}</div>
          <div><strong>Member since:</strong> {formatDate(user?.created_at)}</div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════
   Tab: Address Management
   ════════════════════════════════════════ */
const AddressForm = ({ initial, onSave, onCancel, saving }) => {
  const [form, setForm] = useState(initial || { name: '', phone: '', address_line: '', city: '', state: '', pincode: '', is_default: false });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="card" style={{ padding: '1.25rem', border: '2px solid var(--primary)', marginBottom: '1rem', transition: 'none', transform: 'none' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <input className="input" placeholder="Full Name" value={form.name} onChange={e => set('name', e.target.value)} style={{ marginBottom: 0 }} />
        <input className="input" placeholder="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} style={{ marginBottom: 0 }} />
      </div>
      <input className="input" placeholder="Address Line" value={form.address_line} onChange={e => set('address_line', e.target.value)} style={{ marginTop: '0.75rem' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
        <input className="input" placeholder="City" value={form.city} onChange={e => set('city', e.target.value)} style={{ marginBottom: 0 }} />
        <input className="input" placeholder="State" value={form.state} onChange={e => set('state', e.target.value)} style={{ marginBottom: 0 }} />
        <input className="input" placeholder="Pincode" value={form.pincode} onChange={e => set('pincode', e.target.value)} style={{ marginBottom: 0 }} />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.85rem', cursor: 'pointer' }}>
        <input type="checkbox" checked={form.is_default} onChange={e => set('is_default', e.target.checked)} />
        Set as default address
      </label>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button onClick={() => onSave(form)} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
        </button>
        <button onClick={onCancel} style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', fontSize: '0.85rem' }}>Cancel</button>
      </div>
    </div>
  );
};

const AddressTab = ({ userId }) => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchAddresses = useCallback(async () => {
    try {
      const data = await addressService.getAddresses(userId);
      setAddresses(data);
    } catch { }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  const handleAdd = async (form) => {
    setSaving(true);
    try {
      await addressService.addAddress({ ...form, user_id: userId });
      setShowForm(false);
      fetchAddresses();
      toast.success('Address added');
    } catch { }
    setSaving(false);
  };

  const handleUpdate = async (form) => {
    setSaving(true);
    try {
      await addressService.updateAddress(editingId, form);
      setEditingId(null);
      fetchAddresses();
      toast.success('Address updated');
    } catch { }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      await addressService.deleteAddress(id);
      fetchAddresses();
      toast('Address deleted', { icon: '🗑️' });
    } catch { }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 className="animate-spin" size={32} color="var(--primary)" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ margin: 0, fontWeight: 700 }}>Manage Addresses</h3>
        {!showForm && (
          <button onClick={() => { setShowForm(true); setEditingId(null); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
            <Plus size={16} /> Add Address
          </button>
        )}
      </div>

      {showForm && <AddressForm onSave={handleAdd} onCancel={() => setShowForm(false)} saving={saving} />}

      {addresses.length === 0 && !showForm ? (
        <div className="empty-state">
          <MapPin size={48} color="var(--muted)" />
          <h3 style={{ margin: '0.5rem 0 0.25rem', fontWeight: 700 }}>No addresses saved</h3>
          <p style={{ color: 'var(--muted)', margin: '0 0 1rem', fontSize: '0.9rem' }}>Add an address for faster checkout.</p>
          <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0 auto' }}>
            <Plus size={16} /> Add Address
          </button>
        </div>
      ) : (
        addresses.map(addr => (
          editingId === addr.id ? (
            <AddressForm key={addr.id} initial={addr} onSave={handleUpdate} onCancel={() => setEditingId(null)} saving={saving} />
          ) : (
            <div key={addr.id} className="card" style={{ marginBottom: '0.75rem', padding: '1.25rem', transition: 'none', transform: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{addr.name}</span>
                    {addr.is_default && <span className="badge badge-info">Default</span>}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                    {addr.address_line}<br />
                    {addr.city}, {addr.state} — {addr.pincode}<br />
                    Phone: {addr.phone}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button onClick={() => { setEditingId(addr.id); setShowForm(false); }} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}>
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => handleDelete(addr.id)} style={{ background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '0.3rem 0.6rem', fontSize: '0.78rem' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          )
        ))
      )}
    </div>
  );
};

/* ════════════════════════════════════════
   Tab: Orders
   ════════════════════════════════════════ */
const OrderCard = ({ order, onReorderDone }) => {
  const [expanded, setExpanded] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadInvoice = async () => {
    setDownloading(true);
    try {
      await orderService.downloadInvoice(order.order_id);
      toast.success('Invoice downloaded');
    } catch (err) {
      toast.error(err.message || 'Failed to download invoice');
    } finally {
      setDownloading(false);
    }
  };

  const handleReorder = async () => {
    setReordering(true);
    try {
      for (const item of order.items) {
        await cartService.addToCart(item.product_id, item.quantity);
      }
      toast.success('Items added to cart');
      if (onReorderDone) onReorderDone();
    } catch {
      toast.error('Failed to reorder');
    } finally {
      setReordering(false);
    }
  };

  const statusColor = STATUS_COLORS[order.status] || 'var(--muted)';
  const statusLabel = STATUS_LABELS[order.status] || order.status;

  return (
    <div className="card" style={{ marginBottom: '1rem', border: '1px solid var(--border)', transition: 'none', transform: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>Order #{order.order_id}</span>
              <span className="badge" style={{ background: `${statusColor}18`, color: statusColor }}>{statusLabel}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              <CalendarDays size={13} /> {formatDate(order.created_at)}
            </div>
          </div>
          <div style={{ background: '#f0fdf4', color: 'var(--success)', fontWeight: 700, fontSize: '1rem', padding: '0.35rem 0.75rem', borderRadius: '8px' }}>
            {formatPrice(order.total_amount)}
          </div>
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {order.status !== 'cancelled' && (
            <button onClick={handleReorder} disabled={reordering} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
              {reordering ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Reorder
            </button>
          )}
          <button onClick={handleDownloadInvoice} disabled={downloading} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Invoice
          </button>
          <Link to={`/order/${order.order_id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--background)', color: 'var(--text)', border: '1px solid var(--border)', padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 500 }}>
            <Eye size={14} /> View Details
          </Link>
          <button onClick={() => setExpanded(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--background)', color: 'var(--text)', border: '1px solid var(--border)', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {expanded ? 'Hide' : 'Items'}
          </button>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
          {order.items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderBottom: idx < order.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: '56px', height: '56px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', background: '#f3f4f6' }}>
                {item.image_url ? <img src={item.image_url} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={20} color="var(--muted)" /></div>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>Qty: {item.quantity}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>{formatPrice(item.price * item.quantity)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const OrdersTab = ({ userId }) => {
  const { refreshCartCount } = useCart();
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [o, a] = await Promise.all([orderService.getOrders(userId), orderService.getAnalytics(userId)]);
        setOrders(o);
        setAnalytics(a);
      } catch { }
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 className="animate-spin" size={32} color="var(--primary)" /></div>;

  return (
    <div>
      <h3 style={{ marginBottom: '1rem', fontWeight: 700 }}>Shopping Summary</h3>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        {[
          { icon: ShoppingBag, label: 'Total Orders', value: analytics?.total_orders ?? 0, color: 'var(--primary)' },
          { icon: IndianRupee, label: 'Total Spent', value: formatPrice(analytics?.total_spent ?? 0), color: 'var(--success)' },
          { icon: Package, label: 'Items Bought', value: analytics?.total_items_bought ?? 0, color: 'var(--secondary)' },
          analytics?.most_bought_category && { icon: Tag, label: 'Top Category', value: analytics.most_bought_category, color: 'var(--accent)' },
        ].filter(Boolean).map((s, i) => (
          <div key={i} className="card" style={{ borderTop: `4px solid ${s.color}`, flex: 1, minWidth: 0, transition: 'none', transform: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ background: `${s.color}18`, borderRadius: '8px', padding: '0.5rem', display: 'flex' }}><s.icon size={20} color={s.color} /></div>
              <span style={{ color: 'var(--muted)', fontSize: '0.82rem', fontWeight: 500 }}>{s.label}</span>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.5px' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontWeight: 700 }}>Order History</h3>
        <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">
          <ShoppingBag size={48} color="var(--muted)" />
          <h3 style={{ margin: '0.5rem 0 0.25rem', fontWeight: 700 }}>No orders yet</h3>
          <p style={{ color: 'var(--muted)', margin: '0 0 1rem', fontSize: '0.9rem' }}>Start shopping to see your order history here.</p>
          <Link to="/"><button style={{ margin: '0 auto' }}>Browse Products</button></Link>
        </div>
      ) : (
        orders.map(order => <OrderCard key={order.order_id} order={order} onReorderDone={refreshCartCount} />)
      )}
    </div>
  );
};

/* ════════════════════════════════════════
   Tab: Wishlist
   ════════════════════════════════════════ */
const WishlistTab = ({ userId }) => {
  const { refreshCartCount } = useCart();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState(null);

  const fetchWishlist = useCallback(async () => {
    try {
      const data = await wishlistService.getWishlist(userId);
      setItems(data);
    } catch { }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

  const handleRemove = async (productId) => {
    try {
      await wishlistService.removeFromWishlist(userId, productId);
      setItems(prev => prev.filter(i => i.product_id !== productId));
      toast('Removed from wishlist', { icon: '🗑️' });
    } catch { }
  };

  const handleMoveToCart = async (productId) => {
    setMovingId(productId);
    try {
      await cartService.addToCart(productId, 1);
      await wishlistService.removeFromWishlist(userId, productId);
      setItems(prev => prev.filter(i => i.product_id !== productId));
      refreshCartCount();
      toast.success('Moved to cart');
    } catch {
      toast.error('Failed to move to cart');
    }
    setMovingId(null);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 className="animate-spin" size={32} color="var(--primary)" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ margin: 0, fontWeight: 700 }}>My Wishlist</h3>
        <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <Heart size={48} color="var(--muted)" />
          <h3 style={{ margin: '0.5rem 0 0.25rem', fontWeight: 700 }}>Your wishlist is empty</h3>
          <p style={{ color: 'var(--muted)', margin: '0 0 1rem', fontSize: '0.9rem' }}>Save items you love to find them easily later.</p>
          <Link to="/"><button style={{ margin: '0 auto' }}>Browse Products</button></Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {items.map(item => {
            const p = item.product;
            if (!p) return null;
            return (
              <div key={item.id} className="card product-card" style={{ padding: 0, overflow: 'hidden' }}>
                <Link to={`/product/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ width: '100%', height: '180px', background: '#f3f4f6', overflow: 'hidden' }}>
                    {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={32} color="var(--muted)" /></div>}
                  </div>
                  <div style={{ padding: '0.75rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--primary)', marginTop: '0.25rem' }}>{formatPrice(p.current_price)}</div>
                    {p.stock === 0 && <span className="badge badge-danger" style={{ marginTop: '0.35rem' }}>Out of Stock</span>}
                  </div>
                </Link>
                <div style={{ display: 'flex', gap: '0.5rem', padding: '0 0.75rem 0.75rem' }}>
                  <button onClick={() => handleMoveToCart(p.id)} disabled={movingId === p.id || p.stock === 0} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.4rem' }}>
                    {movingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />} Move to Cart
                  </button>
                  <button onClick={() => handleRemove(p.id)} style={{ background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════
   Main Profile Page with Tabs
   ════════════════════════════════════════ */
const TABS = [
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'account', label: 'Account', icon: Settings },
];

const ProfilePage = () => {
  const { user, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('orders');

  if (!user) return null;

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto' }}>
      {/* User Header */}
      <div className="card" style={{ marginBottom: '1.5rem', flexDirection: 'row', alignItems: 'center', gap: '1.5rem', padding: '1.5rem', transition: 'none', transform: 'none' }}>
        <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', borderRadius: '50%', width: '72px', height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <UserCircle size={40} color="white" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem' }}>{user?.name || user?.email?.split('@')[0]}</h2>
          <div style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{user?.email}</div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
            <span className="badge badge-info">{user?.role?.toUpperCase()}</span>
            <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>Member since {formatDate(user?.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', background: 'var(--card)', borderRadius: '12px', padding: '0.35rem', border: '1px solid var(--border)' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1rem',
              fontSize: '0.88rem',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.id ? 'white' : 'var(--muted)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'orders' && <OrdersTab userId={user.id} />}
      {activeTab === 'addresses' && <AddressTab userId={user.id} />}
      {activeTab === 'wishlist' && <WishlistTab userId={user.id} />}
      {activeTab === 'account' && <AccountTab user={user} onProfileUpdated={refreshProfile} />}
    </div>
  );
};

export default ProfilePage;
