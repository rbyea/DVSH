import { Outlet } from 'react-router-dom';

import { AppHeader } from '@/widgets/AppHeader';

import styles from './MainLayout.module.scss';

export const MainLayout = () => {
  return (
    <div className={styles.shell}>
      <AppHeader />
      <main className={styles.page}>
        <Outlet />
      </main>
    </div>
  );
};
