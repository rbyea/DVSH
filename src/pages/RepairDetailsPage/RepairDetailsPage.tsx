import { Button, Modal, Result, Select, Spin, Tag } from 'antd';
import clsx from 'clsx';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Bounce, toast } from 'react-toastify';

import {
  clientConfirmStatusColors,
  clientConfirmStatusLabels,
  estimateStatusColors,
  estimateStatusLabels,
  isRepairLocked,
  repairStatusLabels,
  useGetRepairQuery,
  useUpdateRepairStatusMutation,
  useUpdateWorkItemMutation,
  type RepairStatus,
} from '@/entities/repair-order';
import { useGetVehicleQuery, type VehicleRepairHistory } from '@/entities/vehicle';
import { getErrorMessage } from '@/shared/lib/api';
import { extractPublicToken, getPublicRepairPath } from '@/shared/lib/public-repair';
import { RepairClientConfirmPanel } from '@/widgets/RepairClientConfirmPanel';
import { RepairClientPanel } from '@/widgets/RepairClientPanel';
import { RepairDetailsEditor } from '@/widgets/RepairDetailsEditor';
import { RepairEstimatePanel } from '@/widgets/RepairEstimatePanel';
import { RepairPartsChecklist } from '@/widgets/RepairPartsChecklist';
import { RepairPublicLinkPanel } from '@/widgets/RepairPublicLinkPanel';
import { RepairVehiclePanel } from '@/widgets/RepairVehiclePanel';
import { RepairWorksChecklist } from '@/widgets/RepairWorksChecklist';
import { RepairWorksList } from '@/widgets/RepairWorksList';

import styles from './RepairDetailsPage.module.scss';

type LocationState = {
  justCreated?: boolean;
};

const statusClassName: Record<RepairStatus, string> = {
  new: styles.status_new,
  pending_approval: styles.status_pending_approval,
  in_progress: styles.status_in_progress,
  waiting_parts: styles.status_waiting_parts,
  done: styles.status_done,
  completed: styles.status_completed,
};

const editableStatusOptions = (Object.keys(repairStatusLabels) as RepairStatus[])
  .filter((value) => value !== 'completed')
  .map((value) => ({
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
  const navigate = useNavigate();
  const justCreated = Boolean((location.state as LocationState | null)?.justCreated);
  const [showCreatedBanner, setShowCreatedBanner] = useState(justCreated);

  const {
    data: repair,
    isLoading,
    isError,
  } = useGetRepairQuery(repairId, {
    skip: !repairId,
  });
  const { data: vehicleCard } = useGetVehicleQuery(repair?.vehicle.id ?? '', {
    skip: !repair?.vehicle.id,
  });
  const [updateStatus, { isLoading: isStatusUpdating }] = useUpdateRepairStatusMutation();
  const [updateWorkItem, { isLoading: isWorkUpdating }] = useUpdateWorkItemMutation();
  const isStatusBusy = isStatusUpdating || isWorkUpdating;

  useEffect(() => {
    if (justCreated) {
      setShowCreatedBanner(true);
    }
  }, [justCreated]);

  const handleDismissCreatedBanner = () => {
    setShowCreatedBanner(false);
    navigate(location.pathname, { replace: true, state: null });
  };

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
  const isLocked = isRepairLocked(repair);
  const confirmStatus = repair.client_confirm_status ?? null;
  const isEstimatePending = repair.estimate_status === 'pending';
  const vehicleHistory: VehicleRepairHistory[] = (vehicleCard?.repairs ?? []).map((item) => ({
    id: String(item.id),
    order_number: item.order_number,
    title: item.title ?? repairStatusLabels[item.status] ?? item.order_number,
    status: item.status,
    completed_at: item.status === 'done' || item.status === 'completed' ? item.updated_at : null,
    updated_at: item.updated_at,
    mileage: item.mileage ?? null,
    total: item.total,
    work_items: item.work_items,
  }));

  const markAllWorksDone = async () => {
    const incompleteWorks = repair.work_items.filter((item) => !item.is_done);

    if (incompleteWorks.length === 0) {
      return;
    }

    await Promise.all(
      incompleteWorks.map((item) =>
        updateWorkItem({
          repairId: repair.id,
          workItemId: item.id,
          body: { is_done: true },
        }).unwrap(),
      ),
    );
  };

  const handleStatusChange = async (status: RepairStatus) => {
    if (isLocked || status === 'completed') {
      return;
    }

    if (isEstimatePending && status === 'done') {
      toast.warning('Сначала дождитесь согласования сметы клиентом', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    try {
      if (status === 'done') {
        await markAllWorksDone();
      }

      await updateStatus({ repairId: repair.id, status }).unwrap();
      toast.success(
        status === 'done' && repair.work_items.length > 0
          ? 'Статус «Готово»: все работы отмечены выполненными'
          : 'Статус обновлён',
        {
          position: 'top-right',
          transition: Bounce,
        },
      );
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось обновить статус'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  const handleIssueVehicle = () => {
    Modal.confirm({
      title: 'Автомобиль выдан клиенту?',
      content:
        'Заказ-наряд перейдёт в статус «Выдан». Редактирование будет недоступно, пока клиент не подтвердит данные по публичной ссылке (работы, имя, VIN, пробег) или не сообщит об ошибке.',
      okText: 'Выдан',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          await markAllWorksDone();
          await updateStatus({ repairId: repair.id, status: 'completed' }).unwrap();
          toast.success('Автомобиль выдан. Ожидаем подтверждение клиента', {
            position: 'top-right',
            transition: Bounce,
          });
        } catch (error) {
          toast.error(getErrorMessage(error, 'Не удалось закрыть заказ-наряд'), {
            position: 'top-right',
            transition: Bounce,
          });
          throw error;
        }
      },
    });
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

      <header className={styles.pageHead}>
        <p className={styles.eyebrow}>Ремонт</p>
        <h1 className={styles.pageTitle}>Заказ-наряд {repair.order_number}</h1>
      </header>

      {repair.status === 'completed' && confirmStatus ? (
        <RepairClientConfirmPanel repair={repair} />
      ) : isLocked ? (
        <div className={styles.lockedBanner}>
          <div>
            <p className={styles.lockedBannerTitle}>Автомобиль выдан</p>
            <p className={styles.lockedBannerText}>
              Заказ-наряд закрыт. Данные зафиксированы в карточке, редактирование недоступно.
            </p>
          </div>
          <Tag color="default">Выдан</Tag>
        </div>
      ) : null}

      <section className={styles.grid}>
        <RepairClientPanel
          client={repair.client}
          formatDateTime={formatDateTime}
          readOnly={isLocked}
          repairId={repair.id}
          updatedAt={repair.updated_at}
        />
        <RepairVehiclePanel
          readOnly={isLocked}
          repairId={repair.id}
          repairMileage={repair.mileage}
          vehicle={repair.vehicle}
        />
      </section>

      <RepairWorksList defaultOpen excludeRepairId={repair.id} repairs={vehicleHistory} />

      {showCreatedBanner ? (
        <RepairPublicLinkPanel
          highlight
          publicToken={repair.public_token}
          publicUrl={repair.public_url}
          onDismiss={handleDismissCreatedBanner}
        />
      ) : null}

      <section className={clsx(styles.hero, statusClassName[repair.status])}>
        <div className={styles.heroTop}>
          <div>
            <p className={styles.eyebrow}>Текущий статус</p>
            <h2 className={styles.heroTitle}>{repairStatusLabels[repair.status]}</h2>
          </div>
          <div className={styles.statusControl}>
            {repair.estimate_status ? (
              <Tag color={estimateStatusColors[repair.estimate_status]}>
                {estimateStatusLabels[repair.estimate_status]}
              </Tag>
            ) : null}
            {confirmStatus ? (
              <Tag color={clientConfirmStatusColors[confirmStatus]}>
                {clientConfirmStatusLabels[confirmStatus]}
              </Tag>
            ) : null}
            {isLocked ? (
              <Tag color="default">Выдан</Tag>
            ) : (
              <Select<RepairStatus>
                className={styles.statusSelect}
                disabled={isStatusBusy}
                options={editableStatusOptions}
                size="large"
                value={repair.status}
                onChange={(value) => {
                  void handleStatusChange(value);
                }}
              />
            )}
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

        {repair.status === 'done' ? (
          <div className={styles.issueActions}>
            <Button loading={isStatusBusy} size="large" type="primary" onClick={handleIssueVehicle}>
              Автомобиль выдан
            </Button>
          </div>
        ) : null}
      </section>

      <section className={styles.paramsBlock}>
        <RepairDetailsEditor readOnly={isLocked} repair={repair} />
        <div className={styles.estimateSection}>
          <RepairEstimatePanel embedded readOnly={isLocked} repair={repair} />
        </div>
      </section>

      <section className={styles.split}>
        <article className={styles.panel}>
          <RepairWorksChecklist
            executionLocked={isEstimatePending}
            readOnly={isLocked}
            repairId={repair.id}
            workItems={repair.work_items}
          />
        </article>

        <article className={styles.panel}>
          <RepairPartsChecklist
            parts={repair.ordered_parts}
            readOnly={isLocked}
            repairId={repair.id}
          />
        </article>
      </section>

      {!showCreatedBanner ? (
        <RepairPublicLinkPanel publicToken={repair.public_token} publicUrl={repair.public_url} />
      ) : null}
    </div>
  );
}
