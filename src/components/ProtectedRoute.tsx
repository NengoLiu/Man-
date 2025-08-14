import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // 或者加载骨架
  if (!session) return <Navigate to="/auth" replace state={{ from: location }} />;
  return <>{children}</>;
};

export default ProtectedRoute;
