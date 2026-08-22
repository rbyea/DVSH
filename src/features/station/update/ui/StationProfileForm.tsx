import { Button, Form, Input, Spin } from 'antd';
import { useState } from 'react';
import { Controller } from 'react-hook-form';

import { getAntdValidateStatus } from '@/shared/lib/antd';
import { formatRuPhoneInput } from '@/shared/lib/phone';

import { useUpdateStationForm } from '../model/useUpdateStationForm';
import styles from './StationProfileForm.module.scss';

function displayValue(value: string | null | undefined): string {
  return value?.trim() || 'Не указан';
}

export function StationProfileForm() {
  const [isEditing, setIsEditing] = useState(false);
  const { control, errors, isLoading, isSubmitting, onSubmit, profile, resetToProfile } =
    useUpdateStationForm(() => setIsEditing(false));

  if (isLoading || !profile) {
    return (
      <section className={styles.card}>
        <div className={styles.loading}>
          <Spin />
        </div>
      </section>
    );
  }

  if (!isEditing) {
    return (
      <section className={styles.card}>
        <div className={styles.head}>
          <div>
            <h2 className={styles.title}>Название и контакты</h2>
            <p className={styles.hint}>Так станция выглядит для клиента в карточке ремонта</p>
          </div>
          <Button
            size="small"
            type="link"
            onClick={() => {
              resetToProfile();
              setIsEditing(true);
            }}
          >
            Изменить
          </Button>
        </div>

        <p className={styles.stationName}>{profile.name || 'Название пока не задано'}</p>

        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt>Телефон</dt>
            <dd>{displayValue(profile.phone)}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Город</dt>
            <dd>{displayValue(profile.city)}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Адрес</dt>
            <dd>{displayValue(profile.address)}</dd>
          </div>
          <div className={styles.fact}>
            <dt>График</dt>
            <dd>{displayValue(profile.working_hours)}</dd>
          </div>
        </dl>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Название и контакты</h2>
          <p className={styles.hint}>Поля кроме названия можно оставить пустыми</p>
        </div>
      </div>

      <Form
        className={styles.form}
        layout="vertical"
        requiredMark={false}
        onFinish={() => {
          void onSubmit();
        }}
      >
        <Form.Item
          help={errors.name?.message}
          label="Название СТО"
          validateStatus={getAntdValidateStatus(Boolean(errors.name))}
        >
          <Controller
            control={control}
            name="name"
            render={({ field }) => <Input {...field} placeholder="СТО на Ленина" size="large" />}
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
          help={errors.city?.message}
          label="Город"
          validateStatus={getAntdValidateStatus(Boolean(errors.city))}
        >
          <Controller
            control={control}
            name="city"
            render={({ field }) => <Input {...field} placeholder="Краснодар" size="large" />}
          />
        </Form.Item>

        <Form.Item
          help={errors.address?.message}
          label="Адрес"
          validateStatus={getAntdValidateStatus(Boolean(errors.address))}
        >
          <Controller
            control={control}
            name="address"
            render={({ field }) => <Input {...field} placeholder="ул. Красная, 12" size="large" />}
          />
        </Form.Item>

        <Form.Item
          help={errors.workingHours?.message}
          label="График работы"
          validateStatus={getAntdValidateStatus(Boolean(errors.workingHours))}
        >
          <Controller
            control={control}
            name="workingHours"
            render={({ field }) => <Input {...field} placeholder="пн–сб 9:00–20:00" size="large" />}
          />
        </Form.Item>

        <div className={styles.actions}>
          <Button
            disabled={isSubmitting}
            onClick={() => {
              resetToProfile();
              setIsEditing(false);
            }}
          >
            Отмена
          </Button>
          <Button htmlType="submit" loading={isSubmitting} type="primary">
            Сохранить
          </Button>
        </div>
      </Form>
    </section>
  );
}
