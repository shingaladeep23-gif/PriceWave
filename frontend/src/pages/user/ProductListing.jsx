import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { productService, userService, cartService } from '../../services/api';
import { useWebSocket } from '../../context/WebSocketContext';
import { Search, ShoppingCart, Loader2, Flame, TrendingUp } from 'lucide-react';
import { formatPrice } from '../../utils/format';

const DEFAULT_IMG = 'https://picsum.photos/seed/product-default/400/300';

/* ── Stock label shown on each card ── */
const StockLabel = ({ stock }) => {
  if (stock === 0) return (
    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dc2626', marginTop: '0.35rem' }}>
      Out of Stock
    </div>
  );
  if (stock < 5) return (
    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dc2626', marginTop: '0.35rem' }}>
      Only {stock} left!
    </div>
  );
  if (stock < 10) return (
    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#d97706', marginTop: '0.35rem' }}>
      Only {stock} left
    </div>
  );
  return null;
};

const ProductListing = () => {
  const { lastMessage } = useWebSocket();
  const [products, setProducts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [cartErrors, setCartErrors] = useState({});   // productId → error string
  const [addingIds, setAddingIds] = useState(new Set()); // productId set for loading state
  const [priceFlashIds, setPriceFlashIds] = useState(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productList, recList] = await Promise.all([
          productService.getProducts(category),
          userService.getRecommendations(),
        ]);
        setProducts(productList.sort((a, b) => b.id - a.id));
        setRecommendations(recList);
      } catch (err) {
        console.error('Failed to fetch products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [category]);

  // Live price updates via WebSocket
  useEffect(() => {
    if (!lastMessage) return;
    const msg = lastMessage;

    if (msg.type === 'price_update' && msg.updates) {
      const updateMap = {};
      msg.updates.forEach(u => { updateMap[u.product_id] = u.new_price; });
      const updatedIds = new Set(Object.keys(updateMap).map(Number));

      setProducts(prev => prev.map(p =>
        updateMap[p.id] !== undefined ? { ...p, current_price: updateMap[p.id] } : p
      ));
      setRecommendations(prev => prev.map(p =>
        updateMap[p.id] !== undefined ? { ...p, current_price: updateMap[p.id] } : p
      ));

      setPriceFlashIds(updatedIds);
      setTimeout(() => setPriceFlashIds(new Set()), 1500);
    }

    if (msg.type === 'inventory_update' && msg.restocked) {
      const stockMap = {};
      msg.restocked.forEach(r => { stockMap[r.product_id] = r.new_stock; });
      setProducts(prev => prev.map(p =>
        stockMap[p.id] !== undefined ? { ...p, stock: stockMap[p.id] } : p
      ));
    }
  }, [lastMessage]);

  const handleAddToCart = async (productId) => {
    setAddingIds(prev => new Set(prev).add(productId));
    setCartErrors(prev => ({ ...prev, [productId]: '' }));
    try {
      await cartService.addToCart(productId, 1);
      // brief success flash handled by button state reset
    } catch (err) {
      setCartErrors(prev => ({ ...prev, [productId]: err.message }));
    } finally {
      setAddingIds(prev => { const n = new Set(prev); n.delete(productId); return n; });
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const trendingProducts = products.slice(0, 4);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div>

      {/* Trending */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
          <Flame color="#fbbf24" /> Trending Now
        </h2>
        <div className="grid">
          {trendingProducts.map(product => (
            <Link key={product.id} to={`/product/${product.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="image-container">
                <img src={product.image_url || DEFAULT_IMG} alt={product.name} />
              </div>
              <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{product.name}</div>
              <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{formatPrice(product.current_price)}</div>
              <StockLabel stock={product.stock} />
            </Link>
          ))}
        </div>
      </section>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
            <TrendingUp color="var(--primary)" /> Recommended for You
          </h2>
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {recommendations.slice(0, 6).map(product => (
              <Link key={product.id} to={`/product/${product.id}`} className="card" style={{ minWidth: '220px', textDecoration: 'none', color: 'inherit' }}>
                <div className="image-container">
                  <img src={product.image_url || DEFAULT_IMG} alt={product.name} />
                </div>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</div>
                <div style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>{formatPrice(product.current_price)}</div>
                <StockLabel stock={product.stock} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Catalog */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2>Product Catalog</h2>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input
                className="input"
                style={{ paddingLeft: '2rem', marginBottom: 0, width: '220px' }}
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input"
              style={{ width: '160px', marginBottom: 0 }}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="Electronics">Electronics</option>
              <option value="Clothing">Clothing</option>
              <option value="Home & Garden">Home & Garden</option>
              <option value="Beauty">Beauty</option>
              <option value="Sports">Sports</option>
              <option value="Books">Books</option>
              <option value="Toys">Toys</option>
            </select>
          </div>
        </div>

        <div className="grid">
          {filteredProducts.map(product => {
            const isOOS = product.stock === 0;
            const isPriceDrop = product.current_price < product.base_price;
            const isAdding = addingIds.has(product.id);
            const cartError = cartErrors[product.id];
            return (
              <div key={product.id} className="card" style={{ position: 'relative', opacity: isOOS ? 0.75 : 1, transition: 'box-shadow 0.4s', boxShadow: priceFlashIds.has(product.id) ? '0 0 12px rgba(37,99,235,0.4)' : undefined }}>
                {/* Badges */}
                {isOOS && (
                  <div style={{ position: 'absolute', top: '12px', left: '12px', background: '#dc2626', color: 'white', padding: '3px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, zIndex: 10 }}>
                    OUT OF STOCK
                  </div>
                )}
                {!isOOS && product.stock < 5 && (
                  <div style={{ position: 'absolute', top: '12px', left: '12px', background: '#f59e0b', color: 'white', padding: '3px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, zIndex: 10 }}>
                    ONLY {product.stock} LEFT
                  </div>
                )}
                {!isOOS && isPriceDrop && (
                  <div style={{ position: 'absolute', top: isOOS || product.stock < 5 ? '40px' : '12px', left: '12px', background: 'var(--success)', color: 'white', padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, zIndex: 10 }}>
                    SALE
                  </div>
                )}

                <Link
                  to={`/product/${product.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                  onClick={() => productService.recordClick(product.id)}
                >
                  <div className="image-container">
                    <img src={product.image_url || DEFAULT_IMG} alt={product.name} />
                  </div>
                  <h3 style={{ margin: '0 0 0.25rem', fontSize: '0.95rem' }}>{product.name}</h3>
                  <div>
                    <span style={{
                      color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.1rem',
                      transition: 'color 0.3s, transform 0.3s',
                      ...(priceFlashIds.has(product.id) ? { color: '#dc2626', transform: 'scale(1.1)', display: 'inline-block' } : {}),
                    }}>{formatPrice(product.current_price)}</span>
                    {isPriceDrop && (
                      <span style={{ textDecoration: 'line-through', color: 'var(--muted)', marginLeft: '0.5rem', fontSize: '0.85rem' }}>{formatPrice(product.base_price)}</span>
                    )}
                  </div>
                  <StockLabel stock={product.stock} />
                </Link>

                {cartError && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--danger)', background: '#fef2f2', padding: '4px 8px', borderRadius: '6px' }}>
                    {cartError}
                  </div>
                )}

                <button
                  disabled={isOOS || isAdding}
                  style={{
                    marginTop: '0.75rem', width: '100%',
                    background: isOOS ? '#9ca3af' : isAdding ? 'var(--muted)' : '#2563eb',
                    color: 'white', border: 'none', padding: '8px', borderRadius: '8px',
                    cursor: isOOS ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '6px', fontSize: '0.85rem',
                  }}
                  onClick={async (e) => { e.stopPropagation(); await handleAddToCart(product.id); }}
                >
                  {isAdding
                    ? <><Loader2 size={16} className="animate-spin" /> Adding…</>
                    : isOOS
                    ? 'Out of Stock'
                    : <><ShoppingCart size={16} /> Add to Cart</>
                  }
                </button>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
};

export default ProductListing;
