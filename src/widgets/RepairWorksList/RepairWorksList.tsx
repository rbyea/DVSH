import { Modal, Tag } from 'antd';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useState } from 'react';

import { repairStatusColors, repairStatusLabels, type RepairStatus } from '@/entities/repair-order';
import type { VehicleRepairHistory } from '@/entities/vehicle';
import { formatMileageKm } from '@/shared/lib/vehicle';

import styles from './RepairWorksList.module.scss';

type RepairWorksListProps = {
  repairs: VehicleRepairHistory[];
  /** Exclude current open repair from history on details page. */
  excludeRepairId?: string;
  defaultOpen?: boolean;
  title?: string;
  emptyText?: string;
  showWhenEmpty?: boolean;
};

function formatHistoryDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = parseISO(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, 'd MMM yyyy', { locale: ru });
}

/** Prefer done works; if API omits is_done, show full list. */
function getRepairWorkLines(repair: VehicleRepairHistory): string[] {
  const items = repair.work_items ?? [];
  const doneTitles = items
    .filter((item) => item.is_done === true)
    .map((item) => item.title?.trim())
    .filter((title): title is string => Boolean(title));

  if (doneTitles.length > 0) {
    return doneTitles;
  }

  const allTitles = items
    .map((item) => item.title?.trim())
    .filter((title): title is string => Boolean(title));

  if (allTitles.length > 0) {
    return allTitles;
  }

  if (repair.title?.trim()) {
    return [repair.title.trim()];
  }

  return [];
}

function HistoryRows({ repairs }: { repairs: VehicleRepairHistory[] }) {
  const mileageTimeline = [...repairs]
    .reverse()
    .filter((item) => typeof item.mileage === 'number')
    .map((item) => ({
      orderNumber: item.order_number,
      mileage: item.mileage as number,
    }));

  return (
    <div className={styles.body}>
      {mileageTimeline.length > 0 ? (
        <p className={styles.mileageLine}>
          <span className={styles.mileageLineLabel}>Пробег</span>
          {mileageTimeline.map((point, index) => (
            <span key={`${point.orderNumber}-${point.mileage}`}>
              {index > 0 ? <span className={styles.mileageArrow}>→</span> : null}
              {formatMileageKm(point.mileage)}
            </span>
          ))}
        </p>
      ) : null}

      <ul className={styles.list}>
        {repairs.map((repair) => {
          const status = repair.status as RepairStatus;
          const dateLabel =
            formatHistoryDate(repair.completed_at) ?? formatHistoryDate(repair.updated_at);
          const workLines = getRepairWorkLines(repair);

          return (
            <li className={styles.row} key={repair.id}>
              <div className={styles.rowHead}>
                <span className={styles.order}>{repair.order_number}</span>
                {dateLabel ? <span className={styles.metaItem}>{dateLabel}</span> : null}
                {typeof repair.mileage === 'number' ? (
                  <span className={styles.mileageBadge}>{formatMileageKm(repair.mileage)}</span>
                ) : null}
                <Tag className={styles.statusTag} color={repairStatusColors[status] ?? 'default'}>
                  {repairStatusLabels[status] ?? repair.status}
                </Tag>
              </div>
              <p className={styles.worksLine}>
                {workLines.length > 0 ? workLines.join(' · ') : 'Список работ не сохранён'}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function RepairWorksList({
  repairs,
  excludeRepairId,
  title = 'История по этому авто',
  emptyText = 'У этого автомобиля пока нет прошлых заказ-нарядов',
  showWhenEmpty = false,
}: RepairWorksListProps) {
  const previousRepairs = repairs.filter(
    (repair) => !excludeRepairId || String(repair.id) !== String(excludeRepairId),
  );
  const [isOpen, setIsOpen] = useState(false);

  if (previousRepairs.length === 0) {
    if (!showWhenEmpty) {
      return null;
    }

    return (
      <section className={styles.panel}>
        <div className={styles.toggleStatic}>
          <span className={styles.toggleMain}>
            <span className={styles.title}>{title}</span>
            <span className={styles.hint}>{emptyText}</span>
          </span>
          <span className={styles.count}>0</span>
        </div>
      </section>
    );
  }

  const latest = previousRepairs[0];
  const latestWorks = getRepairWorkLines(latest);
  const collapsedMileage =
    typeof latest.mileage === 'number' ? ` · ${formatMileageKm(latest.mileage)}` : '';

  return (
    <section className={styles.panel}>
      <button
        aria-haspopup="dialog"
        className={styles.toggle}
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <span className={styles.toggleMain}>
          <span className={styles.title}>{title}</span>
          <span className={styles.hint}>
            Последний: {latest.order_number}
            {collapsedMileage}
            {latestWorks[0] ? ` · ${latestWorks[0]}` : ''}
            {latestWorks.length > 1 ? ` (+${latestWorks.length - 1})` : ''}
          </span>
        </span>
        <span className={styles.toggleMeta}>
          <span className={styles.count}>{previousRepairs.length}</span>
        </span>
      </button>

      <Modal
        destroyOnHidden
        footer={null}
        open={isOpen}
        title={title}
        width="min(640px, calc(100vw - 16px))"
        onCancel={() => setIsOpen(false)}
      >
        <HistoryRows repairs={previousRepairs} />
      </Modal>
    </section>
  );
}
