import { Card, Typography } from 'antd';
import { useWatch } from 'react-hook-form';

import { useRepairCreateContext } from '@/features/repair-order/create';
import { formatMileageKm, resolveMinAllowedMileage } from '@/shared/lib/vehicle';
import { ClientVehiclesPanel } from '@/widgets/ClientVehiclesPanel';

import styles from './SelectedCar.module.scss';

export const SelectedCar = () => {
  const { selectedVehicle, control, applyVehicleById } = useRepairCreateContext();
  const [clientId, vehicleId] = useWatch({
    control,
    name: ['clientId', 'vehicleId'],
  });

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
      {clientId ? (
        <ClientVehiclesPanel
          clientId={String(clientId)}
          clientName={selectedVehicle.client_name}
          currentVehicleId={vehicleId}
          embedded
          knownVehicles={[
            {
              id: String(selectedVehicle.id),
              car_model: selectedVehicle.car_model,
              license_plate: selectedVehicle.license_plate,
              vin: selectedVehicle.vin,
              chassis_number: selectedVehicle.chassis_number,
              mileage: selectedVehicle.mileage,
            },
          ]}
          selectedVehicleId={vehicleId}
          footer={
            minMileage != null || mileagePoints.length > 0 ? (
              <div className={styles.mileageBlock}>
                {minMileage != null ? (
                  <p className={styles.mileageFloor}>
                    На данный момент пробег автомобиля:{' '}
                    <strong>{formatMileageKm(minMileage)}</strong>
                  </p>
                ) : null}
                {mileagePoints.length > 1 ? (
                  <p className={styles.mileageTimeline}>
                    По визитам: {mileagePoints.map((point) => formatMileageKm(point)).join(' → ')}
                  </p>
                ) : null}
              </div>
            ) : null
          }
          hint="Заказ-наряд привяжется к выбранному авто"
          onSelectVehicle={(vehicle) => applyVehicleById(String(vehicle.id))}
          title="Автомобили клиента"
        />
      ) : (
        <>
          <div className={styles.head}>
            <Typography.Title className={styles.sectionTitle} level={3}>
              Автомобили клиента
            </Typography.Title>
            <p className={styles.hint}>Заказ-наряд привяжется к выбранному авто</p>
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
        </>
      )}
    </Card>
  );
};
