import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { productService, cartService, wishlistService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { ShoppingCart, ArrowLeft, Loader2, CheckCircle, Package, Tag, AlertTriangle, Heart } from 'lucide-react';
import { formatPrice } from '../../utils/format';

const DEFAULT_IMG = 'https://picsum.photos/seed/product-default/400/300';

/* ── Stock status display ── */
const StockStatus = ({ stock }) => {
  if (stock === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', color: '#dc2626' }}>
      <AlertTriangle size={20} />
      <span style={{ fontWeight: 700 }}>Out of Stock — currently unavailable</span>
    </div>
  );
  if (stock < 2) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', color: '#dc2626' }}>
      <Package size={20} />
      <span style={{ fontWeight: 700 }}>Only {stock} left — order soon!</span>
    </div>
  );
  if (stock < 5) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', color: '#d97706' }}>
      <Package size={20} />
      <span style={{ fontWeight: 600 }}>Only {stock} left in stock — hurry!</span>
    </div>
  );
  if (stock < 10) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', color: '#d97706' }}>
      <Package size={20} />
      <span style={{ fontWeight: 500 }}>Only {stock} left in stock</span>
    </div>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', color: 'var(--success)' }}>
      <Package size={20} />
      <span>{stock} in stock — Ready to ship</span>
    </div>
  );
};

const ProductDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { lastMessage } = useWebSocket();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [cartError, setCartError] = useState('');
  const [priceFlash, setPriceFlash] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishLoading, setWishLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const prod = await productService.getProduct(id);
        setProduct(prod);
        const rel = await productService.getProducts(prod.category);
        setRelated(rel.filter(p => p.id !== parseInt(id)).slice(0, 4));
      } catch (err) {
        console.error('Failed to fetch product detail', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Check if product is in wishlist
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const wl = await wishlistService.getWishlist(user.id);
        setWishlisted(wl.some(item => item.product_id === parseInt(id)));
      } catch { }
    })();
  }, [user, id]);

  const toggleWishlist = async () => {
    if (!user) return;
    setWishLoading(true);
    try {
      if (wishlisted) {
        await wishlistService.removeFromWishlist(user.id, parseInt(id));
        setWishlisted(false);
      } else {
        await wishlistService.addToWishlist(user.id, parseInt(id));
        setWishlisted(true);
      }
    } catch { }
    setWishLoading(false);
  };

  // Live price updates via WebSocket
  useEffect(() => {
    if (!lastMessage || !product) return;
    const msg = lastMessage;

    if (msg.type === 'price_update' && msg.updates) {
      const update = msg.updates.find(u => u.product_id === product.id);
      if (update) {
        setProduct(prev => ({ ...prev, current_price: update.new_price }));
        setPriceFlash(true);
        setTimeout(() => setPriceFlash(false), 1500);
      }
      setRelated(prev => prev.map(p => {
        const relUpdate = msg.updates.find(u => u.product_id === p.id);
        return relUpdate ? { ...p, current_price: relUpdate.new_price } : p;
      }));
    }

    if (msg.type === 'inventory_update' && msg.restocked) {
      const restock = msg.restocked.find(r => r.product_id === product.id);
      if (restock) {
        setProduct(prev => ({ ...prev, stock: restock.new_stock }));
      }
      setRelated(prev => prev.map(p => {
        const relRestock = msg.restocked.find(r => r.product_id === p.id);
        return relRestock ? { ...p, stock: relRestock.new_stock } : p;
      }));
    }
  }, [lastMessage, product?.id]);

  const handleAddToCart = async () => {
    if (!product || product.stock === 0) return;
    setAdding(true);
    setCartError('');
    try {
      await cartService.addToCart(product.id, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    } catch (err) {
      setCartError(err.message || 'Failed to add to cart.');
    } finally {
      setAdding(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
      <Loader2 className="animate-spin" size={48} />
    </div>
  );
  if (!product) return <div>Product not found</div>;

  const isOOS = product.stock === 0;
  const isPriceDrop = product.current_price < product.base_price;
  const isPriceUp   = product.current_price > product.base_price;
  const discount    = isPriceDrop ? Math.round(((product.base_price - product.current_price) / product.base_price) * 100) : 0;
  const markup      = isPriceUp   ? Math.round(((product.current_price - product.base_price) / product.base_price) * 100) : 0;

  return (
    <div>
      <Link to="/" className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', width: 'fit-content' }}>
        <ArrowLeft size={20} /> Back to Products
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', marginBottom: '4rem' }}>
        {/* Image */}
        <div style={{ position: 'relative' }}>
          <img
            src={product.image_url || DEFAULT_IMG}
            alt={product.name}
            style={{ width: '100%', borderRadius: '16px', objectFit: 'cover', maxHeight: '420px', display: 'block', opacity: isOOS ? 0.6 : 1 }}
          />
          {isOOS && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', background: 'rgba(0,0,0,0.35)' }}>
              <span style={{ background: '#dc2626', color: 'white', padding: '0.5rem 1.25rem', borderRadius: '8px', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '1px' }}>OUT OF STOCK</span>
            </div>
          )}
          {!isOOS && product.stock < 5 && (
            <div style={{ position: 'absolute', top: '16px', left: '16px', background: '#f59e0b', color: 'white', padding: '4px 12px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem' }}>
              ONLY {product.stock} LEFT
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '1rem 0' }}>
          <span className="badge badge-success" style={{ marginBottom: '1rem', display: 'inline-block' }}>{product.category}</span>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem', lineHeight: '1.3' }}>{product.name}</h1>

          {/* Pricing */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '0.5rem' }}>
            <span style={{
              fontSize: '2rem', fontWeight: 'bold',
              color: isOOS ? 'var(--muted)' : priceFlash ? '#dc2626' : 'var(--primary)',
              transition: 'color 0.3s, transform 0.3s',
              transform: priceFlash ? 'scale(1.08)' : 'scale(1)',
              display: 'inline-block',
            }}>
              {formatPrice(product.current_price)}
            </span>
            {(isPriceDrop || isPriceUp) && (
              <span style={{ color: 'var(--muted)', textDecoration: 'line-through', fontSize: '1.1rem' }}>
                {formatPrice(product.base_price)}
              </span>
            )}
          </div>

          {isPriceDrop && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Tag size={15} color="var(--success)" />
              <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem' }}>
                {discount}% off — You save {formatPrice(product.base_price - product.current_price)}
              </span>
            </div>
          )}

          {isPriceUp && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <AlertTriangle size={15} color="#d97706" />
              <span style={{ color: '#d97706', fontWeight: 600, fontSize: '0.9rem' }}>
                {markup}% premium — High demand{product.stock < 10 ? ' + low stock' : ''}
              </span>
            </div>
          )}

          <p style={{ color: 'var(--muted)', fontSize: '1rem', lineHeight: '1.8', marginBottom: '2rem' }}>
            {product.description}
          </p>

          <StockStatus stock={product.stock} />

          {cartError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#dc2626', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} /> {cartError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handleAddToCart}
              disabled={isOOS || adding}
              style={{
                flex: 1, padding: '1rem', fontSize: '1.1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                background: isOOS ? '#9ca3af' : added ? 'var(--success)' : 'var(--primary)',
                cursor: isOOS ? 'not-allowed' : 'pointer',
                transition: 'background 0.3s',
              }}
            >
              {isOOS
                ? <><Package size={22} /> Out of Stock</>
                : adding
                ? <><Loader2 size={22} className="animate-spin" /> Adding…</>
                : added
                ? <><CheckCircle size={22} /> Added to Cart</>
                : <><ShoppingCart size={22} /> Add to Cart</>
              }
            </button>
            <button
              onClick={toggleWishlist}
              disabled={wishLoading}
              style={{
                padding: '1rem 1.25rem', fontSize: '1.1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: wishlisted ? '#fef2f2' : 'var(--card)',
                border: wishlisted ? '2px solid #dc2626' : '2px solid var(--border)',
                color: wishlisted ? '#dc2626' : 'var(--muted)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title={wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
            >
              <Heart size={22} fill={wishlisted ? '#dc2626' : 'none'} />
            </button>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section>
          <h2 style={{ marginBottom: '1.5rem' }}>Related Products</h2>
          <div className="grid">
            {related.map(item => (
              <Link to={`/product/${item.id}`} key={item.id} className="card" style={{ textDecoration: 'none', color: 'inherit', opacity: item.stock === 0 ? 0.65 : 1 }}>
                <div className="image-container">
                  <img src={item.image_url || DEFAULT_IMG} alt={item.name} />
                </div>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{item.name}</div>
                <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{formatPrice(item.current_price)}</div>
                {item.stock === 0 && <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 700, marginTop: '0.25rem' }}>Out of Stock</div>}
                {item.stock > 0 && item.stock < 5 && <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 700, marginTop: '0.25rem' }}>Only {item.stock} left!</div>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetail;
