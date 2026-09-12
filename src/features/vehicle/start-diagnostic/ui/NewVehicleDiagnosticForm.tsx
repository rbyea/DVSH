import { Button, Card, Checkbox, Form, Input, InputNumber, Typography } from 'antd';
import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { CarModelAutoComplete } from '@/entities/vehicle';
import { getAntdValidateStatus } from '@/shared/lib/antd';
import { formatRuPhoneInput } from '@/shared/lib/phone';
import {
  formatChassisNumberInput,
  formatRuLicensePlateMaskedInput,
  formatVinInput,
} from '@/shared/lib/vehicle';
import { RuLicensePlateFlag } from '@/shared/ui/RuLicensePlate';

import { useStartDiagnosticForm } from '../model/useStartDiagnosticForm';
import styles from './NewVehicleDiagnosticForm.module.scss';

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

export function NewVehicleDiagnosticForm() {
  const { control, errors, isSubmitting, onSubmit, setValue, clearErrors } =
    useStartDiagnosticForm();
  const [useChassisNumber, setUseChassisNumber] = useState(false);

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <Card className={styles.section}>
        <Typography.Title className={styles.sectionTitle} level={3}>
          Клиент
        </Typography.Title>

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
      </Card>

      <Card className={styles.section}>
        <Typography.Title className={styles.sectionTitle} level={3}>
          Автомобиль
        </Typography.Title>

        <Form.Item
          help={errors.carModel?.message}
          label={requiredLabel('Модель')}
          validateStatus={getAntdValidateStatus(Boolean(errors.carModel))}
        >
          <Controller
            control={control}
            name="carModel"
            render={({ field }) => (
              <CarModelAutoComplete
                placeholder="Toyota Camry"
                size="large"
                value={field.value ?? ''}
                onBlur={field.onBlur}
                onChange={field.onChange}
              />
            )}
          />
        </Form.Item>

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
                prefix={<RuLicensePlateFlag className={styles.plateFlag} />}
                size="large"
                value={field.value}
                onChange={(event) =>
                  field.onChange(formatRuLicensePlateMaskedInput(event.target.value))
                }
              />
            )}
          />
        </Form.Item>

        {useChassisNumber ? (
          <>
            <Form.Item
              help={errors.chassisNumber?.message}
              label="Номер шасси"
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
              onClick={() => {
                clearErrors(['vin', 'chassisNumber']);
                setValue('chassisNumber', '', { shouldDirty: true, shouldValidate: false });
                setUseChassisNumber(false);
              }}
            >
              Указать VIN вместо шасси
            </Button>
          </>
        ) : (
          <>
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
              onClick={() => {
                clearErrors(['vin', 'chassisNumber']);
                setValue('vin', '', { shouldDirty: true, shouldValidate: false });
                setUseChassisNumber(true);
              }}
            >
              Нет VIN? Введите номер шасси
            </Button>
          </>
        )}

        <Form.Item
          extra="Пробег на момент осмотра"
          help={errors.mileage?.message}
          label="Пробег автомобиля"
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
                  <Link className={styles.consentLink} to="/legal/privacy">
                    Политике
                  </Link>{' '}
                  и{' '}
                  <Link className={styles.consentLink} to="/legal/consent">
                    Согласию
                  </Link>
                </span>
              </Checkbox>
            )}
          />
        </Form.Item>
      </Card>

      <div className={styles.actions}>
        <Button htmlType="submit" loading={isSubmitting} size="large" type="primary">
          Завести авто и открыть список
        </Button>
      </div>
    </form>
  );
}
