import { Navigate, Outlet } from 'react-router-dom';

import { hasAccessToken } from '@/shared/lib/auth';

export function RedirectIfAuthenticated() {
  if (hasAccessToken()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
