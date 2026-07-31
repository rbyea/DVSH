import { RepairCreatePage } from '@/pages/RepairCreatePage';
import { RepairCreateProvider } from '@/features/repair-order/create';
import { createElement } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import { LoginPage } from '@/pages/auth';
import { DashboardPage } from '@/pages/Dashboard';
import { NotFoundPage } from '@/pages/NotFound';
import { MainLayout } from '../layouts/MainLayout';

export const appRouter = createBrowserRouter([
  {
    path: '/login',
    Component: LoginPage,
  },
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
        index: true,
        element: createElement(Navigate, { to: '/dashboard', replace: true }),
      },
      {
        path: '*',
        Component: NotFoundPage,
      },
    ],
  },
]);
