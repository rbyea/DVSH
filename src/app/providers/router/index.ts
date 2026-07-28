import { createElement } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import { LoginPage } from '@/pages/auth';
import { CarsPage } from '@/pages/cars';
import { ClientsPage } from '@/pages/clients';
import { DashboardPage } from '@/pages/dashboard';
import { RepairPage } from '@/pages/repair-order-details';
import { RepairsPage } from '@/pages/repair-orders';
import { SettingsPage } from '@/pages/settings';

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: createElement(Navigate, { to: '/dashboard', replace: true }),
  },
  {
    path: '/login',
    element: createElement(LoginPage),
  },
  {
    path: '/dashboard',
    element: createElement(DashboardPage),
  },
  {
    path: '/repairs',
    element: createElement(RepairsPage),
  },
  {
    path: '/repairs/:repairId',
    element: createElement(RepairPage),
  },
  {
    path: '/clients',
    element: createElement(ClientsPage),
  },
  {
    path: '/cars',
    element: createElement(CarsPage),
  },
  {
    path: '/settings',
    element: createElement(SettingsPage),
  },
]);
