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

export function AppProviders() {
  return (
    <Provider store={store}>
      <ConfigProvider locale={ruRU}>
        <RouterProvider router={appRouter} />
        <ToastContainer position="top-right" />
      </ConfigProvider>
    </Provider>
  );
}
