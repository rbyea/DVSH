import { Alert, Button } from 'antd';
import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useAppDispatch } from '@/app/store';
import { authApi } from '@/entities/session';
import { hasAccessToken } from '@/shared/lib/auth';

import { AuthCardLayout } from './AuthCardLayout';

type VerifyStatus = 'success' | 'already' | 'expired' | 'invalid';

type StatusCopy = {
  title: string;
  subtitle: string;
  alertType: 'success' | 'info' | 'warning' | 'error';
  alertMessage: string;
  alertDescription: string;
};

const STATUS_COPY: Record<VerifyStatus, StatusCopy> = {
  success: {
    title: 'Почта подтверждена',
    subtitle: 'Адрес привязан к вашей станции.',
    alertType: 'success',
    alertMessage: 'Готово',
    alertDescription:
      'Теперь, если забудете пароль, сможете восстановить доступ сами — письмо придёт на этот адрес.',
  },
  already: {
    title: 'Почта уже подтверждена',
    subtitle: 'Этот адрес подтверждали раньше, делать ничего не нужно.',
    alertType: 'info',
    alertMessage: 'Всё в порядке',
    alertDescription: 'Восстановление пароля по этому адресу уже работает.',
  },
  expired: {
    title: 'Ссылка устарела',
    subtitle: 'Ссылка из письма живёт сутки, эта уже просрочена.',
    alertType: 'warning',
    alertMessage: 'Что делать',
    alertDescription:
      'Войдите в Автовидно, откройте профиль станции и запросите новое письмо — придёт свежая ссылка.',
  },
  invalid: {
    title: 'Ссылка не подошла',
    subtitle: 'Не удалось разобрать ссылку из письма.',
    alertType: 'error',
    alertMessage: 'Что делать',
    alertDescription:
      'Проверьте, что открыли последнее письмо целиком. Новое можно запросить в профиле станции.',
  },
};

function parseStatus(value: string | null): VerifyStatus {
  return value !== null && value in STATUS_COPY ? (value as VerifyStatus) : 'invalid';
}

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const status = parseStatus(searchParams.get('status'));
  const isVerified = status === 'success' || status === 'already';
  const isAuthenticated = hasAccessToken();
  const copy = STATUS_COPY[status];

  useEffect(() => {
    if (!isVerified) {
      return;
    }

    // Профиль мог быть загружен до подтверждения — сбрасываем кэш,
    // иначе баннер «подтвердите почту» останется висеть.
    dispatch(authApi.util.invalidateTags(['Session']));
  }, [dispatch, isVerified]);

  return (
    <AuthCardLayout
      eyebrow="Подтверждение почты"
      subtitle={copy.subtitle}
      title={copy.title}
      footer={isAuthenticated ? null : <Link to="/register">Зарегистрировать СТО</Link>}
    >
      <Alert
        showIcon
        description={copy.alertDescription}
        message={copy.alertMessage}
        type={copy.alertType}
      />

      <Button
        block
        size="large"
        type="primary"
        onClick={() => navigate(isAuthenticated ? '/station' : '/login')}
      >
        {isAuthenticated ? 'Перейти в профиль станции' : 'Войти в Автовидно'}
      </Button>
    </AuthCardLayout>
  );
}
