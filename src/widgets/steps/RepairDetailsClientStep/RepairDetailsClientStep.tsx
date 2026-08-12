import { Button, Card, Checkbox, Form, Input, InputNumber, Typography } from 'antd';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { getCreateFieldElementId, useRepairCreateContext } from '@/features/repair-order/create';
import { getAntdValidateStatus } from '@/shared/lib/antd';
import { formatRuPhoneInput } from '@/shared/lib/phone';
import {
  formatChassisNumberInput,
  formatMileageKm,
  formatRuLicensePlateMaskedInput,
  formatVinInput,
  resolveMinAllowedMileage,
} from '@/shared/lib/vehicle';

import styles from './RepairDetailsClientStep.module.scss';

function requiredLabel(text: string) {
  return (
    <span className={styles.fieldLabel}>
      {text}
      <span className={styles.requiredMark} aria-hidden>
        *
      </span>
    </span>
  );
}

export const RepairDetailsClientStep = () => {
  const navigate = useNavigate();
  const {
    errors,
    control,
    setCurrentStep,
    setValue,
    clearErrors,
    selectedVehicle,
    isManualMode,
    createClientAndContinue,
    continueToRepairStep,
    isCreatingClient,
    isSavingClientStep,
  } = useRepairCreateContext();

  const [clientId, vehicleId, vinValue, chassisValue] = useWatch({
    control,
    name: ['clientId', 'vehicleId', 'vin', 'chassisNumber'],
  });
  const hasExistingIds = Boolean(clientId && vehicleId);

  const [useChassisNumber, setUseChassisNumber] = useState(
    () => Boolean(chassisValue?.trim()) && !vinValue?.trim(),
  );

  useEffect(() => {
    if (chassisValue?.trim() && !vinValue?.trim()) {
      setUseChassisNumber(true);
    }
  }, [chassisValue, vinValue]);

  const minMileage = selectedVehicle ? resolveMinAllowedMileage(selectedVehicle) : null;

  const switchToChassis = () => {
    clearErrors(['vin', 'chassisNumber']);
    setValue('vin', '', { shouldDirty: true, shouldValidate: false });
    setUseChassisNumber(true);
  };

  const switchToVin = () => {
    clearErrors(['vin', 'chassisNumber']);
    setValue('chassisNumber', '', { shouldDirty: true, shouldValidate: false });
    setUseChassisNumber(false);
  };

  return (
    <>
      <Card className={styles.section}>
        <Typography.Title className={styles.sectionTitle} level={3}>
          Клиент
        </Typography.Title>

        <div id={getCreateFieldElementId('clientName')}>
          <Form.Item
            help={errors.clientName?.message}
            label={requiredLabel('Имя клиента')}
            validateStatus={getAntdValidateStatus(Boolean(errors.clientName))}
          >
            <Controller
              control={control}
              name="clientName"
              render={({ field }) => <Input {...field} placeholder="Иван" size="large" />}
            />
          </Form.Item>
        </div>

        <div id={getCreateFieldElementId('clientPhone')}>
          <Form.Item
            help={errors.clientPhone?.message}
            label={requiredLabel('Телефон')}
            validateStatus={getAntdValidateStatus(Boolean(errors.clientPhone))}
          >
            <Controller
              control={control}
              name="clientPhone"
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="+7 999 123-45-67"
                  size="large"
                  value={field.value}
                  onChange={(event) => field.onChange(formatRuPhoneInput(event.target.value))}
                />
              )}
            />
          </Form.Item>
        </div>

        <div id={getCreateFieldElementId('clientEmail')}>
          <Form.Item
            help={errors.clientEmail?.message}
            label="Email"
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
        </div>
      </Card>

      <Card className={styles.section}>
        <Typography.Title className={styles.sectionTitle} level={3}>
          Автомобиль
        </Typography.Title>

        <div id={getCreateFieldElementId('carModel')}>
          <Form.Item
            help={errors.carModel?.message}
            label={requiredLabel('Модель')}
            validateStatus={getAntdValidateStatus(Boolean(errors.carModel))}
          >
            <Controller
              control={control}
              name="carModel"
              render={({ field }) => <Input {...field} placeholder="Toyota Camry" size="large" />}
            />
          </Form.Item>
        </div>

        <div id={getCreateFieldElementId('licensePlate')}>
          <Form.Item
            help={errors.licensePlate?.message}
            label={requiredLabel('Гос номер')}
            validateStatus={getAntdValidateStatus(Boolean(errors.licensePlate))}
          >
            <Controller
              control={control}
              name="licensePlate"
              render={({ field }) => (
                <Input
                  {...field}
                  className={styles.plateInput}
                  placeholder="А123ВС 777"
                  size="large"
                  value={field.value}
                  onChange={(event) =>
                    field.onChange(formatRuLicensePlateMaskedInput(event.target.value))
                  }
                />
              )}
            />
          </Form.Item>
        </div>

        {!useChassisNumber ? (
          <div id={getCreateFieldElementId('vin')}>
            <Form.Item
              help={errors.vin?.message}
              label={requiredLabel('VIN номер')}
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
                    showCount={{
                      formatter: ({ count, maxLength = 17 }) => `${count}/${maxLength}`,
                    }}
                    size="large"
                    value={field.value}
                    onChange={(event) => field.onChange(formatVinInput(event.target.value))}
                  />
                )}
              />
            </Form.Item>
            <Button
              className={styles.idSwitchButton}
              htmlType="button"
              type="link"
              onClick={switchToChassis}
            >
              Нет VIN? Введите номер шасси
            </Button>
          </div>
        ) : (
          <div id={getCreateFieldElementId('chassisNumber')}>
            <Form.Item
              help={errors.chassisNumber?.message}
              label={requiredLabel('Номер шасси')}
              validateStatus={getAntdValidateStatus(Boolean(errors.chassisNumber))}
            >
              <Controller
                control={control}
                name="chassisNumber"
                render={({ field }) => (
                  <Input
                    {...field}
                    maxLength={25}
                    placeholder="Номер шасси / рамы"
                    size="large"
                    value={field.value}
                    onChange={(event) =>
                      field.onChange(formatChassisNumberInput(event.target.value))
                    }
                  />
                )}
              />
            </Form.Item>
            <Button
              className={styles.idSwitchButton}
              htmlType="button"
              type="link"
              onClick={switchToVin}
            >
              Указать VIN вместо шасси
            </Button>
          </div>
        )}

        <div id={getCreateFieldElementId('mileage')}>
          <Form.Item
            extra={
              minMileage != null
                ? `На данный момент пробег автомобиля: ${formatMileageKm(minMileage)}`
                : 'Пробег на момент этих работ'
            }
            help={errors.mileage?.message}
            label={requiredLabel('Пробег автомобиля')}
            validateStatus={getAntdValidateStatus(Boolean(errors.mileage))}
          >
            <Controller
              control={control}
              name="mileage"
              render={({ field }) => (
                <InputNumber
                  className={styles.numberInput}
                  min={minMileage ?? 0}
                  placeholder={minMileage != null ? String(minMileage) : '85000'}
                  size="large"
                  value={field.value}
                  onChange={(value) => field.onChange(value ?? undefined)}
                />
              )}
            />
          </Form.Item>
        </div>
      </Card>

      <Card className={styles.section}>
        <Typography.Title className={styles.sectionTitle} level={3}>
          Персональные данные
        </Typography.Title>
        <p className={styles.consentHint}>
          Клиентские данные обрабатывает СТО. Подтвердите, что есть законное основание (согласие /
          уведомление клиента).
        </p>
        <div id={getCreateFieldElementId('clientPersonalDataConsent')}>
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
        </div>
      </Card>

      <div className={styles.actions}>
        <Button
          className={clsx(styles.actionSecondary, styles.actionCancel)}
          htmlType="button"
          size="large"
          onClick={() => {
            if (isManualMode) {
              setCurrentStep(0);
              return;
            }
            navigate('/dashboard');
          }}
        >
          {isManualMode ? 'Назад' : 'Отмена'}
        </Button>
        <div className={styles.actionsPrimary}>
          {hasExistingIds ? (
            <Button
              className={styles.actionPrimary}
              htmlType="button"
              loading={isSavingClientStep}
              size="large"
              type="primary"
              onClick={() => {
                void continueToRepairStep();
              }}
            >
              Далее
            </Button>
          ) : (
            <Button
              className={styles.actionPrimary}
              htmlType="button"
              loading={isCreatingClient}
              size="large"
              type="primary"
              onClick={() => {
                void createClientAndContinue();
              }}
            >
              Создать и далее
            </Button>
          )}
        </div>
      </div>
    </>
  );
};
