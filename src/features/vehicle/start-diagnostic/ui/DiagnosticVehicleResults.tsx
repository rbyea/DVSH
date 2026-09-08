import { Spin } from 'antd';

import type { VehicleSearchResult } from '@/entities/vehicle';
import { RuLicensePlate } from '@/shared/ui/RuLicensePlate';

import styles from './DiagnosticVehicleResults.module.scss';

const VISIBLE_LIMIT = 8;

type DiagnosticVehicleResultsProps = {
  results: VehicleSearchResult[];
  isSearching: boolean;
  adoptingId: string | null;
  onPick: (vehicle: VehicleSearchResult) => void;
};

export function DiagnosticVehicleResults({
  results,
  isSearching,
  adoptingId,
  onPick,
}: DiagnosticVehicleResultsProps) {
  if (isSearching) {
    return (
      <div className={styles.loading} role="status">
        <Spin />
        <span>Ищем машину в общей базе…</span>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <p className={styles.empty}>Машина не найдена. Можно завести её, если авто ещё нет в базе.</p>
    );
  }

  const visible = results.slice(0, VISIBLE_LIMIT);
  const hasMore = results.length > VISIBLE_LIMIT;

  return (
    <div className={styles.wrap}>
      <ul className={styles.list}>
        {visible.map((vehicle) => (
          <li key={vehicle.id}>
            <button
              className={styles.row}
              disabled={adoptingId !== null}
              type="button"
              onClick={() => onPick(vehicle)}
            >
              <span className={styles.plate}>
                <RuLicensePlate value={vehicle.license_plate} />
              </span>
              <span>{vehicle.car_model}</span>
              <span>{vehicle.vin?.trim() || vehicle.chassis_number?.trim() || '—'}</span>
              <span>
                {vehicle.client_name}
                {vehicle.is_own_station === false ? (
                  <span className={styles.shared}> · общая база</span>
                ) : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {hasMore ? (
        <p className={styles.more}>
          Показаны первые {VISIBLE_LIMIT}. Уточните госномер или VIN — иначе совпадений слишком
          много.
        </p>
      ) : null}
    </div>
  );
}
