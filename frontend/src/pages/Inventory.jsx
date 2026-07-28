import { useEffect, useMemo, useState } from 'react';
import { addStock, getInventoryHistory, getProducts } from '../api/products';
import '../components/common/Modal.css';
import './Inventory.css';

const MOVEMENT_LABELS = {
  stock_in: { label: 'Nhập kho', className: 'badge-green', sign: '+' },
  sale: { label: 'Bán hàng', className: 'badge-red', sign: '−' },
  order_cancel: { label: 'Hoàn kho', className: 'badge-yellow', sign: '+' },
};

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [historyType, setHistoryType] = useState('');
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadProducts = () =>
    getProducts(false).then((response) => setProducts(response.data));

  const loadHistory = () => {
    setHistoryLoading(true);
    return getInventoryHistory({ limit: 200 })
      .then((response) => setHistory(response.data))
      .finally(() => setHistoryLoading(false));
  };

  useEffect(() => {
    loadProducts().catch(console.error);
    getInventoryHistory({ limit: 200 })
      .then((response) => setHistory(response.data))
      .catch(console.error)
      .finally(() => setHistoryLoading(false));
  }, []);

  const filtered = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredHistory = useMemo(
    () =>
      history.filter((movement) => {
        const matchesType = !historyType || movement.type === historyType;
        const matchesSearch = movement.product?.name
          ?.toLowerCase()
          .includes(search.toLowerCase());
        return matchesType && matchesSearch;
      }),
    [history, historyType, search],
  );

  const openAddStock = (product) => {
    setSelected(product);
    setQuantity('');
    setNote('');
    setError('');
  };

  const handleAddStock = async (event) => {
    event.preventDefault();
    const qty = Number.parseInt(quantity, 10);
    if (!qty || qty < 1) {
      setError('Số lượng phải lớn hơn 0');
      return;
    }

    setLoading(true);
    try {
      await addStock(selected.id, qty, note.trim() || undefined);
      setSelected(null);
      await Promise.all([loadProducts(), loadHistory()]);
    } catch (requestError) {
      const message = requestError.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || 'Nhập kho thất bại');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (number) => new Intl.NumberFormat('vi-VN').format(number);
  const fmtDate = (date) => new Date(date).toLocaleString('vi-VN');

  return (
    <div>
      <div className="page-header">
        <h1>Quản lý kho hàng</h1>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <div className="search-bar">
            <span>🔍</span>
            <input
              placeholder="Tìm sản phẩm..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="inv-legend">
            <span className="badge badge-red">Dưới 10</span>
            <span className="badge badge-yellow">10 - 20</span>
            <span className="badge badge-green">Đủ hàng</span>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Danh mục</th>
                <th>Tồn kho</th>
                <th>Giá vốn</th>
                <th>Giá trị tồn</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="empty-state">Không có sản phẩm</td></tr>
              )}
              {filtered.map((product) => (
                <tr key={product.id}>
                  <td style={{ fontWeight: 600 }}>{product.name}</td>
                  <td>{product.category?.name || '-'}</td>
                  <td>
                    <span className={`badge ${product.stock < 10 ? 'badge-red' : product.stock < 20 ? 'badge-yellow' : 'badge-green'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td>{fmt(product.costPrice)} đ</td>
                  <td>{fmt(product.stock * product.costPrice)} đ</td>
                  <td>
                    <button className="btn-add-stock" onClick={() => openAddStock(product)}>
                      + Nhập kho
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card inventory-history-card">
        <div className="history-header">
          <div>
            <h2 className="section-title">Lịch sử biến động kho</h2>
            <p>Hiển thị 200 giao dịch gần nhất</p>
          </div>
          <select value={historyType} onChange={(event) => setHistoryType(event.target.value)}>
            <option value="">Tất cả loại giao dịch</option>
            <option value="stock_in">Nhập kho</option>
            <option value="sale">Bán hàng</option>
            <option value="order_cancel">Hoàn kho</option>
          </select>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Sản phẩm</th>
                <th>Loại</th>
                <th>Số lượng</th>
                <th>Tồn trước → sau</th>
                <th>Người thực hiện</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {historyLoading && (
                <tr><td colSpan={7} className="empty-state">Đang tải lịch sử...</td></tr>
              )}
              {!historyLoading && filteredHistory.length === 0 && (
                <tr><td colSpan={7} className="empty-state">Chưa có lịch sử biến động kho</td></tr>
              )}
              {!historyLoading && filteredHistory.map((movement) => {
                const type = MOVEMENT_LABELS[movement.type] || {
                  label: movement.type,
                  className: '',
                  sign: '',
                };
                return (
                  <tr key={movement.id}>
                    <td>{fmtDate(movement.createdAt)}</td>
                    <td style={{ fontWeight: 600 }}>{movement.product?.name || `SP #${movement.productId}`}</td>
                    <td><span className={`badge ${type.className}`}>{type.label}</span></td>
                    <td className={`movement-qty ${movement.type === 'sale' ? 'out' : 'in'}`}>
                      {type.sign}{fmt(movement.quantity)}
                    </td>
                    <td>{fmt(movement.stockBefore)} → {fmt(movement.stockAfter)}</td>
                    <td>{movement.user?.name || '-'}</td>
                    <td>{movement.note || (movement.referenceId ? `Hóa đơn #${movement.referenceId}` : '-')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-box" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>📦 Nhập kho</h3>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <p className="stock-product-summary">
              Sản phẩm: <strong>{selected.name}</strong> — Tồn hiện tại: <strong>{selected.stock}</strong>
            </p>
            <form onSubmit={handleAddStock}>
              <div className="form-group">
                <label>Số lượng nhập thêm</label>
                <input
                  type="number"
                  min="1"
                  max="1000000"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="form-group">
                <label>Ghi chú</label>
                <input
                  type="text"
                  maxLength="255"
                  placeholder="Ví dụ: Nhập hàng từ nhà cung cấp A"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </div>
              {error && <div className="form-error">{error}</div>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setSelected(null)}>Hủy</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Đang lưu...' : 'Xác nhận nhập kho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
