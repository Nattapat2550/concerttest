// src/components/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ redirectPath = '/login' }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }

  // ถ้าล็อกอินแล้ว ให้แสดงเนื้อหาของหน้านั้นๆ ได้
  return <Outlet />;
};

export default ProtectedRoute;