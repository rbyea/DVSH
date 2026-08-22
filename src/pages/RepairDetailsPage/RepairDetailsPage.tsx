import { Button, DatePicker, Input, Modal, Result, Select, Spin, Tag } from 'antd';
import clsx from 'clsx';
import { format, parseISO } from 'date-fns';
import dayjs, { type Dayjs } from 'dayjs';
import { ru } from 'date-fns/locale';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Bounce, toast } from 'react-toastify';

import {
  estimateStatusColors,
  estimateStatusLabels,
  getRepairCostBreakdown,
  isRepairLocked,
  needsPublicEstimateDecision,
  resolveStatusAfterEstimate,
  repairStatusLabels,
  useGetRepairQuery,
  useUpdateRepairMutation,
  useUpdateRepairStatusMutation,
  useUpdateWorkItemMutation,
  type RepairStatus,
} from '@/entities/repair-order';
import { useGetVehicleQuery, type VehicleRepairHistory } from '@/entities/vehicle';
import { printRepairWork } from '@/features/repair-order/print';
import { getErrorMessage } from '@/shared/lib/api';
import { disablePastDates, isPastCalendarDate } from '@/shared/lib/date';
import { parseMoney } from '@/shared/lib/money';
import { RepairClientConfirmPanel } from '@/widgets/RepairClientConfirmPanel';
import { RepairClientPanel } from '@/widgets/RepairClientPanel';
import { RepairDiagnosticsPanel } from '@/widgets/RepairDiagnosticsPanel';
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
  revision: styles.status_revision,
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

function formatMoney(value: number | string | null | undefined): string {
  const amount = parseMoney(value);

  if (amount == null || amount <= 0) {
    return '—';
  }

  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function RepairDetailsPage() {
  const { repairId = '' } = useParams<{ repairId: string }>();
  const location = useLocation();
  const justCreated = Boolean((location.state as LocationState | null)?.justCreated);
  const [highlightPublicLink, setHighlightPublicLink] = useState(justCreated);
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');

  const {
    data: repair,
    isLoading,
    isError,
  } = useGetRepairQuery(repairId, {
    skip: !repairId,
  });

  const activeHistoryVehicleId = repair?.vehicle.id ?? '';

  const { data: vehicleCard } = useGetVehicleQuery(activeHistoryVehicleId, {
    skip: !activeHistoryVehicleId,
  });
  const [updateStatus, { isLoading: isStatusUpdating }] = useUpdateRepairStatusMutation();
  const [updateRepair, { isLoading: isRepairUpdating }] = useUpdateRepairMutation();
  const [updateWorkItem, { isLoading: isWorkUpdating }] = useUpdateWorkItemMutation();
  const isStatusBusy = isStatusUpdating || isRepairUpdating || isWorkUpdating;
  const syncedAfterEstimateRef = useRef<string | null>(null);

  useEffect(() => {
    if (justCreated) {
      setHighlightPublicLink(true);
    }
  }, [justCreated]);

  useEffect(() => {
    if (!isEditingComment) {
      setCommentDraft(repair?.comment ?? '');
    }
  }, [repair, isEditingComment]);

  useEffect(() => {
    if (!repair || isRepairLocked(repair)) {
      return;
    }

    if (repair.status !== 'pending_approval') {
      return;
    }

    if (repair.estimate_status !== 'approved' && repair.estimate_status !== 'declined') {
      syncedAfterEstimateRef.current = null;
      return;
    }

    const nextStatus = resolveStatusAfterEstimate(repair.status, repair.estimate_status);
    const syncKey = `${repair.id}:${repair.estimate_status}:${repair.estimate_decided_at ?? ''}`;

    if (nextStatus === repair.status || syncedAfterEstimateRef.current === syncKey) {
      return;
    }

    syncedAfterEstimateRef.current = syncKey;
    void updateRepair({
      repairId: repair.id,
      body: {
        status: nextStatus,
        estimate_status: repair.estimate_status,
        estimate_comment: repair.estimate_comment ?? null,
      },
    });
  }, [repair, updateRepair]);

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
  const costBreakdown = getRepairCostBreakdown({
    workItems: repair.work_items,
    orderedParts: repair.ordered_parts,
  });
  const amountDue =
    costBreakdown.calculatedTotal > 0 ? costBreakdown.calculatedTotal : parseMoney(repair.total);
  const isLocked = isRepairLocked(repair);
  const confirmStatus = repair.client_confirm_status ?? null;
  const isEstimatePending = needsPublicEstimateDecision(repair);
  const displayStatus = resolveStatusAfterEstimate(repair.status, repair.estimate_status);
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
  const historyVehicleLabel = vehicleCard
    ? [vehicleCard.car_model, vehicleCard.license_plate].filter(Boolean).join(' · ')
    : null;
  const historyTitle = historyVehicleLabel
    ? `История · ${historyVehicleLabel}`
    : 'История по этому авто';

  const handleSaveReadyDate = async (value: Dayjs | null) => {
    if (isLocked) {
      return;
    }

    if (isPastCalendarDate(value)) {
      toast.warning('Дата выдачи не может быть в прошлом', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    try {
      await updateRepair({
        repairId: repair.id,
        body: { planned_ready_at: value?.format('YYYY-MM-DD') ?? null },
      }).unwrap();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось сохранить дату выдачи'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  const handleSaveComment = async () => {
    if (isLocked) {
      return;
    }

    try {
      await updateRepair({
        repairId: repair.id,
        body: { comment: commentDraft.trim() || null },
      }).unwrap();
      setIsEditingComment(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось сохранить комментарий'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

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

    if ((isEstimatePending || repair.estimate_status === 'declined') && status === 'done') {
      toast.warning(
        isEstimatePending
          ? 'Клиент ещё не согласовал работы по ссылке'
          : 'Сначала измените работы и отправьте клиенту снова',
        {
          position: 'top-right',
          transition: Bounce,
        },
      );
      return;
    }

    try {
      if (status === 'done') {
        await markAllWorksDone();
      }

      if (status === 'pending_approval') {
        await updateRepair({
          repairId: repair.id,
          body: {
            status: 'pending_approval',
            estimate_status: 'pending',
          },
        }).unwrap();
      } else if (repair.estimate_status === 'approved' || repair.estimate_status === 'declined') {
        await updateRepair({
          repairId: repair.id,
          body: {
            status,
            estimate_status: repair.estimate_status,
            estimate_comment: repair.estimate_comment ?? null,
          },
        }).unwrap();
      } else {
        await updateStatus({ repairId: repair.id, status }).unwrap();
      }
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
      title: 'Выдать автомобиль клиенту?',
      content:
        'После выдачи история ремонта сохранится в карточке клиента. Заказ-наряд перейдёт в статус «Выдан». Редактирование будет недоступно, пока клиент не подтвердит данные по публичной ссылке (работы, имя, VIN, пробег) или не сообщит об ошибке.',
      okText: 'Выдать автомобиль',
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

  const handlePrintWork = () => {
    const printed = printRepairWork(repair);

    if (!printed) {
      toast.error('Не удалось открыть печать. Попробуйте ещё раз', {
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
        {repair.status === 'done' || repair.status === 'completed' ? (
          <Button size="large" type="default" onClick={handlePrintWork}>
            Распечатать выполненную работу
          </Button>
        ) : null}
      </div>

      <header className={styles.pageHead}>
        <p className={styles.eyebrow}>Ремонт</p>
        <h1 className={styles.pageTitle}>Заказ-наряд {repair.order_number}</h1>
      </header>

      <section className={clsx(styles.hero, statusClassName[displayStatus])}>
        <div className={styles.heroTop}>
          <div>
            <p className={styles.eyebrow}>Текущий статус</p>
            <h2 className={styles.heroTitle}>{repairStatusLabels[displayStatus]}</h2>
          </div>
          <div className={styles.statusControl}>
            {repair.estimate_status ? (
              <Tag color={estimateStatusColors[repair.estimate_status]}>
                {estimateStatusLabels[repair.estimate_status]}
              </Tag>
            ) : null}
            {isLocked ? (
              <Tag color="default">Выдан</Tag>
            ) : (
              <Select<RepairStatus>
                className={styles.statusSelect}
                disabled={isStatusBusy}
                options={editableStatusOptions.map((option) =>
                  option.value === 'done' &&
                  (isEstimatePending || repair.estimate_status === 'declined')
                    ? {
                        ...option,
                        disabled: true,
                        label: isEstimatePending
                          ? 'Готово · ждём клиента'
                          : 'Готово · сначала отправьте снова',
                      }
                    : option,
                )}
                size="large"
                value={displayStatus}
                onChange={(value) => {
                  void handleStatusChange(value);
                }}
              />
            )}
          </div>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>К оплате</span>
            <span className={styles.statValue}>{formatMoney(amountDue)}</span>
            <span className={styles.statHint}>
              {costBreakdown.calculatedTotal > 0
                ? 'работы, доп. работы и запчасти'
                : repair.estimate_status
                  ? estimateStatusLabels[repair.estimate_status]
                  : 'стоимость появится после добавления работ'}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Выдача</span>
            {isLocked ? (
              <span className={styles.statValue}>{formatDate(repair.planned_ready_at)}</span>
            ) : (
              <DatePicker
                allowClear
                bordered={false}
                className={styles.readyDate}
                disabled={isRepairUpdating}
                disabledDate={disablePastDates}
                format="DD.MM.YYYY"
                placeholder="Не указана"
                suffixIcon={null}
                value={repair.planned_ready_at ? dayjs(repair.planned_ready_at) : null}
                onChange={(value) => {
                  void handleSaveReadyDate(value);
                }}
              />
            )}
            <span className={styles.statHint}>
              {isLocked ? 'плановая дата' : 'нажмите, чтобы изменить'}
            </span>
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

        {isLocked && !repair.comment?.trim() ? null : (
          <div className={styles.masterNote}>
            {isEditingComment && !isLocked ? (
              <div className={styles.masterNoteEdit}>
                <Input.TextArea
                  autoFocus
                  placeholder="Что важно не забыть по этому ремонту"
                  rows={2}
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                />
                <div className={styles.masterNoteActions}>
                  <Button
                    size="small"
                    onClick={() => {
                      setCommentDraft(repair.comment ?? '');
                      setIsEditingComment(false);
                    }}
                  >
                    Отмена
                  </Button>
                  <Button
                    loading={isRepairUpdating}
                    size="small"
                    type="primary"
                    onClick={() => void handleSaveComment()}
                  >
                    Сохранить
                  </Button>
                </div>
              </div>
            ) : (
              <button
                className={styles.masterNoteButton}
                disabled={isLocked}
                type="button"
                onClick={() => {
                  if (!isLocked) {
                    setIsEditingComment(true);
                  }
                }}
              >
                <span className={styles.statLabel}>Комментарий мастера</span>
                <span className={styles.masterNoteText}>
                  {repair.comment?.trim() || 'Добавить заметку к заказу'}
                </span>
              </button>
            )}
          </div>
        )}

        {repair.status === 'done' ? (
          <div className={styles.issueActions}>
            <Button loading={isStatusBusy} size="large" type="primary" onClick={handleIssueVehicle}>
              Выдать автомобиль
            </Button>
            <p className={styles.issueHint}>
              После выдачи история ремонта сохранится в карточке клиента
            </p>
          </div>
        ) : null}
      </section>

      {repair.estimate_status === 'declined' && !isLocked ? (
        <div className={styles.commentPanel}>
          <p className={styles.lockedBannerTitle}>Изменение работ</p>
          {repair.estimate_comment?.trim() ? (
            <p className={styles.commentText}>«{repair.estimate_comment.trim()}»</p>
          ) : (
            <p className={styles.lockedBannerText}>Клиент не оставил комментарий.</p>
          )}
          <p className={styles.lockedBannerText}>
            Измените работы или запчасти и отправьте список клиенту снова.
          </p>
        </div>
      ) : null}

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

      <RepairPublicLinkPanel
        estimateStatus={repair.estimate_status}
        highlight={highlightPublicLink}
        publicToken={repair.public_token}
        publicUrl={repair.public_url}
        readOnly={isLocked}
        repairId={repair.id}
        repairStatus={repair.status}
      />

      <section className={styles.grid}>
        <RepairClientPanel
          client={repair.client}
          currentVehicleId={repair.vehicle.id}
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

      <RepairWorksList
        emptyText="У этого автомобиля пока нет прошлых заказ-нарядов"
        excludeRepairId={repair.id}
        repairs={vehicleHistory}
        showWhenEmpty
        title={historyTitle}
      />

      <RepairDiagnosticsPanel
        readOnly={isLocked}
        repairId={repair.id}
        vehicleVin={repair.vehicle.vin}
      />

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

      <section className={styles.panel}>
        <RepairWorksChecklist
          executionLocked={isEstimatePending}
          isExtra
          readOnly={isLocked}
          repairId={repair.id}
          workItems={repair.work_items}
        />
      </section>

      <section className={styles.costSummary}>
        <div className={styles.costSummaryHead}>
          <h2 className={styles.costSummaryTitle}>Итоги</h2>
          <p className={styles.costSummaryHint}>
            Работы, доп. работы и запчасти · к оплате считается автоматически
          </p>
        </div>
        <div className={styles.costGrid}>
          <div className={styles.costItem}>
            <span className={styles.costLabel}>Работы</span>
            <span className={styles.costValue}>{formatMoney(costBreakdown.worksTotal)}</span>
          </div>
          <div className={styles.costItem}>
            <span className={styles.costLabel}>Доп. работы</span>
            <span className={styles.costValue}>{formatMoney(costBreakdown.extraWorksTotal)}</span>
          </div>
          <div className={styles.costItem}>
            <span className={styles.costLabel}>Запчасти</span>
            <span className={styles.costValue}>{formatMoney(costBreakdown.partsTotal)}</span>
          </div>
          <div className={clsx(styles.costItem, styles.costItemAccent)}>
            <span className={styles.costLabel}>К оплате</span>
            <span className={styles.costValue}>{formatMoney(amountDue)}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
