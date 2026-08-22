import { Button, Card, Checkbox, Form, Input } from 'antd';
import { Controller } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { useRegisterForm } from '@/features/auth';
import { getAntdValidateStatus } from '@/shared/lib/antd';
import { BrandMark } from '@/shared/ui/BrandMark';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';

import styles from './RegisterPage.module.scss';

export function RegisterPage() {
  const { control, errors, isLoading, onSubmit } = useRegisterForm();

  return (
    <main className={styles.page}>
      <Card className={styles.card} variant="borderless">
        <div className={styles.brand}>
          <BrandMark className={styles.brandMark} />
          <span className={styles.brandName}>Автовидно</span>
          <ThemeToggle className={styles.themeToggle} />
        </div>

        <div className={styles.header}>
          <p className={styles.eyebrow}>Регистрация СТО</p>
          <h1 className={styles.title}>30 дней бесплатно</h1>
          <p className={styles.subtitle}>
            Создайте аккаунт станции. После пробного периода доступ можно продлить на странице
            оплаты.
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
              help={errors.stationName?.message}
              label="Название СТО"
              validateStatus={getAntdValidateStatus(Boolean(errors.stationName))}
            >
              <Controller
                control={control}
                name="stationName"
                render={({ field }) => (
                  <Input {...field} placeholder="СТО на Ленина" size="large" />
                )}
              />
            </Form.Item>

            <Form.Item
              help={errors.name?.message}
              label="Ваше имя"
              validateStatus={getAntdValidateStatus(Boolean(errors.name))}
            >
              <Controller
                control={control}
                name="name"
                render={({ field }) => <Input {...field} placeholder="Иван Иванов" size="large" />}
              />
            </Form.Item>

            <Form.Item
              help={errors.email?.message}
              label="Адрес электронной почты"
              validateStatus={getAntdValidateStatus(Boolean(errors.email))}
            >
              <Controller
                control={control}
                name="email"
                render={({ field }) => (
                  <Input {...field} placeholder="m@example.com" size="large" type="email" />
                )}
              />
            </Form.Item>

            <Form.Item
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

            <Form.Item
              help={errors.passwordConfirmation?.message}
              label="Повторите пароль"
              validateStatus={getAntdValidateStatus(Boolean(errors.passwordConfirmation))}
            >
              <Controller
                control={control}
                name="passwordConfirmation"
                render={({ field }) => <Input.Password {...field} size="large" />}
              />
            </Form.Item>

            <Form.Item
              className={styles.consentItem}
              help={errors.acceptPersonalData?.message}
              validateStatus={getAntdValidateStatus(Boolean(errors.acceptPersonalData))}
            >
              <Controller
                control={control}
                name="acceptPersonalData"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                  >
                    <span className={styles.consentText}>
                      Согласен с{' '}
                      <Link className={styles.consentLink} to="/legal/privacy">
                        Политикой обработки ПДн
                      </Link>
                      ,{' '}
                      <Link className={styles.consentLink} to="/legal/consent">
                        Согласием
                      </Link>{' '}
                      и{' '}
                      <Link className={styles.consentLink} to="/legal/offer">
                        Офертой
                      </Link>
                    </span>
                  </Checkbox>
                )}
              />
            </Form.Item>

            <Form.Item>
              <Button block htmlType="submit" loading={isLoading} size="large" type="primary">
                Создать аккаунт
              </Button>
            </Form.Item>
          </Form>
        </form>

        <div className={styles.footer}>
          <span>
            Уже есть аккаунт? <Link to="/login">Войти</Link>
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
