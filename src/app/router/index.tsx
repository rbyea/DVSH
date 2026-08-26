import { createBrowserRouter, redirect } from 'react-router-dom';

import { RepairCreateProvider } from '@/features/repair-order/create';
import { LoginPage, RegisterPage } from '@/pages/auth';
import { BillingPage } from '@/pages/BillingPage';
import { DashboardPage } from '@/pages/Dashboard';
import { OfferPage, PersonalDataConsentPage, PrivacyPolicyPage } from '@/pages/legal';
import { NotFoundPage } from '@/pages/NotFound';
import { PublicRepairPage } from '@/pages/PublicRepairPage';
import { StationProfilePage } from '@/pages/StationProfilePage';
import { RepairCreatePage } from '@/pages/RepairCreatePage';
import { RepairDetailsPage } from '@/pages/RepairDetailsPage';
import { hasAccessToken } from '@/shared/lib/auth';

import { MainLayout } from '../layouts/MainLayout';
import { RootLayout } from '../layouts/RootLayout';
import { RedirectIfAuthenticated } from './RedirectIfAuthenticated';
import { RequireActiveSubscription } from './RequireActiveSubscription';
import { RequireAuth } from './RequireAuth';

function redirectLegacyPublicRepair({ params }: { params: { publicToken?: string } }) {
  return redirect(`/public/vehicles/${params.publicToken ?? ''}`);
}

export const appRouter = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      {
        index: true,
        loader: () => redirect(hasAccessToken() ? '/dashboard' : '/login'),
      },
      {
        path: '/public/vehicles/:publicToken',
        Component: PublicRepairPage,
      },
      {
        path: '/public/repairs/:publicToken',
        loader: redirectLegacyPublicRepair,
      },
      {
        path: '/app/public/repairs/:publicToken',
        loader: redirectLegacyPublicRepair,
      },
      {
        path: '/legal/privacy',
        Component: PrivacyPolicyPage,
      },
      {
        path: '/legal/consent',
        Component: PersonalDataConsentPage,
      },
      {
        path: '/legal/offer',
        Component: OfferPage,
      },
      {
        element: <RedirectIfAuthenticated />,
        children: [
          {
            path: '/login',
            Component: LoginPage,
          },
          {
            path: '/register',
            Component: RegisterPage,
          },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            path: '/billing',
            Component: BillingPage,
          },
          {
            element: <RequireActiveSubscription />,
            children: [
              {
                Component: MainLayout,
                children: [
                  {
                    path: '/dashboard',
                    Component: DashboardPage,
                  },
                  {
                    path: '/station',
                    Component: StationProfilePage,
                  },
                  {
                    path: '/repairs/new',
                    element: (
                      <RepairCreateProvider>
                        <RepairCreatePage />
                      </RepairCreateProvider>
                    ),
                  },
                  {
                    path: '/repairs/:repairId',
                    Component: RepairDetailsPage,
                  },
                  {
                    path: '*',
                    Component: NotFoundPage,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);
