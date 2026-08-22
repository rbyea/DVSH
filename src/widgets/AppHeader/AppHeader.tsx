import { Button, Drawer, Menu } from 'antd';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAppSelector } from '@/app/store';
import { useLogout } from '@/features/auth';
import { BrandMark } from '@/shared/ui/BrandMark';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';

import styles from './AppHeader.module.scss';

const navItems = [
  { key: 'dashboard', label: 'Ремонты' },
  { key: 'new-repair', label: 'Новый ремонт' },
  { key: 'station', label: 'Профиль СТО' },
] as const;

const routesByKey: Record<string, string> = {
  dashboard: '/dashboard',
  'new-repair': '/repairs/new',
  station: '/station',
};

function getSelectedKey(pathname: string): string {
  if (pathname.startsWith('/repairs/') && pathname !== '/repairs/new') {
    return 'dashboard';
  }

  if (pathname === '/repairs/new') {
    return 'new-repair';
  }

  if (pathname === '/station') {
    return 'station';
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

  const goTo = (key: string) => {
    navigate(routesByKey[key] ?? '/dashboard');
    setIsMenuOpen(false);
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <button className={styles.brand} type="button" onClick={() => navigate('/dashboard')}>
          <BrandMark className={styles.brandMark} />
          <span className={styles.brandText}>
            <span className={styles.brandName}>Автовидно</span>
            <span className={styles.brandHint}>Сервисный учёт</span>
          </span>
        </button>

        <Menu
          className={styles.menu}
          onClick={({ key }) => goTo(key)}
          selectedKeys={[current]}
          mode="horizontal"
          items={[...navItems]}
        />

        <div className={styles.userBlock}>
          <ThemeToggle />
          {user ? (
            <button className={styles.userMeta} type="button" onClick={() => navigate('/station')}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userEmail}>{user.email}</span>
            </button>
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
        classNames={{
          header: styles.drawerHeader,
          body: styles.drawerBody,
        }}
        open={isMenuOpen}
        placement="right"
        rootClassName={styles.drawer}
        title="Меню"
        width={300}
        onClose={() => setIsMenuOpen(false)}
      >
        {user ? (
          <button
            className={styles.drawerUser}
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              navigate('/station');
            }}
          >
            <span className={styles.drawerUserName}>{user.name}</span>
            <span className={styles.drawerUserEmail}>{user.email}</span>
          </button>
        ) : null}

        <nav className={styles.drawerNav}>
          {navItems.map((item) => (
            <button
              className={item.key === current ? styles.drawerLinkActive : styles.drawerLink}
              key={item.key}
              type="button"
              onClick={() => goTo(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

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
