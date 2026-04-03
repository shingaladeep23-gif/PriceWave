import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderService } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Loader2, Package, ArrowLeft, MapPin, XCircle,
  CheckCircle2, Truck, PackageCheck, CircleDot, FileText,
} from 'lucide-react';

const formatPrice = (price) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(price || 0);

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const STEPS = [
  { key: 'processing', label: 'Ordered', icon: PackageCheck },
  { key: 'shipped', label: 'Shipped', icon: Package },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
];

const STATUS_INDEX = { processing: 0, shipped: 1, out_for_delivery: 2, delivered: 3 };

const TrackingBar = ({ status }) => {
  if (status === 'cancelled') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.25rem', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca' }}>
        <XCircle size={28} color="#dc2626" />
        <div>
          <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '1rem' }}>Order Cancelled</div>
          <div style={{ fontSize: '0.82rem', color: '#991b1b' }}>This order has been cancelled and stock has been restored.</div>
        </div>
      </div>
    );
  }

  const currentIdx = STATUS_INDEX[status] ?? 0;

  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', padding: '0 0.5rem' }}>
      {/* Background line */}
      <div style={{ position: 'absolute', top: '20px', left: '40px', right: '40px', height: '4px', background: 'var(--border)', borderRadius: '2px', zIndex: 0 }} />
      {/* Active line */}
      <div style={{ position: 'absolute', top: '20px', left: '40px', width: `${(currentIdx / (STEPS.length - 1)) * (100 - 10)}%`, height: '4px', background: 'var(--success)', borderRadius: '2px', zIndex: 1, transition: 'width 0.5s ease' }} />

      {STEPS.map((step, idx) => {
        const done = idx <= currentIdx;
        const active = idx === currentIdx;
        const Icon = step.icon;
        return (
          <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1 }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: done ? 'var(--success)' : 'var(--card)',
              border: done ? 'none' : '2px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.3s',
              boxShadow: active ? '0 0 0 4px rgba(22,163,74,0.2)' : 'none',
            }}>
              <Icon size={18} color={done ? 'white' : 'var(--muted)'} />
            </div>
            <span style={{
              marginTop: '0.5rem', fontSize: '0.78rem', fontWeight: active ? 700 : 500,
              color: done ? 'var(--success)' : 'var(--muted)', textAlign: 'center',
            }}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const OrderDetailPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMsg, setCancelMsg] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await orderService.getOrderDetail(id);
        setOrder(data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load order');
      }
      setLoading(false);
    })();
  }, [id]);

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

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    setCancelMsg('');
    try {
      await orderService.cancelOrder(order.order_id);
      setOrder(prev => ({ ...prev, status: 'cancelled' }));
      setCancelMsg('Order cancelled successfully.');
    } catch (err) {
      setCancelMsg(err.response?.data?.detail || 'Failed to cancel');
    }
    setCancelling(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6rem' }}>
        <Loader2 className="animate-spin" size={40} color="var(--primary)" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '700px', margin: '2rem auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <p style={{ color: 'var(--danger)', fontWeight: 600 }}>{error}</p>
          <Link to="/profile" style={{ color: 'var(--primary)', fontWeight: 600 }}>Back to Profile</Link>
        </div>
      </div>
    );
  }

  const addr = order.delivery_address;

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      {/* Back link */}
      <Link to="/profile" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', marginBottom: '1.25rem' }}>
        <ArrowLeft size={18} /> Back to Orders
      </Link>

      {/* Order Header */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Order #{order.order_id}</h2>
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Placed on {formatDate(order.created_at)}</div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={handleDownloadInvoice}
              disabled={downloading}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: '0.85rem', padding: '0.45rem 1rem',
              }}
            >
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Download Invoice
            </button>
            {order.status === 'processing' && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  background: 'transparent', border: '1px solid var(--danger)',
                  color: 'var(--danger)', fontSize: '0.85rem', padding: '0.45rem 1rem',
                }}
              >
                {cancelling ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Cancel Order
              </button>
            )}
          </div>
        </div>
        {cancelMsg && (
          <div style={{ marginBottom: '1rem', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, background: cancelMsg.includes('success') ? '#f0fdf4' : '#fef2f2', color: cancelMsg.includes('success') ? 'var(--success)' : 'var(--danger)' }}>
            {cancelMsg}
          </div>
        )}

        {/* Tracking */}
        <TrackingBar status={order.status} />
      </div>

      {/* Delivery Address */}
      {addr && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <MapPin size={18} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Delivery Address</h3>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--text)' }}>{addr.name}</strong><br />
            {addr.address_line}<br />
            {addr.city}, {addr.state} — {addr.pincode}<br />
            Phone: {addr.phone}
          </div>
        </div>
      )}

      {/* Order Items */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>
          Items ({order.items.length})
        </h3>
        {order.items.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 0', borderBottom: idx < order.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <Link to={`/product/${item.product_id}`}>
              <div style={{ width: '72px', height: '72px', flexShrink: 0, borderRadius: '10px', overflow: 'hidden', background: '#f3f4f6' }}>
                {item.image_url ? (
                  <img src={item.image_url} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={28} color="var(--muted)" />
                  </div>
                )}
              </div>
            </Link>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link to={`/product/${item.product_id}`} style={{ textDecoration: 'none', color: 'var(--text)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.product_name}</div>
              </Link>
              <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                Qty: {item.quantity} &times; {formatPrice(item.price)}
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', flexShrink: 0 }}>
              {formatPrice(item.price * item.quantity)}
            </div>
          </div>
        ))}

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', paddingTop: '1.25rem', borderTop: '2px solid var(--border)', marginTop: '0.5rem' }}>
          <span style={{ fontSize: '1rem', fontWeight: 600 }}>Order Total:</span>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>{formatPrice(order.total_amount)}</span>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
