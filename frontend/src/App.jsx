import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Staff from './pages/Staff';
import MyShift from './pages/MyShift';
import AdminShifts from './pages/AdminShifts';

function AdminOnly({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/pos" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<MainLayout />}>
            <Route index element={<Navigate to="/pos" replace />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/my-shift" element={<MyShift />} />
            <Route path="/dashboard" element={<AdminOnly><Dashboard /></AdminOnly>} />
            <Route path="/products" element={<AdminOnly><Products /></AdminOnly>} />
            <Route path="/inventory" element={<AdminOnly><Inventory /></AdminOnly>} />
            <Route path="/staff" element={<AdminOnly><Staff /></AdminOnly>} />
            <Route path="/shifts" element={<AdminOnly><AdminShifts /></AdminOnly>} />
          </Route>
          <Route path="*" element={<Navigate to="/pos" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
