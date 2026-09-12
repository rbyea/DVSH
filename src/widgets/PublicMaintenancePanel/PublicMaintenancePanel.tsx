import { useMemo } from 'react';

import type { PublicMaintenanceItem } from '@/entities/repair-order';
import {
  buildMaintenancePlan,
  MaintenanceScheduleChart,
  useGetVehicleMaintenanceQuery,
  useSearchVehiclesQuery,
  type VehicleSearchResult,
} from '@/entities/vehicle';
import { hasAccessToken } from '@/shared/lib/auth';
import { formatMileageKm } from '@/shared/lib/vehicle';

import styles from './PublicMaintenancePanel.module.scss';

const EMPTY_ITEMS: PublicMaintenanceItem[] = [];

type PublicMaintenancePanelProps = {
  items?: PublicMaintenanceItem[] | null;
  mileage?: number | null;
  vin?: string | null;
  licensePlate?: string | null;
};

function normalizeKey(value?: string | null): string {
  return value?.replace(/\s+/g, '').toUpperCase() ?? '';
}

function pickOwnVehicle(
  hits: VehicleSearchResult[],
  vin?: string | null,
  licensePlate?: string | null,
): VehicleSearchResult | undefined {
  const vinKey = normalizeKey(vin);
  const plateKey = normalizeKey(licensePlate);
  const own = hits.filter((hit) => hit.is_own_station !== false);
  const pool = own.length > 0 ? own : hits;

  return (
    pool.find((hit) => {
      const hitVin = normalizeKey(hit.vin);
      const hitPlate = normalizeKey(hit.license_plate);

      return (vinKey && hitVin === vinKey) || (plateKey && hitPlate === plateKey);
    }) ?? pool[0]
  );
}

export function PublicMaintenancePanel({
  items,
  mileage,
  vin,
  licensePlate,
}: PublicMaintenancePanelProps) {
  const publicItems = items ?? EMPTY_ITEMS;
  const searchQuery = vin?.trim() || licensePlate?.trim() || '';
  const canLookup = publicItems.length === 0 && hasAccessToken() && Boolean(searchQuery);
  const { data: searchHits = [] } = useSearchVehiclesQuery(searchQuery, {
    skip: !canLookup,
  });
  const ownVehicle = canLookup ? pickOwnVehicle(searchHits, vin, licensePlate) : undefined;
  const { data: authItems = [] } = useGetVehicleMaintenanceQuery(ownVehicle?.id ?? '', {
    skip: !ownVehicle?.id,
  });

  const plan = useMemo(
    () =>
      buildMaintenancePlan({
        mileage: mileage ?? ownVehicle?.mileage,
        items: publicItems.length > 0 ? publicItems : authItems,
      }),
    [authItems, mileage, ownVehicle?.mileage, publicItems],
  );

  if (plan.rows.length === 0) {
    return null;
  }

  return (
    <section className={styles.root}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Регламент ТО</h2>
          <p className={styles.hint}>Что менять и когда — по пробегу этой машины</p>
        </div>
        {plan.currentKm != null ? (
          <p className={styles.mileage}>{formatMileageKm(plan.currentKm)}</p>
        ) : null}
      </div>
      <MaintenanceScheduleChart compact plan={plan} />
    </section>
  );
}
