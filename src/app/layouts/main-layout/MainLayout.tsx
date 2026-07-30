import AppHeader from '@/widgets/app-header/ui/AppHeader';
import { Outlet } from 'react-router-dom';
import styles from './MainLayout.module.scss';

const MainLayout = () => {
  return (
    <>
      <AppHeader />
      <main className={styles.page}>
        <Outlet />
      </main>
    </>
  );
};

export default MainLayout;
