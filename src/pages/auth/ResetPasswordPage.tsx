import { Alert, Button, Form, Input } from 'antd';
import { Controller } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { useResetPasswordForm } from '@/features/auth';
import { getAntdValidateStatus } from '@/shared/lib/antd';

import { AuthCardLayout } from './AuthCardLayout';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { control, email, errors, hasCompleteLink, isLoading, onSubmit } = useResetPasswordForm();

  if (!hasCompleteLink) {
    return (
      <AuthCardLayout
        eyebrow="Восстановление доступа"
        subtitle="В адресе не хватает данных из письма. Скорее всего, ссылку скопировали не целиком."
        title="Ссылка неполная"
        footer={<Link to="/login">Вернуться ко входу</Link>}
      >
        <Alert
          showIcon
          description="Откройте письмо ещё раз и нажмите кнопку в нём. Если письма нет, запросите восстановление заново."
          message="Что делать"
          type="warning"
        />

        <Button
          block
          size="large"
          type="primary"
          onClick={() => navigate('/forgot-password', { replace: true })}
        >
          Запросить новую ссылку
        </Button>
      </AuthCardLayout>
    );
  }

  return (
    <AuthCardLayout
      eyebrow="Восстановление доступа"
      subtitle={
        <>
          Придумайте новый пароль для <b>{email}</b>.
        </>
      }
      title="Новый пароль"
      footer={<Link to="/login">Вернуться ко входу</Link>}
    >
      <form
        method="post"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit(event);
        }}
      >
        <Form component={false} layout="vertical" requiredMark={false}>
          <Form.Item
            extra="Не короче 8 символов"
            help={errors.password?.message}
            label="Новый пароль"
            validateStatus={getAntdValidateStatus(Boolean(errors.password))}
          >
            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <Input.Password {...field} autoComplete="new-password" size="large" />
              )}
            />
          </Form.Item>

          <Form.Item
            help={errors.passwordConfirmation?.message}
            label="Повторите пароль"
            validateStatus={getAntdValidateStatus(Boolean(errors.passwordConfirmation))}
          >
            <Controller
              control={control}
              name="passwordConfirmation"
              render={({ field }) => (
                <Input.Password {...field} autoComplete="new-password" size="large" />
              )}
            />
          </Form.Item>

          <Form.Item>
            <Button block htmlType="submit" loading={isLoading} size="large" type="primary">
              Сохранить пароль
            </Button>
          </Form.Item>
        </Form>
      </form>
    </AuthCardLayout>
  );
}
