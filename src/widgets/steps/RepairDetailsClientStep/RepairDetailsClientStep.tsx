import { Button, Card, Checkbox, Form, Input, InputNumber, Typography } from 'antd';
import { Controller, useWatch } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { useRepairCreateContext } from '@/features/repair-order/create';
import { getAntdValidateStatus } from '@/shared/lib/antd';
import { formatRuPhoneInput } from '@/shared/lib/phone';

import styles from './RepairDetailsClientStep.module.scss';

export const RepairDetailsClientStep = () => {
  const navigate = useNavigate();
  const {
    errors,
    control,
    setCurrentStep,
    isManualMode,
    createClientAndContinue,
    continueToRepairStep,
    isCreatingClient,
    isSavingClientStep,
  } = useRepairCreateContext();

  const [clientId, vehicleId] = useWatch({
    control,
    name: ['clientId', 'vehicleId'],
  });
  const hasExistingIds = Boolean(clientId && vehicleId);

  return (
    <>
      <Card className={styles.section}>
        <Typography.Title className={styles.sectionTitle} level={3}>
          Клиент
        </Typography.Title>

        <Form.Item
          help={errors.clientName?.message}
          label="Имя клиента"
          validateStatus={getAntdValidateStatus(Boolean(errors.clientName))}
        >
          <Controller
            control={control}
            name="clientName"
            render={({ field }) => (
              <Input {...field} placeholder="Например, Иван Петров" size="large" />
            )}
          />
        </Form.Item>

        <Form.Item
          help={errors.clientPhone?.message}
          label="Телефон"
          validateStatus={getAntdValidateStatus(Boolean(errors.clientPhone))}
        >
          <Controller
            control={control}
            name="clientPhone"
            render={({ field }) => (
              <Input
                inputMode="tel"
                placeholder="+7 999 123-45-67"
                size="large"
                value={field.value}
                onBlur={field.onBlur}
                onChange={(event) => field.onChange(formatRuPhoneInput(event.target.value))}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          help={errors.clientEmail?.message}
          label="Почта"
          validateStatus={getAntdValidateStatus(Boolean(errors.clientEmail))}
        >
          <Controller
            control={control}
            name="clientEmail"
            render={({ field }) => (
              <Input {...field} placeholder="client@example.com" size="large" />
            )}
          />
        </Form.Item>
      </Card>

      <Card className={styles.section}>
        <Typography.Title className={styles.sectionTitle} level={3}>
          Автомобиль
        </Typography.Title>

        <Form.Item
          help={errors.carModel?.message}
          label="Модель машины"
          validateStatus={getAntdValidateStatus(Boolean(errors.carModel))}
        >
          <Controller
            control={control}
            name="carModel"
            render={({ field }) => (
              <Input {...field} placeholder="Например, Toyota Camry" size="large" />
            )}
          />
        </Form.Item>

        <Form.Item
          help={errors.licensePlate?.message}
          label="Гос номер"
          validateStatus={getAntdValidateStatus(Boolean(errors.licensePlate))}
        >
          <Controller
            control={control}
            name="licensePlate"
            render={({ field }) => <Input {...field} placeholder="А123ВС 777" size="large" />}
          />
        </Form.Item>

        <Form.Item
          help={errors.vin?.message}
          label="VIN номер"
          validateStatus={getAntdValidateStatus(Boolean(errors.vin))}
        >
          <Controller
            control={control}
            name="vin"
            render={({ field }) => (
              <Input
                {...field}
                maxLength={17}
                placeholder="17 символов VIN"
                size="large"
                onChange={(event) => field.onChange(event.target.value.toUpperCase())}
              />
            )}
          />
        </Form.Item>

        <Form.Item
          help={errors.mileage?.message}
          label="Пробег, км"
          validateStatus={getAntdValidateStatus(Boolean(errors.mileage))}
        >
          <Controller
            control={control}
            name="mileage"
            render={({ field }) => (
              <InputNumber
                className={styles.numberInput}
                min={0}
                placeholder="85000"
                size="large"
                value={field.value}
                onChange={(value) => field.onChange(value ?? undefined)}
              />
            )}
          />
        </Form.Item>
      </Card>

      <Card className={styles.section}>
        <Typography.Title className={styles.sectionTitle} level={3}>
          Персональные данные
        </Typography.Title>
        <p className={styles.consentHint}>
          Клиентские данные обрабатывает СТО. Подтвердите, что есть законное основание (согласие /
          уведомление клиента).
        </p>
        <Form.Item
          help={errors.clientPersonalDataConsent?.message}
          validateStatus={getAntdValidateStatus(Boolean(errors.clientPersonalDataConsent))}
        >
          <Controller
            control={control}
            name="clientPersonalDataConsent"
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onChange={(event) => field.onChange(event.target.checked)}
              >
                <span className={styles.consentText}>
                  Подтверждаю согласие клиента на обработку ПДн согласно{' '}
                  <Link className={styles.consentLink} to="/legal/privacy" target="_blank">
                    Политике
                  </Link>{' '}
                  и{' '}
                  <Link className={styles.consentLink} to="/legal/consent" target="_blank">
                    Согласию
                  </Link>
                </span>
              </Checkbox>
            )}
          />
        </Form.Item>
      </Card>

      <div className={styles.actions}>
        <Button htmlType="button" size="large" onClick={() => setCurrentStep(0)}>
          Назад
        </Button>
        <Button htmlType="button" size="large" onClick={() => navigate('/dashboard')}>
          Отмена
        </Button>
        {hasExistingIds ? (
          <Button
            htmlType="button"
            loading={isSavingClientStep}
            size="large"
            type="primary"
            onClick={() => {
              void continueToRepairStep();
            }}
          >
            Сохранить и далее
          </Button>
        ) : (
          <Button
            disabled={!isManualMode && !hasExistingIds}
            htmlType="button"
            loading={isCreatingClient}
            size="large"
            type="primary"
            onClick={() => {
              void createClientAndContinue();
            }}
          >
            Создать клиента и авто
          </Button>
        )}
      </div>
    </>
  );
};
