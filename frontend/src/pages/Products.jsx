import { useEffect, useState } from 'react';
import { getProducts, createProduct, updateProduct, toggleProduct } from '../api/products';
import { getCategories, createCategory } from '../api/categories';
import '../components/common/Modal.css';
import './Products.css';

const EMPTY_FORM = { name: '', price: '', costPrice: '', stock: '', categoryId: '', isActive: true };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState('products');
  const [catName, setCatName] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    getProducts(false).then((r) => setProducts(r.data)).catch(console.error);
    getCategories().then((r) => setCategories(r.data)).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = !catFilter || String(p.categoryId) === String(catFilter);
    return matchSearch && matchCat;
  });

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setError(''); setShowModal(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name, price: p.price, costPrice: p.costPrice, stock: p.stock, categoryId: p.categoryId, isActive: p.isActive });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        name: form.name,
        price: parseFloat(form.price),
        costPrice: parseFloat(form.costPrice),
        stock: parseInt(form.stock),
        categoryId: parseInt(form.categoryId),
        isActive: form.isActive,
      };
      if (editing) {
        await updateProduct(editing.id, payload);
      } else {
        await createProduct(payload);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Lưu thất bại');
    }
  };

  const handleToggle = async (id) => {
    await toggleProduct(id);
    load();
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!catName.trim()) return;
    try {
      await createCategory({ name: catName.trim() });
      setCatName('');
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi');
    }
  };

  const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n);

  return (
    <div>
      <div className="page-header">
        <h1>Quản lý sản phẩm</h1>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
          📦 Sản phẩm
        </button>
        <button className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>
          🏷️ Danh mục ({categories.length})
        </button>
      </div>

      {activeTab === 'products' && (
        <div className="card">
          <div className="table-toolbar">
            <div className="toolbar-left">
              <div className="search-bar">
                <span>🔍</span>
                <input
                  placeholder="Tìm theo tên..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select className="cat-select" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                <option value="">Tất cả danh mục</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button className="btn-primary" onClick={openAdd}>+ Thêm sản phẩm</button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Tên sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Giá bán</th>
                  <th>Giá vốn</th>
                  <th>Tồn kho</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="empty-state">Không có sản phẩm</td></tr>
                )}
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.category?.name || '-'}</td>
                    <td>{fmt(p.price)} đ</td>
                    <td>{fmt(p.costPrice)} đ</td>
                    <td>
                      <span className={`badge ${p.stock < 10 ? 'badge-yellow' : 'badge-green'}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${p.isActive ? 'badge-green' : 'badge-gray'}`}>
                        {p.isActive ? 'Đang bán' : 'Ngừng bán'}
                      </span>
                    </td>
                    <td>
                      <button className="icon-btn" onClick={() => openEdit(p)} title="Sửa">✏️</button>
                      <button
                        className="icon-btn"
                        onClick={() => handleToggle(p.id)}
                        title={p.isActive ? 'Ngừng bán' : 'Kích hoạt'}
                      >
                        {p.isActive ? '🔴' : '🟢'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="card">
          <form onSubmit={handleAddCategory} className="add-cat-form">
            <input
              placeholder="Tên danh mục mới..."
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
            />
            <button type="submit" className="btn-primary">+ Thêm</button>
          </form>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Tên danh mục</th>
                <th>Số sản phẩm</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 && (
                <tr><td colSpan={3} className="empty-state">Chưa có danh mục</td></tr>
              )}
              {categories.map((c, i) => (
                <tr key={c.id}>
                  <td>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>{products.filter((p) => p.categoryId === c.id).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Tên sản phẩm</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Giá bán (đ)</label>
                  <input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Giá vốn (đ)</label>
                  <input type="number" min="0" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Tồn kho ban đầu</label>
                  <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required disabled={!!editing} />
                </div>
                <div className="form-group">
                  <label>Danh mục</label>
                  <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              {error && <div className="form-error">{error}</div>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
