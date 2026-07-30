import { createElement } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import { LoginPage } from '@/pages/auth';
import { CarsPage } from '@/pages/cars';
import { ClientsPage } from '@/pages/clients';
import { DashboardPage } from '@/pages/dashboard';
import { RepairCreatePage } from '@/pages/repair-create';
import { RepairPage } from '@/pages/repair-order-details';
import { RepairsPage } from '@/pages/repair-orders';
import { SettingsPage } from '@/pages/settings';
import MainLayout from '../layouts/main-layout/MainLayout';

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
        path: '/repairs',
        Component: RepairsPage,
      },
      {
        path: '/repairs/new',
        Component: RepairCreatePage,
      },
      {
        path: '/repairs/:repairId',
        Component: RepairPage,
      },
      {
        path: '/clients',
        Component: ClientsPage,
      },
      {
        path: '/cars',
        Component: CarsPage,
      },
      {
        path: '/settings',
        Component: SettingsPage,
      },
      {
        index: true,
        element: createElement(Navigate, { to: '/dashboard', replace: true }),
      },
    ],
  },
  {
    path: '/',
    element: createElement(Navigate, { to: '/dashboard', replace: true }),
  },
]);
