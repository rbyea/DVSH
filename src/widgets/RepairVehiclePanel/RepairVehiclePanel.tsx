import { Button, Form, Input, InputNumber } from 'antd';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Bounce, toast } from 'react-toastify';

import { repairsApi } from '@/entities/repair-order';
import { useUpdateVehicleMutation, type VehicleCard } from '@/entities/vehicle';
import { getErrorMessage } from '@/shared/lib/api';

import styles from './RepairVehiclePanel.module.scss';

type VehicleView = Pick<VehicleCard, 'id' | 'car_model' | 'license_plate' | 'vin' | 'mileage'>;

type RepairVehiclePanelProps = {
  repairId: string;
  vehicle: VehicleView;
  repairMileage?: number | null;
};

type VehicleFormState = {
  carModel: string;
  licensePlate: string;
  vin: string;
  mileage?: number;
};

function toFormState(vehicle: VehicleView, repairMileage?: number | null): VehicleFormState {
  return {
    carModel: vehicle.car_model,
    licensePlate: vehicle.license_plate,
    vin: vehicle.vin,
    mileage: repairMileage ?? vehicle.mileage ?? undefined,
  };
}

export function RepairVehiclePanel({ repairId, vehicle, repairMileage }: RepairVehiclePanelProps) {
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState<VehicleFormState>(() =>
    toFormState(vehicle, repairMileage),
  );
  const [updateVehicle, { isLoading }] = useUpdateVehicleMutation();

  const displayMileage = repairMileage ?? vehicle.mileage;

  useEffect(() => {
    if (!isEditing) {
      setFormState(toFormState(vehicle, repairMileage));
    }
  }, [vehicle, repairMileage, isEditing]);

  const handleCancel = () => {
    setFormState(toFormState(vehicle, repairMileage));
    setIsEditing(false);
  };

  const handleSave = async () => {
    const carModel = formState.carModel.trim();
    const licensePlate = formState.licensePlate.trim();
    const vin = formState.vin.trim().toUpperCase();

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

    if (vin.length !== 17) {
      toast.warning('VIN должен содержать 17 символов', {
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
          vin,
          mileage: formState.mileage ?? null,
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
        {isEditing ? (
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

      {isEditing ? (
        <div className={styles.form}>
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
              size="large"
              value={formState.licensePlate}
              onChange={(event) => {
                setFormState((prev) => ({
                  ...prev,
                  licensePlate: event.target.value.toUpperCase(),
                }));
              }}
            />
          </Form.Item>
          <Form.Item label="VIN">
            <Input
              maxLength={17}
              size="large"
              value={formState.vin}
              onChange={(event) => {
                setFormState((prev) => ({
                  ...prev,
                  vin: event.target.value.toUpperCase(),
                }));
              }}
            />
          </Form.Item>
          <Form.Item label="Пробег, км">
            <InputNumber
              className={styles.fullWidth}
              min={0}
              size="large"
              value={formState.mileage}
              onChange={(value) => {
                setFormState((prev) => ({
                  ...prev,
                  mileage: typeof value === 'number' ? value : undefined,
                }));
              }}
            />
          </Form.Item>
        </div>
      ) : (
        <>
          <div className={styles.plate}>{vehicle.license_plate}</div>
          <div className={styles.vehicleMeta}>
            <div className={styles.contactRow}>
              <span className={styles.contactLabel}>Модель</span>
              <span className={styles.contactValue}>{vehicle.car_model}</span>
            </div>
            <div className={styles.contactRow}>
              <span className={styles.contactLabel}>VIN</span>
              <span className={styles.contactValue}>{vehicle.vin}</span>
            </div>
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
