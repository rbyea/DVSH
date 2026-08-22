import { Outlet } from 'react-router-dom';

import { CookieConsentBanner } from '@/widgets/CookieConsentBanner';

export function RootLayout() {
  return (
    <>
      <Outlet />
      <CookieConsentBanner />
    </>
  );
}
