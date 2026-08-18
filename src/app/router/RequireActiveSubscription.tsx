import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAppSelector } from '@/app/store';
import { isSubscriptionBlocked } from '@/entities/session';

export function RequireActiveSubscription() {
  const user = useAppSelector((state) => state.session.user);
  const location = useLocation();

  if (isSubscriptionBlocked(user) && location.pathname !== '/billing') {
    return <Navigate replace to="/billing" />;
  }

  return <Outlet />;
}
