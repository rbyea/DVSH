import { Outlet } from 'react-router-dom';
import styles from './MainLayout.module.scss';
import { AppHeader } from '@/widgets/AppHeader';

export const MainLayout = () => {
  return (
    <>
      <AppHeader />
      <main className={styles.page}>
        <Outlet />
      </main>
    </>
  );
};
