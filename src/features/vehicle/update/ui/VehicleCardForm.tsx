import { Button, Form, Input, InputNumber } from 'antd';
import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { Bounce, toast } from 'react-toastify';

import { CarModelAutoComplete, type VehicleCard } from '@/entities/vehicle';
import { getAntdValidateStatus } from '@/shared/lib/antd';
import { copyTextToClipboard } from '@/shared/lib/clipboard';
import { getPublicRepairAppUrl } from '@/shared/lib/public-repair';
import {
  formatChassisNumberInput,
  formatMileageKm,
  formatRuLicensePlateMaskedInput,
  formatVinInput,
} from '@/shared/lib/vehicle';
import { CarBrandMark } from '@/shared/ui/CarBrandMark';
import { RuLicensePlate, RuLicensePlateFlag } from '@/shared/ui/RuLicensePlate';

import { useUpdateVehicleForm } from '../model/useUpdateVehicleForm';
import styles from './VehicleCardForm.module.scss';

type VehicleCardFormProps = {
  vehicle: VehicleCard;
};

function idLabel(vehicle: VehicleCard): string {
  if (vehicle.vin?.trim()) {
    return 'VIN';
  }

  if (vehicle.chassis_number?.trim()) {
    return 'Номер шасси';
  }

  return 'VIN / шасси';
}

function idValue(vehicle: VehicleCard): string {
  return vehicle.vin?.trim() || vehicle.chassis_number?.trim() || 'Не указан';
}

export function VehicleCardForm({ vehicle }: VehicleCardFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const {
    control,
    errors,
    isSubmitting,
    minMileage,
    onSubmit,
    resetToVehicle,
    setValue,
    useChassisNumber,
  } = useUpdateVehicleForm(vehicle, () => setIsEditing(false));
  const publicUrl = vehicle.public_token ? getPublicRepairAppUrl(vehicle.public_token) : '';

  const handleCopyPublicLink = async () => {
    if (!publicUrl) {
      toast.warning('Публичная ссылка ещё не создана', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    const copied = await copyTextToClipboard(publicUrl);
    toast[copied ? 'success' : 'error'](
      copied ? 'Ссылка для клиента скопирована' : 'Не удалось скопировать ссылку',
      { position: 'top-right', transition: Bounce },
    );
  };

  return (
    <article className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Автомобиль</h2>
        {isEditing ? (
          <div className={styles.actions}>
            <Button
              disabled={isSubmitting}
              size="small"
              onClick={() => {
                resetToVehicle();
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
              resetToVehicle();
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
            help={errors.carModel?.message}
            label="Модель"
            validateStatus={getAntdValidateStatus(Boolean(errors.carModel))}
          >
            <Controller
              control={control}
              name="carModel"
              render={({ field }) => (
                <CarModelAutoComplete size="large" value={field.value} onChange={field.onChange} />
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
              render={({ field }) => (
                <Input
                  className={styles.plateInput}
                  placeholder="А123ВС 777"
                  prefix={<RuLicensePlateFlag className={styles.plateFlag} />}
                  size="large"
                  value={field.value}
                  onChange={(event) => {
                    field.onChange(formatRuLicensePlateMaskedInput(event.target.value));
                  }}
                />
              )}
            />
          </Form.Item>
          <Form.Item
            help={useChassisNumber ? errors.chassisNumber?.message : errors.vin?.message}
            label={useChassisNumber ? 'Номер шасси' : 'VIN'}
            validateStatus={getAntdValidateStatus(
              Boolean(useChassisNumber ? errors.chassisNumber : errors.vin),
            )}
          >
            {useChassisNumber ? (
              <>
                <Controller
                  control={control}
                  name="chassisNumber"
                  render={({ field }) => (
                    <Input
                      maxLength={25}
                      placeholder="Номер шасси / рамы"
                      size="large"
                      value={field.value}
                      onChange={(event) => {
                        field.onChange(formatChassisNumberInput(event.target.value));
                      }}
                    />
                  )}
                />
                <Button
                  className={styles.idSwitchButton}
                  htmlType="button"
                  type="link"
                  onClick={() => {
                    setValue('chassisNumber', '');
                    setValue('useChassisNumber', false);
                  }}
                >
                  Указать VIN вместо шасси
                </Button>
              </>
            ) : (
              <>
                <Controller
                  control={control}
                  name="vin"
                  render={({ field }) => (
                    <Input
                      maxLength={17}
                      placeholder="17 символов VIN"
                      showCount={{
                        formatter: ({ count, maxLength = 17 }) => `${count}/${maxLength}`,
                      }}
                      size="large"
                      value={field.value}
                      onChange={(event) => {
                        field.onChange(formatVinInput(event.target.value));
                      }}
                    />
                  )}
                />
                <Button
                  className={styles.idSwitchButton}
                  htmlType="button"
                  type="link"
                  onClick={() => {
                    setValue('vin', '');
                    setValue('useChassisNumber', true);
                  }}
                >
                  Нет VIN? Введите номер шасси
                </Button>
              </>
            )}
          </Form.Item>
          <Form.Item
            extra={
              minMileage != null
                ? `Не меньше ${formatMileageKm(minMileage)} после выдачи`
                : 'Текущий пробег автомобиля'
            }
            help={errors.mileage?.message}
            label="Пробег, км"
            validateStatus={getAntdValidateStatus(Boolean(errors.mileage))}
          >
            <Controller
              control={control}
              name="mileage"
              render={({ field }) => (
                <InputNumber
                  className={styles.fullWidth}
                  min={minMileage ?? 0}
                  placeholder="Например, 87200"
                  size="large"
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(typeof value === 'number' ? value : undefined);
                  }}
                />
              )}
            />
          </Form.Item>
        </Form>
      ) : (
        <>
          <RuLicensePlate value={vehicle.license_plate} />
          <div className={styles.vehicleMeta}>
            <div className={styles.contactRow}>
              <span className={styles.contactLabel}>Модель</span>
              <span className={styles.contactValue}>
                <CarBrandMark carModel={vehicle.car_model} />
                {vehicle.car_model}
              </span>
            </div>
            <div className={styles.contactRow}>
              <span className={styles.contactLabel}>{idLabel(vehicle)}</span>
              <span className={styles.contactValue}>{idValue(vehicle)}</span>
            </div>
            {vehicle.vin?.trim() && vehicle.chassis_number?.trim() ? (
              <div className={styles.contactRow}>
                <span className={styles.contactLabel}>Номер шасси</span>
                <span className={styles.contactValue}>{vehicle.chassis_number}</span>
              </div>
            ) : null}
            <div className={styles.contactRow}>
              <span className={styles.contactLabel}>Пробег</span>
              <span className={styles.contactValue}>
                {typeof vehicle.mileage === 'number'
                  ? formatMileageKm(vehicle.mileage)
                  : 'Не указан'}
              </span>
            </div>
          </div>
        </>
      )}

      <div className={styles.publicLink}>
        <span className={styles.contactLabel}>Ссылка для клиента</span>
        {publicUrl ? (
          <div className={styles.publicRow}>
            <Input readOnly size="large" value={publicUrl} />
            <Button size="large" type="primary" onClick={() => void handleCopyPublicLink()}>
              Копировать
            </Button>
            <Button
              size="large"
              onClick={() => {
                window.open(publicUrl, '_blank', 'noopener,noreferrer');
              }}
            >
              Открыть
            </Button>
          </div>
        ) : (
          <p className={styles.publicEmpty}>Публичная ссылка ещё не создана</p>
        )}
      </div>
    </article>
  );
}
