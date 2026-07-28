import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const adminMenu = [
  { path: '/dashboard', label: 'Tổng quan', icon: '📊' },
  { path: '/pos', label: 'Bán hàng', icon: '🛒' },
  { path: '/products', label: 'Sản phẩm', icon: '📦' },
  { path: '/inventory', label: 'Kho hàng', icon: '🏪' },
  { path: '/orders', label: 'Hóa đơn', icon: '🧾' },
  { path: '/staff', label: 'Nhân sự', icon: '👥' },
  { path: '/shifts', label: 'Quản lý ca', icon: '⏱️' },
];

const staffMenu = [
  { path: '/my-shift', label: 'Ca làm', icon: '⏱️' },
  { path: '/pos', label: 'Bán hàng', icon: '🛒' },
  { path: '/orders', label: 'Hóa đơn', icon: '🧾' },
];

export default function Sidebar() {
  const { user } = useAuth();
  const menu = user?.role === 'admin' ? adminMenu : staffMenu;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">🏪</span>
        <span className="logo-text">Cửa Hàng</span>
      </div>
      <nav className="sidebar-nav">
        {menu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
