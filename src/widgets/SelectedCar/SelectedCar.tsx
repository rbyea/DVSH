import { Card, Typography } from 'antd';

import { useRepairCreateContext } from '@/features/repair-order/create';

import styles from './SelectedCar.module.scss';

export const SelectedCar = () => {
  const { selectedVehicle } = useRepairCreateContext();

  if (!selectedVehicle) {
    return null;
  }

  const hasHistory = selectedVehicle.previous_repairs.length > 0;

  return (
    <Card className={styles.section}>
      <div className={styles.head}>
        <Typography.Title className={styles.sectionTitle} level={3}>
          Выбранное авто
        </Typography.Title>
        <p className={styles.hint}>Заказ-наряд привяжется к этой карточке и истории ремонтов</p>
      </div>

      <div className={styles.vehicleSummary}>
        <span>{selectedVehicle.client_name}</span>
        <span>{selectedVehicle.car_model}</span>
        <span>{selectedVehicle.license_plate}</span>
        <span>{selectedVehicle.vin}</span>
      </div>

      {hasHistory && (
        <div className={styles.historyList}>
          {selectedVehicle.previous_repairs.slice(0, 3).map((repair) => (
            <div className={styles.historyItem} key={repair.id}>
              <span>{repair.order_number}</span>
              <span>{repair.title}</span>
              <span>{repair.completed_at ?? '—'}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
