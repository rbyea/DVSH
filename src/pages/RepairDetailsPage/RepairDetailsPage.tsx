import { Button, Result, Select, Spin, Tag } from 'antd';
import clsx from 'clsx';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Bounce, toast } from 'react-toastify';

import {
  estimateStatusColors,
  estimateStatusLabels,
  repairStatusColors,
  repairStatusLabels,
  useGetRepairQuery,
  useUpdateRepairStatusMutation,
  type RepairStatus,
} from '@/entities/repair-order';
import { getErrorMessage } from '@/shared/lib/api';
import { extractPublicToken, getPublicRepairPath } from '@/shared/lib/public-repair';
import { RepairClientPanel } from '@/widgets/RepairClientPanel';
import { RepairDetailsEditor } from '@/widgets/RepairDetailsEditor';
import { RepairEstimatePanel } from '@/widgets/RepairEstimatePanel';
import { RepairPartsChecklist } from '@/widgets/RepairPartsChecklist';
import { RepairPublicLinkPanel } from '@/widgets/RepairPublicLinkPanel';
import { RepairVehiclePanel } from '@/widgets/RepairVehiclePanel';
import { RepairWorksChecklist } from '@/widgets/RepairWorksChecklist';

import styles from './RepairDetailsPage.module.scss';

type LocationState = {
  justCreated?: boolean;
};

const statusClassName: Record<RepairStatus, string> = {
  new: styles.status_new,
  diagnostics: styles.status_diagnostics,
  in_progress: styles.status_in_progress,
  waiting_parts: styles.status_waiting_parts,
  done: styles.status_done,
};

const statusOptions = (Object.keys(repairStatusLabels) as RepairStatus[]).map((value) => ({
  value,
  label: repairStatusLabels[value],
}));

function formatDateTime(value: string): string {
  const date = parseISO(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, 'd MMM yyyy, HH:mm', { locale: ru });
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return 'Не указана';
  }

  const date = parseISO(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, 'd MMM yyyy', { locale: ru });
}

function formatMoney(total: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(total);
}

export function RepairDetailsPage() {
  const { repairId = '' } = useParams<{ repairId: string }>();
  const location = useLocation();
  const justCreated = Boolean((location.state as LocationState | null)?.justCreated);
  const [showCreatedBanner, setShowCreatedBanner] = useState(justCreated);

  const {
    data: repair,
    isLoading,
    isError,
  } = useGetRepairQuery(repairId, {
    skip: !repairId,
  });
  const [updateStatus, { isLoading: isStatusUpdating }] = useUpdateRepairStatusMutation();

  useEffect(() => {
    if (justCreated) {
      setShowCreatedBanner(true);
    }
  }, [justCreated]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spin size="large" />
      </div>
    );
  }

  if (isError || !repair) {
    return (
      <div className={styles.error}>
        <Result
          status="404"
          title="Ремонт не найден"
          subTitle="Проверьте ссылку или вернитесь к списку ремонтов."
          extra={
            <Link to="/dashboard">
              <Button type="primary">К списку ремонтов</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const doneWorks = repair.work_items.filter((item) => Boolean(item.is_done)).length;
  const totalWorks = repair.work_items.length;
  const publicToken = extractPublicToken(repair.public_token, repair.public_url);
  const publicPath = publicToken ? getPublicRepairPath(publicToken) : null;

  const handleStatusChange = async (status: RepairStatus) => {
    try {
      await updateStatus({ repairId: repair.id, status }).unwrap();
      toast.success('Статус обновлён', {
        position: 'top-right',
        transition: Bounce,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось обновить статус'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <Link to="/dashboard">
          <Button size="large">← К списку</Button>
        </Link>
        {publicPath ? (
          <Link to={publicPath} target="_blank" rel="noreferrer">
            <Button size="large" type="primary">
              Открыть для клиента
            </Button>
          </Link>
        ) : null}
      </div>

      {showCreatedBanner ? (
        <RepairPublicLinkPanel
          highlight
          publicToken={repair.public_token}
          publicUrl={repair.public_url}
          repairId={repair.id}
        />
      ) : null}

      <section className={clsx(styles.hero, statusClassName[repair.status])}>
        <div className={styles.heroTop}>
          <div>
            <p className={styles.eyebrow}>Заказ-наряд</p>
            <h1 className={styles.title}>{repair.order_number}</h1>
            <p className={styles.carLine}>
              {repair.vehicle.car_model} · {repair.vehicle.license_plate}
            </p>
          </div>
          <div className={styles.statusControl}>
            <Tag className={styles.statusTag} color={repairStatusColors[repair.status]}>
              {repairStatusLabels[repair.status]}
            </Tag>
            {repair.estimate_status ? (
              <Tag color={estimateStatusColors[repair.estimate_status]}>
                {estimateStatusLabels[repair.estimate_status]}
              </Tag>
            ) : null}
            <Select<RepairStatus>
              className={styles.statusSelect}
              disabled={isStatusUpdating}
              options={statusOptions}
              size="large"
              value={repair.status}
              onChange={(value) => {
                void handleStatusChange(value);
              }}
            />
          </div>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Сумма</span>
            <span className={styles.statValue}>{formatMoney(repair.total)}</span>
            <span className={styles.statHint}>
              {repair.estimate_status
                ? estimateStatusLabels[repair.estimate_status]
                : 'см. блок «Смета для клиента»'}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Выдача</span>
            <span className={styles.statValue}>{formatDate(repair.planned_ready_at)}</span>
            <span className={styles.statHint}>плановая дата</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Прогресс</span>
            <span className={styles.statValue}>
              {totalWorks > 0 ? `${doneWorks}/${totalWorks}` : '—'}
            </span>
            <span className={styles.statHint}>
              {totalWorks > 0 ? 'работ выполнено' : 'работы ещё не добавлены'}
            </span>
          </div>
        </div>
      </section>

      <section className={styles.grid}>
        <RepairClientPanel
          client={repair.client}
          formatDateTime={formatDateTime}
          repairId={repair.id}
          updatedAt={repair.updated_at}
        />
        <RepairVehiclePanel
          repairId={repair.id}
          repairMileage={repair.mileage}
          vehicle={repair.vehicle}
        />
      </section>

      <RepairEstimatePanel repair={repair} />

      <RepairDetailsEditor repair={repair} />

      {repair.estimate_status === 'declined' && repair.estimate_comment ? (
        <section className={styles.estimateNote}>
          <h2 className={styles.panelTitle}>Комментарий клиента по смете</h2>
          <p className={styles.estimateNoteText}>{repair.estimate_comment}</p>
        </section>
      ) : null}

      {!showCreatedBanner ? (
        <RepairPublicLinkPanel
          publicToken={repair.public_token}
          publicUrl={repair.public_url}
          repairId={repair.id}
        />
      ) : null}

      <section className={styles.split}>
        <article className={styles.panel}>
          <RepairWorksChecklist repairId={repair.id} workItems={repair.work_items} />
        </article>

        <article className={styles.panel}>
          <RepairPartsChecklist parts={repair.ordered_parts} repairId={repair.id} />
        </article>
      </section>
    </div>
  );
}
