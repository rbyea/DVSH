import type { CSSProperties } from 'react';

import { formatMileageKm } from '@/shared/lib/vehicle';

import {
  formatMaintenanceRowHint,
  formatMaintenanceStopLabel,
  type MaintenancePlan,
} from '../model/maintenance';

import styles from './MaintenanceScheduleChart.module.scss';

type MaintenanceScheduleChartProps = {
  plan: MaintenancePlan;
  compact?: boolean;
};

export function MaintenanceScheduleChart({ plan, compact }: MaintenanceScheduleChartProps) {
  if (plan.rows.length === 0 || plan.stops.length === 0) {
    return null;
  }

  return (
    <div className={styles.root} data-compact={compact || undefined}>
      <div className={styles.legend}>
        <span>
          <i className={`${styles.dot} ${styles.dotNext}`} /> следующая замена
        </span>
        <span>
          <i className={`${styles.dot} ${styles.dotFuture}`} /> потом
        </span>
        <span>
          <i className={`${styles.dot} ${styles.dotPast}`} /> уже меняли
        </span>
      </div>

      <div className={styles.chartScroll}>
        <div
          className={styles.chart}
          style={
            {
              '--cols': plan.stops.length,
              '--marker': plan.markerProgress ?? 0,
            } as CSSProperties
          }
        >
          {plan.markerProgress != null ? <div className={styles.marker} aria-hidden /> : null}

          <div className={styles.axis}>
            <span className={styles.labelCell}>Пробег</span>
            {plan.stops.map((km) => (
              <span
                className={styles.stopCell}
                data-current={plan.currentKm === km || undefined}
                key={km}
                title={formatMileageKm(km)}
              >
                {formatMaintenanceStopLabel(km)}
                {plan.currentKm === km ? <small>сейчас</small> : null}
              </span>
            ))}
          </div>

          {plan.rows.map((row) => (
            <div className={styles.chartRow} data-status={row.status} key={row.id}>
              <span className={styles.rowLabel}>
                <strong>{row.title}</strong>
                <small>{formatMaintenanceRowHint(row)}</small>
              </span>
              {plan.stops.map((km) => {
                const isStop = row.stopKms.includes(km);
                const isNext = km === row.next_due_km;
                const isPast =
                  isStop &&
                  !isNext &&
                  ((row.last_done_km != null && km === row.last_done_km) ||
                    (plan.currentKm != null && km < plan.currentKm));

                return (
                  <span className={styles.cell} key={km}>
                    {isStop ? (
                      <span
                        className={[
                          styles.dot,
                          isNext ? styles.dotNext : null,
                          isPast ? styles.dotPast : null,
                          !isNext && !isPast ? styles.dotFuture : null,
                          row.status === 'overdue' && isNext ? styles.dotOverdue : null,
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        title={`${row.title} · ${formatMileageKm(km)}`}
                      />
                    ) : null}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
