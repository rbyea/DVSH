import { createElement } from 'react';
import { createBrowserRouter, Navigate, redirect } from 'react-router-dom';

import { RepairCreateProvider } from '@/features/repair-order/create';
import { LoginPage } from '@/pages/auth';
import { DashboardPage } from '@/pages/Dashboard';
import { PersonalDataConsentPage, PrivacyPolicyPage } from '@/pages/legal';
import { NotFoundPage } from '@/pages/NotFound';
import { PublicRepairPage } from '@/pages/PublicRepairPage';
import { RepairCreatePage } from '@/pages/RepairCreatePage';
import { RepairDetailsPage } from '@/pages/RepairDetailsPage';

import { MainLayout } from '../layouts/MainLayout';
import { RedirectIfAuthenticated } from './RedirectIfAuthenticated';
import { RequireAuth } from './RequireAuth';

function redirectLegacyPublicRepair({ params }: { params: { publicToken?: string } }) {
  return redirect(`/public/vehicles/${params.publicToken ?? ''}`);
}

export const appRouter = createBrowserRouter([
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
    element: <RedirectIfAuthenticated />,
    children: [
      {
        path: '/login',
        Component: LoginPage,
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        Component: MainLayout,
        children: [
          {
            path: '/dashboard',
            Component: DashboardPage,
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
            index: true,
            element: createElement(Navigate, { to: '/dashboard', replace: true }),
          },
          {
            path: '*',
            Component: NotFoundPage,
          },
        ],
      },
    ],
  },
]);
