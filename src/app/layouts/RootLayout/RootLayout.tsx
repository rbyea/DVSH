import { Outlet } from 'react-router-dom';

import { CookieConsentBanner } from '@/widgets/CookieConsentBanner';

import { ScrollToTop } from '../../router/ScrollToTop';

export function RootLayout() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
      <CookieConsentBanner />
    </>
  );
}
