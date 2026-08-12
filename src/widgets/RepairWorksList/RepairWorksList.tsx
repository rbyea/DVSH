import { Tag } from 'antd';
import clsx from 'clsx';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useState } from 'react';

import { repairStatusColors, repairStatusLabels, type RepairStatus } from '@/entities/repair-order';
import type { VehicleRepairHistory } from '@/entities/vehicle';
import { formatMileageKm } from '@/shared/lib/vehicle';

import styles from './RepairWorksList.module.scss';

const PREVIEW_COUNT = 3;

type RepairWorksListProps = {
  repairs: VehicleRepairHistory[];
  /** Exclude current open repair from history on details page. */
  excludeRepairId?: string;
  defaultOpen?: boolean;
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

function formatHistoryDateTime(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = parseISO(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, 'd MMM yyyy, HH:mm', { locale: ru });
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

export function RepairWorksList({
  repairs,
  excludeRepairId,
  defaultOpen = false,
}: RepairWorksListProps) {
  const previousRepairs = repairs.filter(
    (repair) => !excludeRepairId || String(repair.id) !== String(excludeRepairId),
  );
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);

  if (previousRepairs.length === 0) {
    return null;
  }

  const latest = previousRepairs[0];
  const visibleRepairs = showAll ? previousRepairs : previousRepairs.slice(0, PREVIEW_COUNT);
  const hiddenCount = previousRepairs.length - PREVIEW_COUNT;
  const latestWorks = getRepairWorkLines(latest);
  const mileageTimeline = [...previousRepairs]
    .reverse()
    .filter((item) => typeof item.mileage === 'number')
    .map((item) => ({
      orderNumber: item.order_number,
      mileage: item.mileage as number,
    }));

  const handleToggle = () => {
    setIsOpen((open) => {
      if (open) {
        setShowAll(false);
      }
      return !open;
    });
  };

  const collapsedMileage =
    typeof latest.mileage === 'number' ? ` · ${formatMileageKm(latest.mileage)}` : '';

  return (
    <section className={clsx(styles.panel, isOpen && styles.panelOpen)}>
      <button aria-expanded={isOpen} className={styles.toggle} type="button" onClick={handleToggle}>
        <span className={styles.toggleMain}>
          <span className={styles.title}>История по этому авто</span>
          <span className={styles.hint}>
            {isOpen
              ? 'Работы и пробег по прошлым заказ-нарядам'
              : `Последний: ${latest.order_number}${collapsedMileage}${
                  latestWorks[0] ? ` · ${latestWorks[0]}` : ''
                }${latestWorks.length > 1 ? ` (+${latestWorks.length - 1})` : ''}`}
          </span>
        </span>
        <span className={styles.toggleMeta}>
          <span className={styles.count}>{previousRepairs.length}</span>
          <span aria-hidden className={clsx(styles.chevron, isOpen && styles.chevronOpen)}>
            ▾
          </span>
        </span>
      </button>

      {isOpen ? (
        <div className={styles.body}>
          {mileageTimeline.length > 0 ? (
            <div className={styles.mileageStrip}>
              <span className={styles.mileageStripLabel}>Пробег по визитам</span>
              <p className={styles.mileageStripValues}>
                {mileageTimeline.map((point, index) => (
                  <span key={`${point.orderNumber}-${point.mileage}`}>
                    {index > 0 ? <span className={styles.mileageArrow}> → </span> : null}
                    <span className={styles.mileagePoint}>
                      {formatMileageKm(point.mileage)}
                      <span className={styles.mileageOrderHint}>{point.orderNumber}</span>
                    </span>
                  </span>
                ))}
              </p>
            </div>
          ) : null}

          <ul className={styles.list}>
            {visibleRepairs.map((repair) => {
              const status = repair.status as RepairStatus;
              const completedLabel = formatHistoryDate(repair.completed_at);
              const updatedLabel = formatHistoryDateTime(repair.updated_at);
              const hasDates = Boolean(completedLabel || updatedLabel);
              const workLines = getRepairWorkLines(repair);

              return (
                <li className={styles.card} key={repair.id}>
                  <div className={styles.cardTop}>
                    <div className={styles.cardMain}>
                      <div className={styles.orderRow}>
                        <span className={styles.order}>{repair.order_number}</span>
                        {typeof repair.mileage === 'number' ? (
                          <span className={styles.mileageBadge}>
                            {formatMileageKm(repair.mileage)}
                          </span>
                        ) : null}
                      </div>
                      <div className={styles.meta}>
                        {completedLabel ? (
                          <span className={styles.metaItem}>Выполнен · {completedLabel}</span>
                        ) : null}
                        {updatedLabel ? (
                          <span className={styles.metaItem}>Изменён · {updatedLabel}</span>
                        ) : null}
                        {!hasDates ? (
                          <span className={styles.metaItem}>Дата не указана</span>
                        ) : null}
                      </div>
                    </div>
                    <Tag color={repairStatusColors[status] ?? 'default'}>
                      {repairStatusLabels[status] ?? repair.status}
                    </Tag>
                  </div>

                  {workLines.length > 0 ? (
                    <ul className={styles.works}>
                      {workLines.map((title, index) => (
                        <li className={styles.workTitle} key={`${repair.id}-${title}-${index}`}>
                          {title}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.workTitle}>Список работ не сохранён</p>
                  )}
                </li>
              );
            })}
          </ul>

          {hiddenCount > 0 ? (
            <button
              className={styles.moreButton}
              type="button"
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll ? 'Свернуть список' : `Показать ещё ${hiddenCount}`}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
