import { Card, Typography } from 'antd';

import { useRepairCreateContext } from '@/features/repair-order/create';
import { formatMileageKm, resolveMinAllowedMileage } from '@/shared/lib/vehicle';

import styles from './SelectedCar.module.scss';

export const SelectedCar = () => {
  const { selectedVehicle } = useRepairCreateContext();

  if (!selectedVehicle) {
    return null;
  }

  const minMileage = resolveMinAllowedMileage(selectedVehicle);
  const mileagePoints = selectedVehicle.previous_repairs
    .filter((item) => typeof item.mileage === 'number')
    .map((item) => item.mileage as number)
    .reverse();

  return (
    <Card className={styles.section}>
      <div className={styles.head}>
        <Typography.Title className={styles.sectionTitle} level={3}>
          Выбранное авто
        </Typography.Title>
        <p className={styles.hint}>Заказ-наряд привяжется к этой карточке</p>
      </div>

      <div className={styles.vehicleSummary}>
        <span>{selectedVehicle.client_name}</span>
        <span>{selectedVehicle.car_model}</span>
        <span>{selectedVehicle.license_plate}</span>
        <span>
          {selectedVehicle.vin?.trim() ||
            selectedVehicle.chassis_number?.trim() ||
            'Идентификатор не указан'}
        </span>
      </div>

      {minMileage != null || mileagePoints.length > 0 ? (
        <div className={styles.mileageBlock}>
          {minMileage != null ? (
            <p className={styles.mileageFloor}>
              На данный момент пробег автомобиля: <strong>{formatMileageKm(minMileage)}</strong>
            </p>
          ) : null}
          {mileagePoints.length > 1 ? (
            <p className={styles.mileageTimeline}>
              По визитам: {mileagePoints.map((point) => formatMileageKm(point)).join(' → ')}
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
};
