import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAppSelector } from '@/app/store';
import { isSubscriptionBlocked } from '@/entities/session';

export function RequireActiveSubscription() {
  const user = useAppSelector((state) => state.session.user);
  const location = useLocation();

  if (isSubscriptionBlocked(user)) {
    const onPaywall = location.pathname === '/station';

    if (!onPaywall) {
      return <Navigate replace to="/station#subscription" />;
    }
  }

  return <Outlet />;
}
