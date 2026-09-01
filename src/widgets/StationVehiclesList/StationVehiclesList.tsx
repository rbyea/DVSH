import { Pagination, Tag } from 'antd';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Link } from 'react-router-dom';

import { repairStatusColors, repairStatusLabels, type RepairStatus } from '@/entities/repair-order';
import type { VehicleListItem } from '@/entities/vehicle';
import { formatMileageKm } from '@/shared/lib/vehicle';
import { CarBrandMark } from '@/shared/ui/CarBrandMark';
import { RuLicensePlate } from '@/shared/ui/RuLicensePlate';

import styles from './StationVehiclesList.module.scss';

type StationVehiclesListProps = {
  vehicles: VehicleListItem[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

function formatUpdatedAt(value: string): string {
  const date = parseISO(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, 'd MMM yyyy', { locale: ru });
}

function vehicleIdLabel(item: VehicleListItem): string {
  if (item.vin?.trim()) {
    return `VIN ${item.vin}`;
  }

  if (item.chassis_number?.trim()) {
    return `Шасси ${item.chassis_number}`;
  }

  return 'Без VIN/шасси';
}

export function StationVehiclesList({
  vehicles,
  page,
  pageSize,
  total,
  onPageChange,
}: StationVehiclesListProps) {
  const showPagination = total > pageSize;

  return (
    <div className={styles.root}>
      <ul className={styles.grid}>
        {vehicles.map((vehicle) => {
          const lastStatus = vehicle.last_repair?.status as RepairStatus | undefined;

          return (
            <li key={vehicle.id}>
              <Link className={styles.card} to={`/vehicles/${vehicle.id}`}>
                <div className={styles.cardTop}>
                  <span className={styles.modelRow}>
                    <CarBrandMark carModel={vehicle.car_model} />
                    <span className={styles.model}>{vehicle.car_model}</span>
                  </span>
                  {lastStatus ? (
                    <Tag color={repairStatusColors[lastStatus]}>
                      {repairStatusLabels[lastStatus]}
                    </Tag>
                  ) : (
                    <Tag>Без заказов</Tag>
                  )}
                </div>
                <RuLicensePlate value={vehicle.license_plate} />
                <p className={styles.client}>{vehicle.client_name || 'Клиент не указан'}</p>
                <p className={styles.meta}>{vehicleIdLabel(vehicle)}</p>
                <div className={styles.cardBottom}>
                  <span>
                    {typeof vehicle.mileage === 'number'
                      ? formatMileageKm(vehicle.mileage)
                      : 'Пробег не указан'}
                  </span>
                  <span>
                    {vehicle.repairs_count} {vehicle.repairs_count === 1 ? 'заказ' : 'заказов'}
                    {vehicle.last_repair
                      ? ` · ${formatUpdatedAt(vehicle.last_repair.updated_at)}`
                      : ''}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      {showPagination ? (
        <Pagination
          className={styles.pagination}
          current={page}
          hideOnSinglePage
          pageSize={pageSize}
          showSizeChanger={false}
          showTotal={(count) => `Всего ${count}`}
          total={total}
          onChange={onPageChange}
        />
      ) : null}
    </div>
  );
}
