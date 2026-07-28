import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './MainLayout.css';

export default function MainLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="main-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
