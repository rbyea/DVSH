import { App, ConfigProvider, theme as antdTheme } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';

import { appRouter } from '@/app/router';
import { store } from '@/app/store';
import { ThemeProvider, useTheme } from '@/shared/lib/theme';
import { ToastContainer } from 'react-toastify';

dayjs.locale('ru');

const fontFamily = "Manrope, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function ThemedApp() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: isDark ? '#60a5fa' : '#2563eb',
          colorInfo: isDark ? '#60a5fa' : '#2563eb',
          colorSuccess: '#16a34a',
          colorWarning: '#d97706',
          colorError: '#dc2626',
          colorText: isDark ? '#e8edf4' : '#111827',
          colorTextSecondary: isDark ? '#94a3b8' : '#6b7280',
          colorBorder: isDark ? '#2a3340' : '#e5e7eb',
          colorBgLayout: isDark ? '#0b0f14' : '#eef1f6',
          colorBgContainer: isDark ? '#12171e' : '#ffffff',
          borderRadius: 12,
          fontFamily,
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
            headerBg: isDark ? '#1b222c' : '#f3f4f6',
            headerColor: isDark ? '#94a3b8' : '#6b7280',
            rowHoverBg: isDark ? '#1b222c' : '#f8fafc',
          },
          Modal: {
            contentBg: isDark ? '#12171e' : '#ffffff',
            headerBg: isDark ? '#12171e' : '#ffffff',
            footerBg: isDark ? '#12171e' : '#ffffff',
            titleColor: isDark ? '#e8edf4' : '#111827',
          },
        },
      }}
    >
      <App>
        <RouterProvider router={appRouter} />
        <ToastContainer position="top-right" theme={isDark ? 'dark' : 'light'} />
      </App>
    </ConfigProvider>
  );
}

export function AppProviders() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </Provider>
  );
}
