import { Button, Drawer, Menu } from 'antd';
import type { MenuProps } from 'antd';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const current = getSelectedKey(location.pathname);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const onClick: MenuProps['onClick'] = ({ key }) => {
    navigate(routesByKey[key] ?? '/dashboard');
    setIsMenuOpen(false);
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <button className={styles.brand} type="button" onClick={() => navigate('/dashboard')}>
          <span className={styles.brandMark}>АВ</span>
          <span className={styles.brandText}>
            <span className={styles.brandName}>Автовидно</span>
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
          <button
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
            className={styles.burger}
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
            <span className={styles.burgerLine} />
          </button>
        </div>
      </div>

      <Drawer
        closable
        open={isMenuOpen}
        placement="right"
        title="Меню"
        width={300}
        onClose={() => setIsMenuOpen(false)}
      >
        {user ? (
          <div className={styles.drawerUser}>
            <span className={styles.drawerUserName}>{user.name}</span>
            <span className={styles.drawerUserEmail}>{user.email}</span>
          </div>
        ) : null}

        <Menu
          className={styles.drawerMenu}
          items={items}
          mode="inline"
          selectedKeys={[current]}
          onClick={onClick}
        />

        <Button
          block
          className={styles.drawerLogout}
          loading={isLoading}
          type="default"
          onClick={() => {
            setIsMenuOpen(false);
            void logout();
          }}
        >
          Выйти
        </Button>
      </Drawer>
    </header>
  );
};
