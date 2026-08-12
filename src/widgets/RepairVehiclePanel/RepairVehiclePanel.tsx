import { Button, Form, Input } from 'antd';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Bounce, toast } from 'react-toastify';

import { repairsApi } from '@/entities/repair-order';
import { useUpdateVehicleMutation, type VehicleCard } from '@/entities/vehicle';
import { getErrorMessage } from '@/shared/lib/api';
import {
  formatChassisNumberInput,
  formatRuLicensePlateInput,
  formatRuLicensePlateMaskedInput,
  formatVinInput,
  isValidChassisNumber,
  isValidRuLicensePlate,
  isValidVin,
} from '@/shared/lib/vehicle';

import styles from './RepairVehiclePanel.module.scss';

type VehicleView = Pick<
  VehicleCard,
  'id' | 'car_model' | 'license_plate' | 'vin' | 'chassis_number' | 'mileage'
>;

type RepairVehiclePanelProps = {
  repairId: string;
  vehicle: VehicleView;
  repairMileage?: number | null;
  readOnly?: boolean;
};

type VehicleFormState = {
  carModel: string;
  licensePlate: string;
  vin: string;
  chassisNumber: string;
};

function toFormState(vehicle: VehicleView): VehicleFormState {
  return {
    carModel: vehicle.car_model,
    licensePlate: formatRuLicensePlateMaskedInput(vehicle.license_plate),
    vin: formatVinInput(vehicle.vin ?? ''),
    chassisNumber: formatChassisNumberInput(vehicle.chassis_number ?? ''),
  };
}

export function RepairVehiclePanel({
  repairId,
  vehicle,
  repairMileage,
  readOnly = false,
}: RepairVehiclePanelProps) {
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState<VehicleFormState>(() => toFormState(vehicle));
  const [useChassisNumber, setUseChassisNumber] = useState(
    () => Boolean(vehicle.chassis_number?.trim()) && !vehicle.vin?.trim(),
  );
  const [updateVehicle, { isLoading }] = useUpdateVehicleMutation();

  const displayMileage = repairMileage ?? vehicle.mileage;
  const displayIdLabel = vehicle.vin?.trim()
    ? 'VIN'
    : vehicle.chassis_number?.trim()
      ? 'Номер шасси'
      : 'VIN / шасси';
  const displayIdValue = vehicle.vin?.trim() || vehicle.chassis_number?.trim() || 'Не указан';

  useEffect(() => {
    if (!isEditing) {
      setFormState(toFormState(vehicle));
      setUseChassisNumber(Boolean(vehicle.chassis_number?.trim()) && !vehicle.vin?.trim());
    }
  }, [vehicle, isEditing]);

  const handleCancel = () => {
    setFormState(toFormState(vehicle));
    setUseChassisNumber(Boolean(vehicle.chassis_number?.trim()) && !vehicle.vin?.trim());
    setIsEditing(false);
  };

  const handleSave = async () => {
    const carModel = formState.carModel.trim();
    const licensePlate = formatRuLicensePlateInput(formState.licensePlate);
    const vin = formatVinInput(formState.vin);
    const chassisNumber = formatChassisNumberInput(formState.chassisNumber);

    if (!carModel) {
      toast.warning('Введите модель машины', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    if (!licensePlate) {
      toast.warning('Введите гос номер', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    if (!isValidRuLicensePlate(licensePlate)) {
      toast.warning('Введите гос номер в формате А123ВС 777', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    if (vin && !isValidVin(vin)) {
      toast.warning('VIN должен содержать 17 символов (без I, O, Q)', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    if (chassisNumber && !isValidChassisNumber(chassisNumber)) {
      toast.warning('Номер шасси: 5–25 символов (латиница, цифры)', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    if (!vin && !chassisNumber) {
      toast.warning('Укажите VIN или номер шасси', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    try {
      await updateVehicle({
        id: vehicle.id,
        body: {
          car_model: carModel,
          license_plate: licensePlate,
          vin: vin || null,
          chassis_number: chassisNumber || null,
        },
      }).unwrap();

      dispatch(repairsApi.util.invalidateTags([{ type: 'Repair', id: repairId }]));
      setIsEditing(false);
      toast.success('Автомобиль обновлён', {
        position: 'top-right',
        transition: Bounce,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось обновить автомобиль'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  return (
    <article className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Автомобиль</h2>
        {readOnly ? null : isEditing ? (
          <div className={styles.actions}>
            <Button disabled={isLoading} size="small" onClick={handleCancel}>
              Отмена
            </Button>
            <Button
              loading={isLoading}
              size="small"
              type="primary"
              onClick={() => void handleSave()}
            >
              Сохранить
            </Button>
          </div>
        ) : (
          <Button size="small" type="link" onClick={() => setIsEditing(true)}>
            Редактировать
          </Button>
        )}
      </div>

      {isEditing && !readOnly ? (
        <Form className={styles.form} layout="vertical" requiredMark={false}>
          <Form.Item label="Модель">
            <Input
              size="large"
              value={formState.carModel}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, carModel: event.target.value }));
              }}
            />
          </Form.Item>
          <Form.Item label="Гос номер">
            <Input
              className={styles.plateInput}
              placeholder="А123ВС 777"
              size="large"
              value={formState.licensePlate}
              onChange={(event) => {
                setFormState((prev) => ({
                  ...prev,
                  licensePlate: formatRuLicensePlateMaskedInput(event.target.value),
                }));
              }}
            />
          </Form.Item>
          <Form.Item label={useChassisNumber ? 'Номер шасси' : 'VIN'}>
            {!useChassisNumber ? (
              <>
                <Input
                  maxLength={17}
                  placeholder="17 символов VIN"
                  showCount={{
                    formatter: ({ count, maxLength = 17 }) => `${count}/${maxLength}`,
                  }}
                  size="large"
                  value={formState.vin}
                  onChange={(event) => {
                    setFormState((prev) => ({
                      ...prev,
                      vin: formatVinInput(event.target.value),
                    }));
                  }}
                />
                <Button
                  className={styles.idSwitchButton}
                  htmlType="button"
                  type="link"
                  onClick={() => {
                    setFormState((prev) => ({ ...prev, vin: '' }));
                    setUseChassisNumber(true);
                  }}
                >
                  Нет VIN? Введите номер шасси
                </Button>
              </>
            ) : (
              <>
                <Input
                  maxLength={25}
                  placeholder="Номер шасси / рамы"
                  size="large"
                  value={formState.chassisNumber}
                  onChange={(event) => {
                    setFormState((prev) => ({
                      ...prev,
                      chassisNumber: formatChassisNumberInput(event.target.value),
                    }));
                  }}
                />
                <Button
                  className={styles.idSwitchButton}
                  htmlType="button"
                  type="link"
                  onClick={() => {
                    setFormState((prev) => ({ ...prev, chassisNumber: '' }));
                    setUseChassisNumber(false);
                  }}
                >
                  Указать VIN вместо шасси
                </Button>
              </>
            )}
          </Form.Item>
        </Form>
      ) : (
        <>
          <div className={styles.plate}>{vehicle.license_plate}</div>
          <div className={styles.vehicleMeta}>
            <div className={styles.contactRow}>
              <span className={styles.contactLabel}>Модель</span>
              <span className={styles.contactValue}>{vehicle.car_model}</span>
            </div>
            <div className={styles.contactRow}>
              <span className={styles.contactLabel}>{displayIdLabel}</span>
              <span className={styles.contactValue}>{displayIdValue}</span>
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
                {displayMileage != null
                  ? `${displayMileage.toLocaleString('ru-RU')} км`
                  : 'Не указан'}
              </span>
            </div>
          </div>
        </>
      )}
    </article>
  );
}
