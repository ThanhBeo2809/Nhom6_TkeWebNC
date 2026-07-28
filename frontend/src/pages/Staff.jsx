import { useEffect, useState } from 'react';
import { getUsers, createUser, toggleUser } from '../api/users';
import '../components/common/Modal.css';
import './Staff.css';

const EMPTY_FORM = { name: '', email: '' };

export default function Staff() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    getUsers().then((r) => setUsers(r.data)).catch(console.error);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await createUser(form);
      setShowModal(false);
      setForm(EMPTY_FORM);
      load();
      alert(
        `Đã tạo tài khoản ${response.data.email}.\n` +
        `Mật khẩu đăng nhập lần đầu: ${response.data.temporaryPassword}\n\n` +
        'Nhân viên phải đổi mật khẩu ngay sau khi đăng nhập.',
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Tạo thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleUser(id);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Thất bại');
    }
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('vi-VN');

  return (
    <div>
      <div className="page-header">
        <h1>Quản lý nhân sự</h1>
        <button className="btn-primary" onClick={() => { setForm(EMPTY_FORM); setError(''); setShowModal(true); }}>
          + Thêm nhân viên
        </button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tên nhân viên</th>
                <th>Email</th>
                <th>Ngày tạo</th>
                <th>Trạng thái</th>
                <th>Mật khẩu</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={6} className="empty-state">Chưa có nhân viên</td></tr>
              )}
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{fmtDate(u.createdAt)}</td>
                  <td>
                    <span className={`badge ${u.isActive ? 'badge-green' : 'badge-gray'}`}>
                      {u.isActive ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  <td>
                    {u.mustChangePassword && (
                      <span className="badge badge-yellow">Chưa đổi mật khẩu</span>
                    )}
                  </td>
                  <td>
                    <button
                      className={`toggle-btn ${u.isActive ? 'btn-lock' : 'btn-unlock'}`}
                      onClick={() => handleToggle(u.id)}
                    >
                      {u.isActive ? '🔒 Khóa' : '🔓 Mở khóa'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👤 Thêm nhân viên mới</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="staff-notice">
              Mật khẩu đăng nhập lần đầu là <strong>12345678</strong>. Nhân viên phải đổi mật khẩu ngay sau khi đăng nhập.
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Họ và tên</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  required
                />
              </div>
              <div className="form-group">
                <label>Email đăng nhập</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="nhanvien@cuahang.com"
                  required
                />
              </div>
              {error && <div className="form-error">{error}</div>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
