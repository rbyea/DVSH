import { Button, Menu } from 'antd';
import type { MenuProps } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAppSelector } from '@/app/store';
import { useLogout } from '@/features/auth';

import styles from './AppHeader.module.scss';

const items: MenuProps['items'] = [
  {
    label: 'Ремонты',
    key: 'dashboard',
  },
  {
    label: 'Новый ремонт',
    key: 'new-repair',
  },
];

const routesByKey: Record<string, string> = {
  dashboard: '/dashboard',
  'new-repair': '/repairs/new',
};

function getSelectedKey(pathname: string): string {
  if (pathname.startsWith('/repairs/') && pathname !== '/repairs/new') {
    return 'dashboard';
  }

  if (pathname === '/repairs/new') {
    return 'new-repair';
  }

  return 'dashboard';
}

export const AppHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, isLoading } = useLogout();
  const user = useAppSelector((state) => state.session.user);

  const current = getSelectedKey(location.pathname);

  const onClick: MenuProps['onClick'] = ({ key }) => {
    navigate(routesByKey[key] ?? '/dashboard');
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <button className={styles.brand} type="button" onClick={() => navigate('/dashboard')}>
          <span className={styles.brandMark}>DV</span>
          <span className={styles.brandText}>
            <span className={styles.brandName}>DVSH</span>
            <span className={styles.brandHint}>Сервисный учёт</span>
          </span>
        </button>

        <Menu
          className={styles.menu}
          onClick={onClick}
          selectedKeys={[current]}
          mode="horizontal"
          items={items}
        />

        <div className={styles.userBlock}>
          {user ? (
            <div className={styles.userMeta}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userEmail}>{user.email}</span>
            </div>
          ) : null}
          <Button
            className={styles.logout}
            loading={isLoading}
            type="default"
            onClick={() => void logout()}
          >
            Выйти
          </Button>
        </div>
      </div>
      <div className={styles.legalBar}>
        <Link className={styles.legalLink} to="/legal/privacy" target="_blank">
          Политика ПДн
        </Link>
        <span aria-hidden>·</span>
        <Link className={styles.legalLink} to="/legal/consent" target="_blank">
          Согласие
        </Link>
      </div>
    </header>
  );
};
