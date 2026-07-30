import type { VehicleSuggestion } from '@/entities/vehicle';
import { Card, Typography } from 'antd';
import styles from './SelectedCar.module.scss';

const SelectedCar = ({ selectedVehicle }: { selectedVehicle: VehicleSuggestion }) => {
  return (
    <Card className={styles.section}>
      <Typography.Title className={styles.sectionTitle} level={3}>
        Выбранное авто (можно найти другие машины и выбрать)
      </Typography.Title>

      <div className={styles.existingVehicle}>
        <Typography.Text strong>Машина найдена в базе</Typography.Text>
        <Typography.Paragraph className={styles.existingVehicleText}>
          Новый ремонт будет добавлен к существующей карточке автомобиля.
        </Typography.Paragraph>

        <div className={styles.vehicleSummary}>
          <span>{selectedVehicle.clientName}</span>
          <span>{selectedVehicle.carModel}</span>
          <span>{selectedVehicle.licensePlate}</span>
          <span>{selectedVehicle.vin}</span>
        </div>

        <div className={styles.historyList}>
          {selectedVehicle.previousRepairs.map((repair) => (
            <div className={styles.historyItem} key={repair.orderNumber}>
              <span>{repair.orderNumber}</span>
              <span>{repair.title}</span>
              <span>{repair.completedAt}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default SelectedCar;
