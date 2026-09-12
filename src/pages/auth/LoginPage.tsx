import { Button, Card, Form, Input } from 'antd';
import { Controller } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { useLoginForm } from '@/features/auth';
import { getAntdValidateStatus } from '@/shared/lib/antd';
import { BrandMark } from '@/shared/ui/BrandMark';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';

import styles from './LoginPage.module.scss';

export function LoginPage() {
  const { control, errors, isLoading, onSubmit } = useLoginForm();

  return (
    <main className={styles.page}>
      <Card className={styles.card} variant="borderless">
        <div className={styles.brand}>
          <BrandMark className={styles.brandMark} />
          <span className={styles.brandName}>Автовидно</span>
          <ThemeToggle className={styles.themeToggle} />
        </div>

        <div className={styles.header}>
          <p className={styles.eyebrow}>Вход в сервис</p>
          <h1 className={styles.title}>Войдите в учётную запись</h1>
          <p className={styles.subtitle}>
            Используйте рабочий email и пароль сотрудника СТО, чтобы открыть ремонты.
          </p>
        </div>

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
                  <Input {...field} placeholder="m@example.com" type="email" size="large" />
                )}
              />
            </Form.Item>

            <Form.Item
              className={styles.passwordItem}
              help={errors.password?.message}
              label="Пароль"
              validateStatus={getAntdValidateStatus(Boolean(errors.password))}
            >
              <Controller
                control={control}
                name="password"
                render={({ field }) => <Input.Password {...field} size="large" />}
              />
            </Form.Item>

            <div className={styles.forgotRow}>
              <Link className={styles.forgotLink} to="/forgot-password">
                Забыли пароль?
              </Link>
            </div>

            <Form.Item>
              <Button block htmlType="submit" loading={isLoading} type="primary" size="large">
                Войти
              </Button>
            </Form.Item>
          </Form>
        </form>

        <div className={styles.footer}>
          <span>
            Нет аккаунта? <Link to="/register">Зарегистрировать СТО</Link>
          </span>
          <div className={styles.legalLinks}>
            <Link to="/legal/privacy">Политика</Link>
            <span aria-hidden>·</span>
            <Link to="/legal/consent">Согласие</Link>
            <span aria-hidden>·</span>
            <Link to="/legal/offer">Оферта</Link>
          </div>
          <p className={styles.requisites}>
            ИП Новиков Егор Сергеевич · ИНН 650202270142 · ОГРНИП 325237500256209
          </p>
        </div>
      </Card>
    </main>
  );
}
