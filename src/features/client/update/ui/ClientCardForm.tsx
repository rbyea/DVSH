import { Button, Form, Input } from 'antd';
import { useEffect, useState } from 'react';
import { Controller } from 'react-hook-form';

import type { Client } from '@/entities/client';
import { getAntdValidateStatus } from '@/shared/lib/antd';
import { extractRuPhoneDigits, formatRuPhoneInput } from '@/shared/lib/phone';

import { useUpdateClientForm } from '../model/useUpdateClientForm';
import styles from './ClientCardForm.module.scss';

type ClientCardFormProps = {
  client: Client;
  repairsCount?: number;
};

function phoneHref(phone: string): string {
  return `tel:+${extractRuPhoneDigits(phone)}`;
}

function displayPhone(phone: string): string {
  return formatRuPhoneInput(phone) || phone;
}

export function ClientCardForm({ client, repairsCount }: ClientCardFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { control, errors, isSubmitting, onSubmit, resetToClient } = useUpdateClientForm(
    client,
    () => setIsEditing(false),
  );

  useEffect(() => {
    setIsEditing(false);
  }, [client.id]);

  const phone = client.phone?.trim() ?? '';
  const email = client.email?.trim() ?? '';

  return (
    <article className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Клиент</h2>
        {isEditing ? (
          <div className={styles.actions}>
            <Button
              disabled={isSubmitting}
              size="small"
              onClick={() => {
                resetToClient();
                setIsEditing(false);
              }}
            >
              Отмена
            </Button>
            <Button
              loading={isSubmitting}
              size="small"
              type="primary"
              onClick={() => void onSubmit()}
            >
              Сохранить
            </Button>
          </div>
        ) : (
          <Button
            size="small"
            type="link"
            onClick={() => {
              resetToClient();
              setIsEditing(true);
            }}
          >
            Редактировать
          </Button>
        )}
      </div>

      {isEditing ? (
        <Form
          className={styles.form}
          layout="vertical"
          requiredMark={false}
          onFinish={() => void onSubmit()}
        >
          <Form.Item
            help={errors.name?.message}
            label="Имя"
            validateStatus={getAntdValidateStatus(Boolean(errors.name))}
          >
            <Controller
              control={control}
              name="name"
              render={({ field }) => <Input {...field} size="large" />}
            />
          </Form.Item>
          <Form.Item
            help={errors.phone?.message}
            label="Телефон"
            validateStatus={getAntdValidateStatus(Boolean(errors.phone))}
          >
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <Input
                  {...field}
                  inputMode="tel"
                  placeholder="+7 999 123-45-67"
                  size="large"
                  onChange={(event) => field.onChange(formatRuPhoneInput(event.target.value))}
                />
              )}
            />
          </Form.Item>
          <Form.Item
            help={errors.email?.message}
            label="Почта"
            validateStatus={getAntdValidateStatus(Boolean(errors.email))}
          >
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <Input {...field} placeholder="client@example.com" size="large" />
              )}
            />
          </Form.Item>
        </Form>
      ) : (
        <>
          <p className={styles.personName}>{client.name || '—'}</p>
          <div className={styles.contactList}>
            <div className={styles.contactRow}>
              <span className={styles.contactLabel}>Телефон</span>
              {phone ? (
                <a className={styles.contactLink} href={phoneHref(phone)}>
                  {displayPhone(phone)}
                </a>
              ) : (
                <span className={`${styles.contactValue} ${styles.muted}`}>Не указан</span>
              )}
            </div>
            <div className={styles.contactRow}>
              <span className={styles.contactLabel}>Почта</span>
              {email ? (
                <a className={styles.contactLink} href={`mailto:${email}`}>
                  {email}
                </a>
              ) : (
                <span className={`${styles.contactValue} ${styles.muted}`}>Не указана</span>
              )}
            </div>
            {typeof repairsCount === 'number' ? (
              <div className={styles.contactRow}>
                <span className={styles.contactLabel}>Заказов</span>
                <span className={styles.contactValue}>{repairsCount}</span>
              </div>
            ) : null}
          </div>
        </>
      )}
    </article>
  );
}
