import { useEffect, useState } from 'react';
import { getProducts } from '../api/products';
import { getCategories } from '../api/categories';
import { createOrder } from '../api/orders';
import { getCurrentShift } from '../api/shifts';
import { useAuth } from '../context/AuthContext';
import './POS.css';

export default function POS() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [activeShift, setActiveShift] = useState(null);

  useEffect(() => {
    getProducts(true).then((res) => setProducts(res.data)).catch(console.error);
    getCategories().then((res) => setCategories(res.data)).catch(console.error);
    if (user?.role === 'staff') {
      getCurrentShift().then((res) => setActiveShift(res.data)).catch(console.error);
    }
  }, [user?.role]);

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCat || String(p.categoryId) === String(selectedCat);
    return matchSearch && matchCat;
  });

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      if (product.stock < 1) return prev;
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const changeQty = (id, delta) => {
    setCart((prev) => prev
      .map((i) => i.id === id ? { ...i, qty: i.qty + delta } : i)
      .filter((i) => i.qty > 0)
    );
  };

  const removeItem = (id) => setCart((prev) => prev.filter((i) => i.id !== id));

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (user?.role === 'staff' && !activeShift) {
      alert('Bạn phải vào "Ca làm" và bắt đầu ca trước khi bán hàng');
      return;
    }
    const paid = paymentMethod === 'cash' ? Number(amountPaid) : total;
    if (paymentMethod === 'cash' && paid < total) {
      alert('Số tiền khách đưa chưa đủ thanh toán');
      return;
    }
    setLoading(true);
    try {
      const res = await createOrder({
        items: cart.map((i) => ({ productId: i.id, quantity: i.qty })),
        paymentMethod,
        amountPaid: paid,
        note: orderNote.trim() || undefined,
      });
      setLastOrder(res.data);
      setCart([]);
      setAmountPaid('');
      setOrderNote('');
    } catch (err) {
      alert(err.response?.data?.message || 'Thanh toán thất bại');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n);

  return (
    <div className="pos-layout">
      <div className="pos-products">
        {user?.role === 'staff' && !activeShift && (
          <div className="pos-shift-warning">⚠️ Chưa mở ca — hãy vào <strong>Ca làm</strong> trước khi bán hàng.</div>
        )}
        <div className="pos-filters">
          <div className="search-bar">
            <span>🔍</span>
            <input
              placeholder="Tìm sản phẩm theo tên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="cat-select"
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="product-grid">
          {filtered.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>Không tìm thấy sản phẩm</div>
          )}
          {filtered.map((p) => (
            <button
              key={p.id}
              className={`product-card ${p.stock < 1 ? 'out-of-stock' : ''}`}
              onClick={() => addToCart(p)}
              disabled={p.stock < 1}
            >
              <div className="product-card-name">{p.name}</div>
              <div className="product-card-cat">{p.category?.name}</div>
              <div className="product-card-price">{fmt(p.price)} đ</div>
              <div className={`product-card-stock ${p.stock < 10 ? 'low' : ''}`}>
                {p.stock < 1 ? 'Hết hàng' : `Còn ${p.stock}`}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="pos-cart">
        <h2 className="cart-title">🛒 Giỏ hàng</h2>

        {cart.length === 0 ? (
          <div className="cart-empty">Chưa có sản phẩm nào</div>
        ) : (
          <>
            <div className="cart-items">
              {cart.map((item) => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-price">{fmt(item.price)} đ</div>
                  <div className="cart-item-controls">
                    <button onClick={() => changeQty(item.id, -1)}>−</button>
                    <span>{item.qty}</span>
                    <button onClick={() => changeQty(item.id, 1)} disabled={item.qty >= item.stock}>+</button>
                  </div>
                  <div className="cart-item-total">{fmt(item.price * item.qty)} đ</div>
                  <button className="cart-item-remove" onClick={() => removeItem(item.id)}>✕</button>
                </div>
              ))}
            </div>

            <div className="cart-total">
              <span>Tổng cộng:</span>
              <strong>{fmt(total)} đ</strong>
            </div>

            <div className="payment-panel">
              <label>
                Phương thức thanh toán
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="cash">Tiền mặt</option>
                  <option value="transfer">Chuyển khoản</option>
                </select>
              </label>
              {paymentMethod === 'cash' && (
                <>
                  <label>
                    Tiền khách đưa
                    <input
                      type="number"
                      min={total}
                      step="1000"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder={fmt(total)}
                      required
                    />
                  </label>
                  <div className="change-preview">
                    Tiền thừa: <strong>{fmt(Math.max(Number(amountPaid || 0) - total, 0))} đ</strong>
                  </div>
                </>
              )}
              <label>
                Ghi chú
                <input
                  type="text"
                  maxLength="255"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Không bắt buộc"
                />
              </label>
            </div>

            <button
              className="checkout-btn"
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : '✅ Thanh toán'}
            </button>

            <button className="clear-cart-btn" onClick={() => setCart([])}>
              Xóa giỏ hàng
            </button>
          </>
        )}

        {lastOrder && (
          <div className="last-order">
            <p>✅ Hóa đơn #{lastOrder.id} đã tạo thành công!</p>
            <p>Tổng: {fmt(lastOrder.totalAmount)} đ</p>
            <p>{lastOrder.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}</p>
            <button onClick={() => setLastOrder(null)}>Đóng</button>
          </div>
        )}
      </div>
    </div>
  );
}
