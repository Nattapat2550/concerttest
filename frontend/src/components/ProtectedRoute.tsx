import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { checkAuthStatus } from "../store/slices/authSlice";

// 1. กำหนด Interface สำหรับ Props
interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[]; // ใส่ ? เพื่อบอกว่ามีหรือไม่มีก็ได้
}

const ProtectedRoute = ({ children, roles }: ProtectedRouteProps) => {
  const dispatch = useDispatch<any>(); // ใส่ <any> หรือ AppDispatch เพื่อแก้ Error ทริกเกอร์ Thunk
  const location = useLocation();

  // ใส่ type any ให้ state ก่อนในเบื้องต้น
  const { isAuthenticated, role, status } = useSelector((state: any) => state.auth);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(checkAuthStatus());
    }
  }, [status, dispatch]);

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="page-loading">
        กำลังตรวจสอบสิทธิ์การเข้าถึง...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && roles.length > 0 && !roles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;