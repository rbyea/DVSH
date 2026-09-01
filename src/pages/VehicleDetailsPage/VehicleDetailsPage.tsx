import { Button, Result, Spin, Tag } from 'antd';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Link, useParams } from 'react-router-dom';

import { repairStatusColors, repairStatusLabels, type RepairStatus } from '@/entities/repair-order';
import { useGetVehicleQuery } from '@/entities/vehicle';
import { VehicleCardForm } from '@/features/vehicle/update';
import { pickLatestDiagnostic } from '@/shared/lib/diagnostics';
import { RepairDiagnosticsPanel } from '@/widgets/RepairDiagnosticsPanel';

import styles from './VehicleDetailsPage.module.scss';

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const date = parseISO(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, 'd MMM yyyy, HH:mm', { locale: ru });
}

function formatMoney(value: number | null | undefined): string {
  if (typeof value !== 'number' || value <= 0) {
    return '—';
  }

  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

export function VehicleDetailsPage() {
  const { vehicleId = '' } = useParams<{ vehicleId: string }>();
  const {
    data: vehicle,
    isLoading,
    isError,
    refetch,
  } = useGetVehicleQuery(vehicleId, {
    skip: !vehicleId,
  });

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spin />
      </div>
    );
  }

  if (isError || !vehicle) {
    return (
      <Result
        status="error"
        title="Не удалось открыть автомобиль"
        extra={
          <Button type="primary" onClick={() => void refetch()}>
            Повторить
          </Button>
        }
      />
    );
  }

  const latestDiagnostic = pickLatestDiagnostic(vehicle);
  const ownRepairs = vehicle.repairs.filter((repair) => repair.is_own_station !== false);
  const latestRepairId = ownRepairs[0]?.id ?? '';

  return (
    <main className={styles.page}>
      <div className={styles.toolbar}>
        <Link className={styles.back} to="/vehicles">
          ← К списку авто
        </Link>
        <div className={styles.actions}>
          <Link to={`/repairs/new?vehicleId=${vehicle.id}`} state={{ fromVehicleId: vehicle.id }}>
            <Button type="primary">Новый ремонт</Button>
          </Link>
        </div>
      </div>

      <section className={styles.hero}>
        <VehicleCardForm vehicle={vehicle} />
        <dl className={styles.facts}>
          <div>
            <dt>Клиент</dt>
            <dd>{vehicle.client?.name || '—'}</dd>
          </div>
          <div>
            <dt>Заказов</dt>
            <dd>{vehicle.repairs.length}</dd>
          </div>
        </dl>
      </section>

      <RepairDiagnosticsPanel
        latestDiagnostic={latestDiagnostic}
        repairId={latestRepairId}
        vehicleId={vehicle.id}
        vehicleVin={vehicle.vin}
      />

      <section className={styles.history}>
        <h2 className={styles.sectionTitle}>История заказов</h2>
        {vehicle.repairs.length === 0 ? (
          <p className={styles.empty}>По этому авто ещё не было заказ-нарядов.</p>
        ) : (
          <ul className={styles.repairs}>
            {vehicle.repairs.map((repair) => {
              const status = repair.status as RepairStatus;
              const isOwn = repair.is_own_station !== false;
              const workTitles = (repair.work_items ?? [])
                .map((item) => item.title?.trim())
                .filter((title): title is string => Boolean(title));
              const meta = (
                <>
                  <span className={styles.repairTop}>
                    <span className={styles.orderNumber}>{repair.order_number}</span>
                    <Tag color={repairStatusColors[status]}>{repairStatusLabels[status]}</Tag>
                  </span>
                  <span className={styles.repairMeta}>
                    {formatDateTime(repair.updated_at)}
                    <span aria-hidden> · </span>
                    {formatMoney(repair.total)}
                    {isOwn ? null : (
                      <>
                        <span aria-hidden> · </span>
                        другая СТО
                      </>
                    )}
                  </span>
                  <span className={styles.works}>
                    {workTitles.length > 0 ? workTitles.join(' · ') : 'Список работ не сохранён'}
                  </span>
                </>
              );

              return (
                <li key={repair.id}>
                  {isOwn ? (
                    <Link
                      className={styles.repairCard}
                      state={{ fromVehicleId: vehicle.id }}
                      to={`/repairs/${repair.id}`}
                    >
                      {meta}
                    </Link>
                  ) : (
                    <div className={styles.repairCard}>{meta}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
