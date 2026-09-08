import { Alert, Button, Form, Input } from 'antd';
import { Controller } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { useForgotPasswordForm } from '@/features/auth';
import { getAntdValidateStatus } from '@/shared/lib/antd';

import { AuthCardLayout } from './AuthCardLayout';

export function ForgotPasswordPage() {
  const { control, errors, isLoading, onSubmit, sentTo, startOver } = useForgotPasswordForm();

  if (sentTo) {
    return (
      <AuthCardLayout
        eyebrow="Восстановление доступа"
        subtitle={
          <>
            Если адрес <b>{sentTo}</b> зарегистрирован в Автовидно, на него ушло письмо со ссылкой
            для смены пароля. Ссылка действует час.
          </>
        }
        title="Проверьте почту"
        footer={<Link to="/login">Вернуться ко входу</Link>}
      >
        <Alert
          showIcon
          description="Загляните в папку «Спам». Если письмо так и не пришло, проверьте адрес и запросите ссылку ещё раз."
          message="Письма нет?"
          type="info"
        />

        <Button block size="large" onClick={startOver}>
          Указать другой адрес
        </Button>
      </AuthCardLayout>
    );
  }

  return (
    <AuthCardLayout
      eyebrow="Восстановление доступа"
      subtitle="Укажите почту, с которой вы входите в Автовидно. Пришлём ссылку для смены пароля."
      title="Забыли пароль?"
      footer={
        <span>
          Вспомнили? <Link to="/login">Войти</Link>
        </span>
      }
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
            help={errors.email?.message}
            label="Адрес электронной почты"
            validateStatus={getAntdValidateStatus(Boolean(errors.email))}
          >
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <Input
                  {...field}
                  autoComplete="email"
                  placeholder="m@example.com"
                  size="large"
                  type="email"
                />
              )}
            />
          </Form.Item>

          <Form.Item>
            <Button block htmlType="submit" loading={isLoading} size="large" type="primary">
              Прислать ссылку
            </Button>
          </Form.Item>
        </Form>
      </form>
    </AuthCardLayout>
  );
}
