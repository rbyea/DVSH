import { Menu } from 'antd';
import type { MenuProps } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';

const items: MenuProps['items'] = [
  {
    label: 'Таблица Ремонтов',
    key: 'dashboard',
  },
  {
    label: 'Новый Ремонт',
    key: 'new-repair',
  },
];

const routesByKey: Record<string, string> = {
  dashboard: '/dashboard',
  'new-repair': '/repairs/new',
};

const selectedKeyByPath: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/repairs/new': 'new-repair',
};

export const AppHeader = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const current = selectedKeyByPath[location.pathname] ?? 'dashboard';

  const onClick: MenuProps['onClick'] = ({ key }) => {
    navigate(routesByKey[key] ?? '/dashboard');
  };

  return <Menu onClick={onClick} selectedKeys={[current]} mode="horizontal" items={items} />;
};
