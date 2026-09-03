import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./auth-context";
import { AuthLoadingState } from "./AuthLoadingState";

export function ProtectedRoute(): React.JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoadingState />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute(): React.JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <AuthLoadingState />;
  }

  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <Outlet />;
}
