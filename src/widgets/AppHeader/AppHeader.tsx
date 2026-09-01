import { Button, Drawer, Menu } from 'antd';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAppSelector } from '@/app/store';
import { isSubscriptionBlocked } from '@/entities/session';
import { useLogout } from '@/features/auth';
import { BrandMark } from '@/shared/ui/BrandMark';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';

import styles from './AppHeader.module.scss';

const navItems = [
  { key: 'dashboard', label: 'Ремонты' },
  { key: 'new-repair', label: 'Новый ремонт' },
  { key: 'vehicles', label: 'Гараж' },
  { key: 'station', label: 'Профиль' },
] as const;

const paywallPath = '/station#subscription';

const routesByKey: Record<string, string> = {
  dashboard: '/dashboard',
  vehicles: '/vehicles',
  'new-repair': '/repairs/new',
  station: '/station',
  tariffs: '/station#subscription',
};

function getSelectedKey(pathname: string, hash: string): string {
  if (pathname === '/station' && hash.replace('#', '') === 'subscription') {
    return 'tariffs';
  }

  if (pathname.startsWith('/vehicles')) {
    return 'vehicles';
  }

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
  const paywalled = isSubscriptionBlocked(user);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const current = getSelectedKey(location.pathname, location.hash);
  const visibleNav = paywalled ? [] : navItems;

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname, location.hash]);

  const goHome = () => {
    navigate(paywalled ? paywallPath : '/dashboard');
  };

  const goTo = (key: string) => {
    navigate(routesByKey[key] ?? (paywalled ? paywallPath : '/dashboard'));
    setIsMenuOpen(false);
  };

  const tariffsPlaqueClass = clsx(
    styles.tariffsPlaque,
    current === 'tariffs' && styles.tariffsPlaqueActive,
  );

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <button className={styles.brand} type="button" onClick={goHome}>
          <BrandMark className={styles.brandMark} />
          <span className={styles.brandText}>
            <span className={styles.brandName}>Автовидно</span>
            <span className={styles.brandHint}>Сервисный учёт</span>
          </span>
        </button>

        <div className={styles.navCluster}>
          {visibleNav.length > 0 ? (
            <Menu
              className={styles.menu}
              onClick={({ key }) => goTo(key)}
              selectedKeys={[current]}
              mode="horizontal"
              items={[...visibleNav]}
            />
          ) : null}
          <button className={tariffsPlaqueClass} type="button" onClick={() => goTo('tariffs')}>
            Тарифы
          </button>
        </div>

        <div className={styles.userBlock}>
          <ThemeToggle />
          {user ? (
            <button
              className={styles.userMeta}
              type="button"
              onClick={() => navigate(paywalled ? paywallPath : '/station')}
            >
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
              navigate(paywalled ? paywallPath : '/station');
            }}
          >
            <span className={styles.drawerUserName}>{user.name}</span>
            <span className={styles.drawerUserEmail}>{user.email}</span>
          </button>
        ) : null}

        <nav className={styles.drawerNav}>
          <button
            className={clsx(tariffsPlaqueClass, styles.drawerTariffs)}
            type="button"
            onClick={() => goTo('tariffs')}
          >
            Тарифы
          </button>
          {visibleNav.map((item) => (
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
