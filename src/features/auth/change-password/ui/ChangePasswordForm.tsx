import { Button, Form, Input } from 'antd';
import { Controller } from 'react-hook-form';

import { getAntdValidateStatus } from '@/shared/lib/antd';

import { useChangePasswordForm } from '../model/useChangePasswordForm';
import styles from './ChangePasswordForm.module.scss';

type ChangePasswordFormProps = {
  onDone: () => void;
};

export function ChangePasswordForm({ onDone }: ChangePasswordFormProps) {
  const { control, errors, isLoading, onSubmit, resetForm } = useChangePasswordForm(onDone);

  return (
    <Form
      className={styles.form}
      layout="vertical"
      requiredMark={false}
      onFinish={() => {
        void onSubmit();
      }}
    >
      <Form.Item
        help={errors.currentPassword?.message}
        label="Текущий пароль"
        validateStatus={getAntdValidateStatus(Boolean(errors.currentPassword))}
      >
        <Controller
          control={control}
          name="currentPassword"
          render={({ field }) => (
            <Input.Password {...field} autoComplete="current-password" size="large" />
          )}
        />
      </Form.Item>

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
        label="Повторите новый пароль"
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

      <p className={styles.hint}>
        После смены пароля все остальные устройства, где вы вошли, придётся авторизовать заново.
      </p>

      <div className={styles.actions}>
        <Button
          disabled={isLoading}
          onClick={() => {
            resetForm();
            onDone();
          }}
        >
          Отмена
        </Button>
        <Button htmlType="submit" loading={isLoading} type="primary">
          Сохранить пароль
        </Button>
      </div>
    </Form>
  );
}
