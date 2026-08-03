import { ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';

import { appRouter } from '@/app/router';
import { store } from '@/app/store';
import { ToastContainer } from 'react-toastify';

dayjs.locale('ru');

const theme = {
  token: {
    colorPrimary: '#2563eb',
    colorInfo: '#2563eb',
    colorSuccess: '#16a34a',
    colorWarning: '#d97706',
    colorError: '#dc2626',
    colorText: '#111827',
    colorTextSecondary: '#6b7280',
    colorBorder: '#e5e7eb',
    colorBgLayout: '#eef1f6',
    colorBgContainer: '#ffffff',
    borderRadius: 12,
    fontFamily: "'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    controlHeightLG: 44,
  },
  components: {
    Card: {
      borderRadiusLG: 20,
    },
    Button: {
      primaryShadow: 'none',
    },
    Table: {
      headerBg: '#f3f4f6',
      headerColor: '#6b7280',
      rowHoverBg: '#f8fafc',
    },
  },
};

export function AppProviders() {
  return (
    <Provider store={store}>
      <ConfigProvider locale={ruRU} theme={theme}>
        <RouterProvider router={appRouter} />
        <ToastContainer position="top-right" />
      </ConfigProvider>
    </Provider>
  );
}
