import { Button, Input, Result, Spin, Tag } from 'antd';
import clsx from 'clsx';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bounce, toast } from 'react-toastify';

import {
  clientConfirmStatusColors,
  clientConfirmStatusLabels,
  estimateStatusColors,
  estimateStatusLabels,
  getRepairCostBreakdown,
  repairStatusColors,
  repairStatusLabels,
  useApprovePublicEstimateMutation,
  useConfirmPublicRepairMutation,
  useGetPublicRepairQuery,
  type ClientConfirmDecision,
  type EstimateDecision,
  type PublicCurrentRepair,
  type PublicVehicle,
  type RepairStatus,
} from '@/entities/repair-order';
import { getErrorMessage } from '@/shared/lib/api';
import { parseMoney } from '@/shared/lib/money';
import { acceptPublicPdnNotice, hasAcceptedPublicPdnNotice } from '@/shared/lib/legal';
import { formatMileageDelta, formatMileageKm } from '@/shared/lib/vehicle';

import styles from './PublicRepairPage.module.scss';

const statusClassName: Record<RepairStatus, string> = {
  new: styles.status_new,
  pending_approval: styles.status_pending_approval,
  in_progress: styles.status_in_progress,
  waiting_parts: styles.status_waiting_parts,
  done: styles.status_done,
  completed: styles.status_completed,
};

function getVehicleFingerprint(vehicle: PublicVehicle): string {
  return JSON.stringify({
    currentRepair: vehicle.current_repair,
    previousRepairs: vehicle.previous_repairs,
    carModel: vehicle.car_model,
    licensePlate: vehicle.license_plate,
    clientName: vehicle.client_name,
  });
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return 'Дата выдачи уточняется';
  }

  const date = parseISO(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, 'd MMMM yyyy', { locale: ru });
}

function formatDateTime(value: string): string {
  const date = parseISO(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, 'd MMM yyyy, HH:mm', { locale: ru });
}

function formatMoney(total: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(total);
}

function resolveAmountDue(repair: PublicCurrentRepair): number | null {
  const breakdown = getRepairCostBreakdown({
    workItems: repair.work_items,
    orderedParts: repair.ordered_parts,
  });

  if (breakdown.calculatedTotal > 0) {
    return breakdown.calculatedTotal;
  }

  return parseMoney(repair.total);
}

function getTotalLabel(repair: PublicCurrentRepair): string {
  const amountDue = resolveAmountDue(repair);

  if (amountDue != null && amountDue > 0) {
    return formatMoney(amountDue);
  }

  return repair.total_formatted?.trim() || 'Сумма уточняется';
}

export function PublicRepairPage() {
  const { publicToken = '' } = useParams<{ publicToken: string }>();
  const navigate = useNavigate();
  const [declineComment, setDeclineComment] = useState('');
  const [isDeclining, setIsDeclining] = useState(false);
  const [disputeComment, setDisputeComment] = useState('');
  const [isDisputing, setIsDisputing] = useState(false);
  const [noticeAccepted, setNoticeAccepted] = useState(() =>
    publicToken ? hasAcceptedPublicPdnNotice(publicToken) : false,
  );
  const previousFingerprintRef = useRef<string | null>(null);
  const ignoreUpdatesUntilRef = useRef(0);

  const {
    data: vehicle,
    isLoading,
    isError,
    refetch,
  } = useGetPublicRepairQuery(publicToken, {
    skip: !publicToken,
    pollingInterval: 15_000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const [approveEstimate, { isLoading: isSubmittingEstimate }] = useApprovePublicEstimateMutation();
  const [confirmRepair, { isLoading: isSubmittingConfirm }] = useConfirmPublicRepairMutation();
  const isSubmitting = isSubmittingEstimate || isSubmittingConfirm;

  useEffect(() => {
    setNoticeAccepted(publicToken ? hasAcceptedPublicPdnNotice(publicToken) : false);
    previousFingerprintRef.current = null;
  }, [publicToken]);

  useEffect(() => {
    if (!vehicle) {
      return;
    }

    const fingerprint = getVehicleFingerprint(vehicle);
    const previousFingerprint = previousFingerprintRef.current;
    previousFingerprintRef.current = fingerprint;

    if (previousFingerprint === null || previousFingerprint === fingerprint) {
      return;
    }

    if (Date.now() < ignoreUpdatesUntilRef.current) {
      return;
    }

    toast.info('Данные обновились', {
      position: 'top-right',
      transition: Bounce,
      toastId: 'public-repair-updated',
    });
  }, [vehicle]);

  const handleAcceptNotice = () => {
    if (publicToken) {
      acceptPublicPdnNotice(publicToken);
    }
    setNoticeAccepted(true);
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spin size="large" />
      </div>
    );
  }

  if (isError || !vehicle) {
    return (
      <div className={styles.error}>
        <Result
          status="404"
          title="Ссылка не найдена"
          subTitle="Ссылка устарела или введена с ошибкой. Уточните статус в сервисе."
          extra={
            <Button type="primary" onClick={() => void refetch()}>
              Попробовать снова
            </Button>
          }
        />
      </div>
    );
  }

  if (!noticeAccepted) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <header className={styles.brand}>
            <span className={styles.brandMark}>АВ</span>
            <div>
              <p className={styles.brandName}>Автовидно</p>
              <p className={styles.brandHint}>Статус ремонта для клиента</p>
            </div>
          </header>

          <section className={styles.noticeCard}>
            <p className={styles.eyebrow}>Персональные данные</p>
            <h1 className={styles.noticeTitle}>Просмотр статуса ремонта</h1>
            <p className={styles.noticeText}>
              По этой ссылке отображаются сведения о заказе-наряде и автомобиле, которые передал
              автосервис. Продолжая, вы подтверждаете ознакомление с документами об обработке
              персональных данных.
            </p>
            <ul className={styles.noticeList}>
              <li>
                <Link className={styles.noticeLink} to="/legal/privacy" target="_blank">
                  Политика обработки ПДн
                </Link>
              </li>
              <li>
                <Link className={styles.noticeLink} to="/legal/consent" target="_blank">
                  Согласие на обработку ПДн
                </Link>
              </li>
            </ul>
            <Button block size="large" type="primary" onClick={handleAcceptNotice}>
              Продолжить
            </Button>
            <p className={styles.noticeFoot}>
              Регистрация не требуется. Основные согласия клиент даёт автосервису при приёмке
              автомобиля.
            </p>
          </section>
        </div>
      </div>
    );
  }

  const currentRepair = vehicle.current_repair;
  const previousRepairs = vehicle.previous_repairs ?? [];
  const clientVehicles = vehicle.client_vehicles ?? [];
  const clientVehiclesCount = clientVehicles.length;
  const shellStatusClass = currentRepair
    ? statusClassName[currentRepair.status]
    : statusClassName.completed;

  const workItems = currentRepair?.work_items ?? [];
  const doneCount = workItems.filter((item) => item.is_done).length;
  const totalCount = workItems.length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const amountDue = currentRepair ? resolveAmountDue(currentRepair) : null;
  const totalLabel = currentRepair ? getTotalLabel(currentRepair) : 'Сумма уточняется';
  const hasTotal = (amountDue != null && amountDue > 0) || Boolean(currentRepair?.total_formatted);
  const estimateStatus = currentRepair?.estimate_status ?? null;
  const needsEstimateDecision = estimateStatus === 'pending' && hasTotal;
  const updatedAt = currentRepair?.updated_at ?? previousRepairs[0]?.updated_at;
  const confirmStatus = currentRepair?.client_confirm_status ?? null;
  const needsClientConfirm = currentRepair?.status === 'completed' && confirmStatus === 'pending';
  const showConfirmPanel =
    Boolean(currentRepair) && (confirmStatus === 'pending' || confirmStatus === 'disputed');
  const showCurrentRepair =
    Boolean(currentRepair) && !showConfirmPanel && confirmStatus !== 'confirmed';
  const clientName = currentRepair?.client_name?.trim() || vehicle.client_name?.trim() || null;
  const vehicleIdLabel = vehicle.vin?.trim()
    ? `VIN ${vehicle.vin.trim()}`
    : vehicle.chassis_number?.trim()
      ? `Шасси ${vehicle.chassis_number.trim()}`
      : 'Не указан';

  const mileageTimeline = [
    ...[...previousRepairs].reverse(),
    ...(currentRepair ? [currentRepair] : []),
  ]
    .filter((item) => typeof item.mileage === 'number')
    .map((item) => ({
      orderNumber: item.order_number,
      mileage: item.mileage as number,
    }));

  const handleDecision = async (decision: EstimateDecision) => {
    const comment = decision === 'declined' ? declineComment.trim() : '';

    if (decision === 'declined' && !comment) {
      toast.warning('Напишите коротко, что нужно изменить', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    try {
      ignoreUpdatesUntilRef.current = Date.now() + 3000;
      await approveEstimate({
        publicToken,
        body: {
          decision,
          comment: comment || null,
        },
      }).unwrap();

      setIsDeclining(false);
      setDeclineComment('');
      toast.success(decision === 'approved' ? 'Смета согласована' : 'Ответ отправлен в сервис', {
        position: 'top-right',
        transition: Bounce,
      });
    } catch (error) {
      ignoreUpdatesUntilRef.current = 0;
      toast.error(
        getErrorMessage(
          error,
          'Не удалось отправить решение. Возможно, сервис ещё не подключил согласование.',
        ),
        {
          position: 'top-right',
          transition: Bounce,
        },
      );
    }
  };

  const handleConfirmDecision = async (decision: ClientConfirmDecision) => {
    const comment = decision === 'disputed' ? disputeComment.trim() : '';

    if (decision === 'disputed' && !comment) {
      toast.warning('Опишите, что неверно: имя, VIN, пробег или работы', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    try {
      ignoreUpdatesUntilRef.current = Date.now() + 3000;
      await confirmRepair({
        publicToken,
        body: {
          decision,
          comment: comment || null,
        },
      }).unwrap();

      setIsDisputing(false);
      setDisputeComment('');
      toast.success(
        decision === 'confirmed' ? 'Данные подтверждены' : 'Замечание отправлено в сервис',
        {
          position: 'top-right',
          transition: Bounce,
        },
      );
    } catch (error) {
      ignoreUpdatesUntilRef.current = 0;
      toast.error(
        getErrorMessage(
          error,
          'Не удалось отправить ответ. Возможно, сервис ещё не подключил подтверждение.',
        ),
        {
          position: 'top-right',
          transition: Bounce,
        },
      );
    }
  };

  return (
    <div className={styles.page}>
      <div className={clsx(styles.shell, shellStatusClass)}>
        <header className={styles.brand}>
          <span className={styles.brandMark}>АВ</span>
          <div>
            <p className={styles.brandName}>Автовидно</p>
            <p className={styles.brandHint}>Статус ремонта для клиента</p>
          </div>
        </header>

        <section className={styles.hero}>
          <p className={styles.eyebrow}>{currentRepair ? 'Заказ-наряд' : 'Автомобиль'}</p>
          <h1 className={styles.title}>
            {currentRepair ? currentRepair.order_number : vehicle.car_model}
          </h1>
          <p className={styles.carLine}>
            {vehicle.car_model} · {vehicle.license_plate}
            {vehicle.vin?.trim()
              ? ` · VIN ${vehicle.vin}`
              : vehicle.chassis_number?.trim()
                ? ` · шасси ${vehicle.chassis_number}`
                : ''}
          </p>
          <div className={styles.heroTags}>
            {currentRepair ? (
              <Tag className={styles.statusTag} color={repairStatusColors[currentRepair.status]}>
                {currentRepair.status_label || repairStatusLabels[currentRepair.status]}
              </Tag>
            ) : (
              <Tag color={repairStatusColors.completed}>Нет активного ремонта</Tag>
            )}
            {estimateStatus ? (
              <Tag color={estimateStatusColors[estimateStatus]}>
                {estimateStatusLabels[estimateStatus]}
              </Tag>
            ) : null}
            {showConfirmPanel && confirmStatus ? (
              <Tag color={clientConfirmStatusColors[confirmStatus]}>
                {clientConfirmStatusLabels[confirmStatus]}
              </Tag>
            ) : null}
          </div>
        </section>

        {clientVehiclesCount > 0 ? (
          <section className={clsx(styles.panel, styles.vehiclesPanel)}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Автомобили клиента</h2>
                <p className={styles.panelHint}>
                  {clientName
                    ? `${clientName} · нажмите авто, чтобы открыть его ремонты`
                    : 'Нажмите авто, чтобы открыть его ремонты'}
                </p>
              </div>
              <span className={styles.progressBadge}>{clientVehiclesCount}</span>
            </div>

            <ul className={styles.vehiclesList}>
              {clientVehicles.map((item) => {
                const isCurrent = item.public_token === publicToken;
                const idLabel = item.vin?.trim()
                  ? `VIN ${item.vin}`
                  : item.chassis_number?.trim()
                    ? `Шасси ${item.chassis_number}`
                    : null;

                return (
                  <li key={item.public_token}>
                    {isCurrent ? (
                      <div className={clsx(styles.vehicleItem, styles.vehicleItemCurrent)}>
                        <div className={styles.vehicleMain}>
                          <span className={styles.vehicleModel}>{item.car_model}</span>
                          <span className={styles.vehicleMeta}>
                            {item.license_plate}
                            {idLabel ? ` · ${idLabel}` : ''}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <button
                        className={styles.vehicleItemButton}
                        type="button"
                        onClick={() => {
                          navigate(`/public/vehicles/${item.public_token}`);
                        }}
                      >
                        <span className={styles.vehicleMain}>
                          <span className={styles.vehicleModel}>{item.car_model}</span>
                          <span className={styles.vehicleMeta}>
                            {item.license_plate}
                            {idLabel ? ` · ${idLabel}` : ''}
                          </span>
                        </span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {showConfirmPanel && currentRepair && confirmStatus ? (
          <section
            className={clsx(
              styles.panel,
              styles.confirmPanel,
              confirmStatus === 'disputed' && styles.confirmDisputed,
              needsClientConfirm && styles.confirmPending,
            )}
          >
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Подтверждение данных</h2>
                <p className={styles.panelHint}>
                  {needsClientConfirm
                    ? 'Сверьте данные перед подтверждением'
                    : 'Замечание отправлено в сервис'}
                </p>
              </div>
              <Tag color={clientConfirmStatusColors[confirmStatus]}>
                {clientConfirmStatusLabels[confirmStatus]}
              </Tag>
            </div>

            {needsClientConfirm || confirmStatus === 'disputed' ? (
              <div className={styles.confirmTables}>
                <table className={styles.confirmTable}>
                  <caption className={styles.confirmCaption}>Автомобиль и клиент</caption>
                  <tbody>
                    <tr>
                      <th scope="row">Заказ-наряд</th>
                      <td>{currentRepair.order_number}</td>
                    </tr>
                    <tr>
                      <th scope="row">Клиент</th>
                      <td>{clientName || 'Не указано'}</td>
                    </tr>
                    <tr>
                      <th scope="row">Автомобиль</th>
                      <td>
                        {vehicle.car_model} · {vehicle.license_plate}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">VIN / шасси</th>
                      <td>{vehicleIdLabel}</td>
                    </tr>
                    <tr>
                      <th scope="row">Пробег</th>
                      <td>
                        {typeof currentRepair.mileage === 'number'
                          ? formatMileageKm(currentRepair.mileage)
                          : 'Не указан'}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">К оплате</th>
                      <td>{totalLabel}</td>
                    </tr>
                  </tbody>
                </table>

                <table className={styles.confirmTable}>
                  <caption className={styles.confirmCaption}>Выполненные работы</caption>
                  <tbody>
                    {workItems.length > 0 ? (
                      workItems.map((item, index) => {
                        const workPrice = parseMoney(item.price);

                        return (
                          <tr key={`confirm-work-${item.title}-${index}`}>
                            <td className={styles.confirmWorkCell}>
                              <span className={styles.confirmWorkIndex}>{index + 1}</span>
                              <span>{item.title}</span>
                            </td>
                            <td className={styles.confirmWorkPrice}>
                              {workPrice != null ? formatMoney(workPrice) : '—'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className={styles.confirmEmpty} colSpan={2}>
                          Список работ не сохранён
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}

            {needsClientConfirm ? (
              <>
                <p className={styles.confirmLead}>
                  Всё верно — подтвердите. Есть ошибка — опишите её, сервис исправит.
                </p>
                <p className={styles.confirmNote}>После подтверждения данные изменить нельзя.</p>

                {!isDisputing ? (
                  <div className={styles.estimateActions}>
                    <Button
                      loading={isSubmitting}
                      size="large"
                      type="primary"
                      onClick={() => {
                        void handleConfirmDecision('confirmed');
                      }}
                    >
                      Подтвердить
                    </Button>
                    <Button
                      disabled={isSubmitting}
                      size="large"
                      onClick={() => setIsDisputing(true)}
                    >
                      Есть ошибка
                    </Button>
                  </div>
                ) : (
                  <div className={styles.declineBox}>
                    <Input.TextArea
                      placeholder="Например: неверный VIN или пробег 87200 вместо 87000"
                      rows={3}
                      value={disputeComment}
                      onChange={(event) => setDisputeComment(event.target.value)}
                    />
                    <div className={styles.estimateActions}>
                      <Button
                        danger
                        loading={isSubmitting}
                        size="large"
                        type="primary"
                        onClick={() => {
                          void handleConfirmDecision('disputed');
                        }}
                      >
                        Отправить замечание
                      </Button>
                      <Button
                        disabled={isSubmitting}
                        size="large"
                        onClick={() => {
                          setIsDisputing(false);
                          setDisputeComment('');
                        }}
                      >
                        Назад
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : null}

            {confirmStatus === 'disputed' ? (
              <p className={styles.estimateMessage}>
                {currentRepair.client_confirm_comment
                  ? `Ваше замечание: «${currentRepair.client_confirm_comment}»`
                  : 'Сервис получил замечание и свяжется с вами.'}
              </p>
            ) : null}
          </section>
        ) : null}

        {showCurrentRepair ? (
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Текущий ремонт</h2>
                <p className={styles.panelHint}>
                  {currentRepair
                    ? 'Работы по этому заказ-наряду'
                    : 'Сейчас нет открытого заказ-наряда'}
                </p>
              </div>
              {currentRepair ? (
                <span className={styles.progressBadge}>
                  {totalCount > 0 ? `${doneCount} из ${totalCount}` : 'Ожидает список'}
                </span>
              ) : null}
            </div>

            {currentRepair ? (
              <>
                <div className={styles.progressTrack} aria-hidden>
                  <div
                    className={styles.progressFill}
                    data-step={String(Math.round(progressPercent / 5))}
                  />
                </div>

                <div className={styles.facts}>
                  <div className={styles.fact}>
                    <span className={styles.factLabel}>К оплате</span>
                    <span className={styles.factValue}>{totalLabel}</span>
                  </div>
                  <div className={styles.fact}>
                    <span className={styles.factLabel}>Выдача</span>
                    <span className={styles.factValue}>
                      {formatDate(currentRepair.planned_ready_at)}
                    </span>
                  </div>
                  <div className={styles.fact}>
                    <span className={styles.factLabel}>Пробег на работах</span>
                    <span className={styles.factValue}>
                      {typeof currentRepair.mileage === 'number'
                        ? formatMileageKm(currentRepair.mileage)
                        : 'Не указан'}
                    </span>
                  </div>
                </div>

                {workItems.length > 0 ? (
                  <ul className={styles.worksList}>
                    {workItems.map((item, index) => {
                      const workPrice = parseMoney(item.price);

                      return (
                        <li
                          className={clsx(styles.workItem, item.is_done && styles.workItemDone)}
                          key={`current-${item.title}-${index}`}
                        >
                          <span className={styles.workCheck} aria-hidden>
                            {item.is_done ? '✓' : ''}
                          </span>
                          <span className={styles.workTitle}>{item.title}</span>
                          <span className={styles.workPrice}>
                            {workPrice != null ? formatMoney(workPrice) : ''}
                          </span>
                          <span className={styles.workStatus}>
                            {item.is_done ? 'Готово' : 'В работе'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className={styles.panelEmpty}>
                    Список работ появится после диагностики на СТО
                  </p>
                )}

                {currentRepair.comment?.trim() ? (
                  <div className={styles.masterComment}>
                    <span className={styles.masterCommentLabel}>Комментарий мастера</span>
                    <p className={styles.masterCommentText}>{currentRepair.comment.trim()}</p>
                  </div>
                ) : null}
              </>
            ) : (
              <p className={styles.panelEmpty}>
                Активных работ нет. Ниже — история предыдущих визитов по этому автомобилю.
              </p>
            )}
          </section>
        ) : null}

        {showCurrentRepair && currentRepair && (estimateStatus || hasTotal) ? (
          <section
            className={clsx(
              styles.panel,
              styles.estimatePanel,
              estimateStatus === 'approved' && styles.estimateApproved,
              estimateStatus === 'declined' && styles.estimateDeclined,
              !estimateStatus && hasTotal && styles.estimateInfo,
            )}
          >
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>
                  {needsEstimateDecision ||
                  estimateStatus === 'approved' ||
                  estimateStatus === 'declined'
                    ? 'Согласование сметы'
                    : 'Сумма ремонта'}
                </h2>
                <p className={styles.panelHint}>
                  {needsEstimateDecision
                    ? 'Проверьте работы выше и подтвердите сумму'
                    : estimateStatus === 'approved'
                      ? 'Смета подтверждена'
                      : estimateStatus === 'declined'
                        ? 'Нужно уточнение с сервисом'
                        : 'Информация от сервиса'}
                </p>
              </div>
              <span className={styles.estimateAmount}>{totalLabel}</span>
            </div>

            {estimateStatus === 'approved' ? (
              <p className={styles.estimateMessage}>
                Вы согласовали смету
                {currentRepair.estimate_decided_at
                  ? ` · ${formatDateTime(currentRepair.estimate_decided_at)}`
                  : ''}
                . Сервис продолжит работы.
              </p>
            ) : null}

            {estimateStatus === 'declined' ? (
              <p className={styles.estimateMessage}>
                Смета отклонена
                {currentRepair.estimate_comment
                  ? `: «${currentRepair.estimate_comment}»`
                  : '.'}{' '}
                Мастер свяжется с вами для уточнения.
              </p>
            ) : null}

            {needsEstimateDecision ? (
              <>
                <p className={styles.estimateMessage}>
                  Если всё верно — согласуйте. Если нужно изменить объём работ, отклоните и кратко
                  опишите пожелания.
                </p>

                {!isDeclining ? (
                  <div className={styles.estimateActions}>
                    <Button
                      loading={isSubmitting}
                      size="large"
                      type="primary"
                      onClick={() => {
                        void handleDecision('approved');
                      }}
                    >
                      Согласовать
                    </Button>
                    <Button
                      disabled={isSubmitting}
                      size="large"
                      onClick={() => setIsDeclining(true)}
                    >
                      Отклонить
                    </Button>
                  </div>
                ) : (
                  <div className={styles.declineBox}>
                    <Input.TextArea
                      placeholder="Например: пока без замены колодок, только диагностика"
                      rows={3}
                      value={declineComment}
                      onChange={(event) => setDeclineComment(event.target.value)}
                    />
                    <div className={styles.estimateActions}>
                      <Button
                        danger
                        loading={isSubmitting}
                        size="large"
                        type="primary"
                        onClick={() => {
                          void handleDecision('declined');
                        }}
                      >
                        Отправить отказ
                      </Button>
                      <Button
                        disabled={isSubmitting}
                        size="large"
                        onClick={() => {
                          setIsDeclining(false);
                          setDeclineComment('');
                        }}
                      >
                        Назад
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : null}

            {!estimateStatus && hasTotal ? (
              <p className={styles.estimateMessage}>
                Сервис указал сумму работ. Подтверждение с вашей стороны не требуется.
              </p>
            ) : null}
          </section>
        ) : null}

        {previousRepairs.length > 0 && mileageTimeline.length > 1 ? (
          <section className={clsx(styles.panel, styles.mileagePanel)}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Пробег по визитам</h2>
                <p className={styles.panelHint}>На каком пробеге выполнялись работы</p>
              </div>
            </div>

            <ol className={styles.mileageTimeline}>
              {mileageTimeline.map((point, index) => {
                const previous = index > 0 ? mileageTimeline[index - 1] : null;
                const delta =
                  previous != null ? formatMileageDelta(previous.mileage, point.mileage) : null;

                return (
                  <li className={styles.mileageItem} key={`${point.orderNumber}-${point.mileage}`}>
                    <span className={styles.mileageOrder}>{point.orderNumber}</span>
                    <span className={styles.mileageValue}>{formatMileageKm(point.mileage)}</span>
                    {delta ? <span className={styles.mileageDelta}>{delta}</span> : null}
                  </li>
                );
              })}
            </ol>
          </section>
        ) : null}

        <section className={clsx(styles.panel, styles.historyPanel)}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>История по авто</h2>
              <p className={styles.panelHint}>Предыдущие заказ-наряды этой машины</p>
            </div>
            {previousRepairs.length > 0 ? (
              <span className={styles.progressBadge}>{previousRepairs.length}</span>
            ) : null}
          </div>

          {previousRepairs.length > 0 ? (
            <div className={styles.historyList}>
              {previousRepairs.map((pastRepair) => {
                const rawWorks = pastRepair.work_items ?? [];
                const doneWorks = rawWorks.filter((item) => item.is_done === true);
                const pastWorks = doneWorks.length > 0 ? doneWorks : rawWorks;
                const pastAmount =
                  getRepairCostBreakdown({ workItems: rawWorks }).calculatedTotal ||
                  parseMoney(pastRepair.total);
                const pastTotal =
                  (pastAmount != null && pastAmount > 0 ? formatMoney(pastAmount) : null) ||
                  pastRepair.total_formatted ||
                  null;
                const pastDate = pastRepair.completed_at || pastRepair.updated_at;

                return (
                  <article className={styles.historyCard} key={pastRepair.order_number}>
                    <div className={styles.historyCardHead}>
                      <div>
                        <p className={styles.historyOrder}>{pastRepair.order_number}</p>
                        {pastDate ? (
                          <p className={styles.historyDate}>{formatDate(pastDate)}</p>
                        ) : null}
                      </div>
                      <div className={styles.historyCardMeta}>
                        {typeof pastRepair.mileage === 'number' ? (
                          <span className={styles.historyMileage}>
                            {formatMileageKm(pastRepair.mileage)}
                          </span>
                        ) : null}
                        {pastTotal ? (
                          <span className={styles.historyTotal}>{pastTotal}</span>
                        ) : null}
                        <Tag
                          color={
                            repairStatusColors[pastRepair.status] ?? repairStatusColors.completed
                          }
                        >
                          {pastRepair.status_label ||
                            repairStatusLabels[pastRepair.status] ||
                            pastRepair.status}
                        </Tag>
                      </div>
                    </div>

                    {pastWorks.length > 0 ? (
                      <ul className={styles.historyWorks}>
                        {pastWorks.map((item, index) => (
                          <li
                            className={clsx(
                              styles.historyWorkItem,
                              item.is_done && styles.workItemDone,
                            )}
                            key={`${pastRepair.order_number}-${item.title}-${index}`}
                          >
                            <span className={styles.workCheck} aria-hidden>
                              {item.is_done ? '✓' : '○'}
                            </span>
                            <span>{item.title}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.panelEmpty}>Список работ по этому заказу не сохранён</p>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className={styles.panelEmpty}>
              Пока это первый ремонт по этому автомобилю. История появится после следующих визитов.
            </p>
          )}
        </section>

        {updatedAt ? <p className={styles.updated}>Обновлено {formatDateTime(updatedAt)}</p> : null}
        <p className={styles.legalFooter}>
          <Link className={styles.noticeLink} to="/legal/privacy" target="_blank">
            Политика ПДн
          </Link>
          <span aria-hidden> · </span>
          <Link className={styles.noticeLink} to="/legal/consent" target="_blank">
            Согласие
          </Link>
        </p>
      </div>
    </div>
  );
}
