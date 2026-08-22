import { Link, Outlet } from 'react-router-dom';

import { useAppSelector } from '@/app/store';
import { getTrialDaysLeft } from '@/entities/session';
import { AppHeader } from '@/widgets/AppHeader';

import styles from './MainLayout.module.scss';

export const MainLayout = () => {
  const user = useAppSelector((state) => state.session.user);
  const trialDays = getTrialDaysLeft(user);

  return (
    <div className={styles.shell}>
      <AppHeader />
      {typeof trialDays === 'number' ? (
        <div className={styles.trialBanner}>
          <span>
            Пробный период: осталось {trialDays} {formatDays(trialDays)}
          </span>
          <Link className={styles.trialLink} to="/station#subscription">
            Тарифы
          </Link>
        </div>
      ) : null}
      <main className={styles.page}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Link className={styles.footerLink} to="/legal/privacy">
            Политика ПДн
          </Link>
          <span aria-hidden>·</span>
          <Link className={styles.footerLink} to="/legal/consent">
            Согласие
          </Link>
          <span aria-hidden>·</span>
          <Link className={styles.footerLink} to="/legal/offer">
            Оферта
          </Link>
        </div>
      </footer>
    </div>
  );
};

function formatDays(value: number): string {
  const abs = Math.abs(value) % 100;
  const last = abs % 10;

  if (abs > 10 && abs < 20) {
    return 'дней';
  }

  if (last === 1) {
    return 'день';
  }

  if (last >= 2 && last <= 4) {
    return 'дня';
  }

  return 'дней';
}
