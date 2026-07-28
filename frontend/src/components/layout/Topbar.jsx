import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ChangePasswordModal from '../common/ChangePasswordModal';
import './Topbar.css';

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="topbar">
        <div className="topbar-title">
          {user?.role === 'admin' ? 'Hệ thống quản lý cửa hàng' : 'Bán hàng tại quầy'}
        </div>
        <div className="topbar-user">
          <button className="user-btn" onClick={() => setMenuOpen(!menuOpen)}>
            <span className="user-avatar">{user?.name?.charAt(0)}</span>
            <span className="user-name">{user?.name}</span>
            <span className="user-role-badge">{user?.role === 'admin' ? 'Quản lý' : 'Nhân viên'}</span>
            <span>▾</span>
          </button>
          {menuOpen && (
            <div className="user-dropdown">
              <button onClick={() => { setShowChangePw(true); setMenuOpen(false); }}>
                🔑 Đổi mật khẩu
              </button>
              <button onClick={handleLogout} className="logout-btn">
                🚪 Đăng xuất
              </button>
            </div>
          )}
        </div>
      </header>
      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
    </>
  );
}
