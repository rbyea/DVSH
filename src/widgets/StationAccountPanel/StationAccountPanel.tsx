import { Alert, Button, Tag } from 'antd';
import { useState } from 'react';

import { useAppSelector } from '@/app/store';
import { ChangePasswordForm, useEmailVerification } from '@/features/auth';

import styles from './StationAccountPanel.module.scss';

export function StationAccountPanel() {
  const user = useAppSelector((state) => state.session.user);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { isLoading: isSendingVerification, resend } = useEmailVerification();

  if (!user) {
    return null;
  }

  const isEmailVerified = Boolean(user.email_verified_at);

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Аккаунт</h2>
          <p className={styles.hint}>Владелец станции в Автовидно</p>
        </div>
        {isChangingPassword ? null : (
          <Button size="small" type="link" onClick={() => setIsChangingPassword(true)}>
            Изменить пароль
          </Button>
        )}
      </div>

      <p className={styles.name}>{user.name}</p>

      <div className={styles.emailRow}>
        <p className={styles.email}>{user.email}</p>
        <Tag color={isEmailVerified ? 'green' : 'orange'}>
          {isEmailVerified ? 'Почта подтверждена' : 'Почта не подтверждена'}
        </Tag>
      </div>

      {isEmailVerified ? null : (
        <Alert
          showIcon
          action={
            <Button loading={isSendingVerification} size="small" onClick={() => void resend()}>
              Отправить письмо
            </Button>
          }
          description="Пока адрес не подтверждён, восстановить пароль по кнопке «Забыли пароль?» не получится — письмо просто некуда отправить."
          message="Подтвердите почту"
          type="warning"
        />
      )}

      {isChangingPassword ? (
        <ChangePasswordForm onDone={() => setIsChangingPassword(false)} />
      ) : null}
    </section>
  );
}
