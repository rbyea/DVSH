import { Link, Outlet } from 'react-router-dom';

import { AppHeader } from '@/widgets/AppHeader';

import styles from './MainLayout.module.scss';

export const MainLayout = () => {
  return (
    <div className={styles.shell}>
      <AppHeader />
      <main className={styles.page}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Link className={styles.footerLink} to="/legal/privacy" target="_blank">
            Политика ПДн
          </Link>
          <span aria-hidden>·</span>
          <Link className={styles.footerLink} to="/legal/consent" target="_blank">
            Согласие
          </Link>
        </div>
      </footer>
    </div>
  );
};
