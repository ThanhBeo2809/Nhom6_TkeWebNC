import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as loginApi } from '../api/auth';
import ChangePasswordModal from '../components/common/ChangePasswordModal';
import './Login.css';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);

  useEffect(() => {
    if (user && !user.mustChangePassword) {
      navigate(user.role === 'admin' ? '/dashboard' : '/pos', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginApi(form);
      const { user: userData, token } = res.data;
      login(userData, token);
      if (userData.mustChangePassword) {
        setShowChangePw(true);
      } else {
        const target = userData.role === 'admin' ? '/dashboard' : '/pos';
        navigate(target, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Email hoặc mật khẩu không đúng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🏪</div>
        <h1 className="login-title">Cửa Hàng Tiện Lợi</h1>
        <p className="login-subtitle">Đăng nhập để tiếp tục</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="admin@cuahang.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Mật khẩu</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>

      {showChangePw && (
        <ChangePasswordModal
          required
          onClose={() => navigate(user?.role === 'admin' ? '/dashboard' : '/pos', { replace: true })}
        />
      )}
    </div>
  );
}
