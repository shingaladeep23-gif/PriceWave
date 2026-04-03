import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { adminService } from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import {
  TrendingUp, Users, ShoppingCart, RefreshCcw,
  Loader2, ArrowUpRight, Package, X, AlertTriangle,
  Boxes, RotateCcw,
} from 'lucide-react';

const formatPrice = (price) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(price || 0);

const EMPTY_OVERVIEW = {
  total_clicks: 0, total_purchases: 0, total_add_to_cart: 0,
  total_revenue: 0, conversion_rate: 0,
  low_stock_count: 0, out_of_stock_count: 0,
};

/* ── Stock badge helper ── */
const StockBadge = ({ stock }) => {
  if (stock === 0)   return <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>OUT OF STOCK</span>;
  if (stock < 5)     return <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>CRITICAL · {stock}</span>;
  if (stock < 10)    return <span style={{ background: '#fef9c3', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>LOW · {stock}</span>;
  return <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>{stock}</span>;
};

const Dashboard = () => {
  const { user } = useAuth();
  const { lastMessage, connected } = useWebSocket();
  const [stats, setStats] = useState([]);
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [traffic, setTraffic] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [restocking, setRestocking] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [explainProduct, setExplainProduct] = useState(null);
  const [error, setError] = useState(null);
  const [restockMsg, setRestockMsg] = useState('');
  const [flashIds, setFlashIds] = useState(new Set());

  const loadData = useCallback(async () => {
    try {
      const [productStats, overviewData, trafficData] = await Promise.all([
        adminService.getStats(),
        adminService.getOverview(),
        adminService.getTraffic(),
      ]);
      setStats(productStats);
      setOverview(overviewData);
      setTraffic(trafficData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data. Retrying…');
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    loadData();
  }, [user, loadData]);

  // WebSocket-driven live updates (replaces polling)
  useEffect(() => {
    if (!lastMessage || !user || user.role !== 'admin') return;
    const msg = lastMessage;

    if (msg.type === 'price_update') {
      // Apply price updates inline and flash the rows
      const updatedIds = new Set(msg.updates.map(u => u.product_id));
      setStats(prev => prev.map(s => {
        const update = msg.updates.find(u => u.product_id === s.product_id);
        return update ? { ...s, current_price: update.new_price } : s;
      }));
      setFlashIds(updatedIds);
      setTimeout(() => setFlashIds(new Set()), 1500);
      setLastUpdated(new Date());
    }

    if (msg.type === 'product_click' || msg.type === 'cart_update' || msg.type === 'purchase_completed') {
      // Refresh full dashboard data on activity events
      loadData();
    }

    if (msg.type === 'inventory_update') {
      // Refresh to pick up new stock levels
      loadData();
    }
  }, [lastMessage, user, loadData]);

  // Fallback: poll every 30s only when WebSocket is disconnected
  useEffect(() => {
    if (!user || user.role !== 'admin' || connected) return;
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [user, connected, loadData]);

  useEffect(() => {
    if (!explainProduct) return;
    const onKey = (e) => { if (e.key === 'Escape') setExplainProduct(null); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [explainProduct]);

  const handleRecalculate = async () => {
    setUpdating(true);
    try { await adminService.recalculatePrices(); await loadData(); }
    catch (err) { console.error('Recalculate failed:', err); }
    finally { setUpdating(false); }
  };

  const handleRestock = async () => {
    setRestocking(true);
    setRestockMsg('');
    try {
      const res = await adminService.restockInventory();
      setRestockMsg(`Restocked ${res.restocked_count} products.`);
      await loadData();
      setTimeout(() => setRestockMsg(''), 4000);
    } catch (err) {
      setRestockMsg('Restock failed.');
      setTimeout(() => setRestockMsg(''), 4000);
    } finally { setRestocking(false); }
  };

  const showExplanation = async (productId) => {
    try { setExplainProduct(await adminService.explainPricing(productId)); }
    catch (err) { console.error('Explain failed:', err); }
  };

  const criticalItems = stats.filter(s => s.stock < 5);

  if (loading && stats.length === 0) {
    return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}><Loader2 className="animate-spin" size={48} /></div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Live Production Dashboard</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            <span style={{ color: connected ? 'var(--success)' : '#f59e0b' }}>{connected ? '● Live' : '○ Reconnecting…'}</span> · Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {restockMsg && <span style={{ fontSize: '0.82rem', color: restockMsg.includes('failed') ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>{restockMsg}</span>}
          <button
            onClick={handleRestock}
            disabled={restocking}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: restocking ? 'var(--muted)' : '#16a34a' }}
          >
            {restocking ? <Loader2 className="animate-spin" size={18} /> : <Boxes size={18} />}
            Restock All
          </button>
          <button
            onClick={handleRecalculate}
            disabled={updating}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: updating ? 'var(--muted)' : 'var(--primary)' }}
          >
            {updating ? <Loader2 className="animate-spin" size={18} /> : <RefreshCcw size={18} />}
            Recalculate Prices
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', color: 'var(--danger)', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Critical Stock Alert */}
      {criticalItems.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: '0.35rem' }}>
              Critical Stock Warning — {criticalItems.length} product{criticalItems.length > 1 ? 's' : ''} need attention
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {criticalItems.map(item => (
                <span key={item.product_id} style={{ background: 'white', border: '1px solid #fca5a5', borderRadius: '6px', padding: '2px 10px', fontSize: '0.8rem', color: '#7f1d1d' }}>
                  {item.name} — {item.stock === 0 ? 'OUT OF STOCK' : `${item.stock} left`}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Inventory Summary Strip */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Low Stock', value: overview.low_stock_count ?? 0, color: '#f59e0b', bg: '#fef9c3' },
          { label: 'Out of Stock', value: overview.out_of_stock_count ?? 0, color: '#dc2626', bg: '#fee2e2' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${color}30`, borderRadius: '8px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={16} color={color} />
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color }}>{value} {label}</span>
          </div>
        ))}
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <Users color="var(--primary)" />
            <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>Total Clicks</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{overview.total_clicks}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <ShoppingCart color="var(--accent)" />
            <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>Purchases</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{overview.total_purchases}</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <TrendingUp color="var(--secondary)" />
            <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>Conversion</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{overview.conversion_rate}%</div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <Package color="var(--success)" />
            <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>Revenue</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{formatPrice(overview.total_revenue)}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
        <div className="card" style={{ height: '400px' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Live Traffic (Last 30 Mins)</h3>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={traffic}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="time" stroke="var(--muted)" />
              <YAxis stroke="var(--muted)" allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)' }} />
              <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ height: '400px' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Top Products by Clicks</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={stats.slice(0, 5)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis dataKey="name" type="category" stroke="var(--muted)" width={100} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)' }} />
              <Bar dataKey="clicks" fill="var(--secondary)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Product Table */}
      <div className="card">
        <h3 style={{ marginBottom: '1.5rem' }}>Real-Time Pricing, Demand & Inventory</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '1rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>Product</th>
                <th style={{ padding: '1rem', color: 'var(--muted)' }}>Clicks</th>
                <th style={{ padding: '1rem', color: 'var(--muted)' }}>Purchases</th>
                <th style={{ padding: '1rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>Demand</th>
                <th style={{ padding: '1rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>Stock</th>
                <th style={{ padding: '1rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>Current Price</th>
                <th style={{ padding: '1rem', color: 'var(--muted)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {stats.slice(0, 10).map((item) => {
                const isFlashing = flashIds.has(item.product_id);
                const rowBg = isFlashing
                  ? 'rgba(37,99,235,0.12)'
                  : item.stock === 0
                  ? 'rgba(220,38,38,0.05)'
                  : item.stock < 5
                  ? 'rgba(245,158,11,0.06)'
                  : 'transparent';
                return (
                  <tr key={item.product_id} style={{ borderBottom: '1px solid var(--border)', background: rowBg }}>
                    <td style={{ padding: '1rem', fontWeight: '500', transition: 'background 0.5s' }}>{item.name}</td>
                    <td style={{ padding: '1rem', transition: 'background 0.5s' }}>{item.clicks}</td>
                    <td style={{ padding: '1rem' }}>{item.purchases ?? 0}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '50px', height: '7px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(item.demand_score, 100)}%`, height: '100%', background: 'var(--accent)' }} />
                        </div>
                        <span style={{ fontSize: '0.8rem' }}>{item.demand_score}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <StockBadge stock={item.stock} />
                      {item.stock_factor !== 0 && (
                        <div style={{ fontSize: '0.7rem', color: item.stock_factor > 0 ? 'var(--danger)' : 'var(--success)', marginTop: '2px' }}>
                          {item.stock_factor > 0 ? `+${item.stock_factor}%` : `${item.stock_factor}%`} price adj.
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {formatPrice(item.current_price)}
                        {item.current_price > item.base_price && <ArrowUpRight size={14} color="var(--danger)" />}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <button
                        onClick={() => showExplanation(item.product_id)}
                        style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Explain
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Explain Pricing Modal */}
      {explainProduct && (
        <div
          onClick={() => setExplainProduct(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '540px', maxWidth: '92vw', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <button onClick={() => setExplainProduct(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)' }} aria-label="Close">
              <X size={20} />
            </button>

            <h2 style={{ marginBottom: '0.25rem' }}>Price Logic Breakdown</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.95rem', marginBottom: '1.5rem', fontWeight: 600 }}>{explainProduct.name}</p>

            {/* Pricing formula */}
            <div style={{ background: '#f8fafc', border: '1px solid var(--border)', padding: '1.25rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
              <Row label="Base Price" value={formatPrice(explainProduct.base_price)} />
              <Row label="Demand Factor" value={`+${(explainProduct.demand_factor * 100).toFixed(1)}%`} color="var(--accent)" />
              <Row
                label="Stock Factor"
                value={explainProduct.stock_factor >= 0
                  ? `+${(explainProduct.stock_factor * 100).toFixed(1)}%`
                  : `${(explainProduct.stock_factor * 100).toFixed(1)}%`}
                color={explainProduct.stock_factor > 0 ? 'var(--danger)' : 'var(--success)'}
              />
              <Row label="Decay Factor" value={`−${(explainProduct.decay_factor * 100).toFixed(1)}%`} color="var(--muted)" />
              <Row label="Combined Multiplier" value={`× ${explainProduct.multiplier}`} color="var(--secondary)" />
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem' }}>
                <span style={{ fontWeight: 700 }}>Current Price</span>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{formatPrice(explainProduct.current_price)}</span>
              </div>
            </div>

            {/* Stock + event stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <StatBox label="Stock Remaining" value={explainProduct.stock} color={explainProduct.stock === 0 ? 'var(--danger)' : explainProduct.stock < 10 ? '#f59e0b' : 'var(--success)'} />
              <StatBox label="Stock Adj." value={`${explainProduct.stock_factor_pct >= 0 ? '+' : ''}${explainProduct.stock_factor_pct}%`} color={explainProduct.stock_factor > 0 ? 'var(--danger)' : 'var(--success)'} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <StatBox label="Views" value={explainProduct.views ?? 0} />
              <StatBox label="Add to Cart" value={explainProduct.add_to_cart ?? 0} />
              <StatBox label="Purchases" value={explainProduct.purchases ?? 0} />
            </div>

            <div style={{ padding: '0.9rem', border: '1px dashed var(--border)', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6 }}>
              price = base × (1 + <strong>{explainProduct.demand_factor}</strong> [demand] + <strong>{explainProduct.stock_factor}</strong> [stock] − <strong>{explainProduct.decay_factor}</strong> [decay])
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Row = ({ label, value, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
    <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{label}</span>
    <span style={{ fontWeight: 600, color: color || 'var(--text)', fontSize: '0.875rem' }}>{value}</span>
  </div>
);

const StatBox = ({ label, value, color }) => (
  <div style={{ textAlign: 'center', background: '#f8fafc', border: '1px solid var(--border)', padding: '0.75rem', borderRadius: '8px' }}>
    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: color || 'var(--text)' }}>{value}</div>
    <div style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: '2px' }}>{label}</div>
  </div>
);

export default Dashboard;
