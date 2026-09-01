import { Button, Input, Result, Spin, Tag } from 'antd';
import clsx from 'clsx';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bounce, toast } from 'react-toastify';

import {
  publicClientConfirmStatusColors,
  publicClientConfirmStatusLabels,
  getPartLineTotal,
  getRepairCostBreakdown,
  needsPublicEstimateDecision,
  useApprovePublicEstimateMutation,
  useConfirmPublicRepairMutation,
  useGetPublicRepairQuery,
  type ClientConfirmDecision,
  type EstimateDecision,
  type PublicCurrentRepair,
  type PublicStationContacts,
  type PublicVehicle,
  type RepairStatus,
} from '@/entities/repair-order';
import { findLocalStationMapUrl, useGetStationQuery } from '@/entities/master';
import { getErrorMessage } from '@/shared/lib/api';
import { hasAccessToken } from '@/shared/lib/auth';
import { parseMoney } from '@/shared/lib/money';
import { acceptPublicPdnNotice, hasAcceptedPublicPdnNotice } from '@/shared/lib/legal';
import { isHttpUrl } from '@/shared/lib/maps';
import { formatMileageKm } from '@/shared/lib/vehicle';
import { MAX_BOT_URL } from '@/shared/config';
import { BrandMark } from '@/shared/ui/BrandMark';
import { CarBrandMark } from '@/shared/ui/CarBrandMark';
import { MaxLogo } from '@/shared/ui/MaxLogo';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';
import { PublicMileageChart } from '@/widgets/PublicMileageChart';
import { RepairDiagnosticsPanel } from '@/widgets/RepairDiagnosticsPanel';

import styles from './PublicRepairPage.module.scss';

const statusClassName: Record<RepairStatus, string> = {
  new: styles.status_new,
  pending_approval: styles.status_pending_approval,
  revision: styles.status_revision,
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
    station: vehicle.station,
    latestDiagnostic: vehicle.latest_diagnostic,
  });
}

function stationMapHref(station?: Pick<PublicStationContacts, 'map_url'> | null): string | null {
  const mapUrl = station?.map_url?.trim();

  return mapUrl && isHttpUrl(mapUrl) ? mapUrl : null;
}

function isSamePublicStation(
  station: PublicStationContacts | null | undefined,
  profile: { name?: string | null; phone?: string | null; address?: string | null },
): boolean {
  if (!station) {
    return false;
  }

  return (
    (Boolean(station.name) && station.name === profile.name) ||
    (Boolean(station.phone?.trim()) && station.phone === profile.phone) ||
    (Boolean(station.address?.trim()) && station.address === profile.address)
  );
}

function hasStationContacts(station?: PublicStationContacts | null): boolean {
  if (!station) {
    return false;
  }

  return Boolean(
    station.phone?.trim() ||
    station.city?.trim() ||
    station.address?.trim() ||
    station.map_url?.trim() ||
    station.working_hours?.trim() ||
    station.legal_name?.trim() ||
    station.inn?.trim() ||
    station.ogrn?.trim(),
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return 'Дата не указана';
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

function formatPickupDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = parseISO(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return format(date, 'd MMM', { locale: ru });
}

function getClientStatusPhrase(options: {
  hasCurrent: boolean;
  status?: RepairStatus;
  estimatePending: boolean;
  confirmPending: boolean;
  confirmDisputed: boolean;
}): string {
  if (!options.hasCurrent) {
    return 'Нет активного ремонта';
  }

  if (options.confirmPending) {
    return 'Подтвердите данные';
  }

  if (options.confirmDisputed) {
    return 'Сервис исправляет замечание';
  }

  if (options.estimatePending) {
    return 'Согласуйте работы';
  }

  switch (options.status) {
    case 'new':
      return 'Заказ принят';
    case 'pending_approval':
      return 'На согласовании';
    case 'revision':
      return 'Сервис уточняет работы';
    case 'in_progress':
      return 'Машина в работе';
    case 'waiting_parts':
      return 'Ждём запчасти';
    case 'done':
      return 'Можно забирать';
    case 'completed':
      return 'Авто выдано';
    default:
      return '';
  }
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
  const [historyOpen, setHistoryOpen] = useState(true);
  const [openHistoryOrder, setOpenHistoryOrder] = useState<string | null>(null);
  const historyInitedRef = useRef(false);
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
  const { data: myStation } = useGetStationQuery(undefined, {
    skip: !hasAccessToken(),
  });
  const [approveEstimate, { isLoading: isSubmittingEstimate }] = useApprovePublicEstimateMutation();
  const [confirmRepair, { isLoading: isSubmittingConfirm }] = useConfirmPublicRepairMutation();
  const isSubmitting = isSubmittingEstimate || isSubmittingConfirm;

  useEffect(() => {
    setNoticeAccepted(publicToken ? hasAcceptedPublicPdnNotice(publicToken) : false);
    previousFingerprintRef.current = null;
    historyInitedRef.current = false;
    setHistoryOpen(true);
    setOpenHistoryOrder(null);
  }, [publicToken]);

  useEffect(() => {
    if (historyInitedRef.current || !vehicle?.previous_repairs?.[0]) {
      return;
    }

    historyInitedRef.current = true;
    setHistoryOpen(true);
    setOpenHistoryOrder(vehicle.previous_repairs[0].order_number);
  }, [vehicle]);

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
            <BrandMark className={styles.brandMark} />
            <p className={styles.brandName}>Автовидно</p>
            <ThemeToggle className={styles.themeToggle} />
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
                <Link className={styles.noticeLink} to="/legal/privacy">
                  Политика обработки ПДн
                </Link>
              </li>
              <li>
                <Link className={styles.noticeLink} to="/legal/consent">
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
  const amountDue = currentRepair ? resolveAmountDue(currentRepair) : null;
  const totalLabel = currentRepair ? getTotalLabel(currentRepair) : 'Сумма уточняется';
  const hasTotal = (amountDue != null && amountDue > 0) || Boolean(currentRepair?.total_formatted);
  const estimateStatus = currentRepair?.estimate_status ?? null;
  const needsEstimateDecision = currentRepair ? needsPublicEstimateDecision(currentRepair) : false;
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
  const pickupDate = formatPickupDate(currentRepair?.planned_ready_at);
  const statusPhrase = getClientStatusPhrase({
    hasCurrent: Boolean(currentRepair),
    status: currentRepair?.status,
    estimatePending: needsEstimateDecision,
    confirmPending: needsClientConfirm,
    confirmDisputed: confirmStatus === 'disputed',
  });
  const statusLine = [
    statusPhrase,
    pickupDate && currentRepair && !['done', 'completed'].includes(currentRepair.status)
      ? `забрать ${pickupDate}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const heroMeta = [currentRepair?.order_number, hasTotal ? totalLabel : null]
    .filter(Boolean)
    .join(' · ');
  const showPrices = needsEstimateDecision || needsClientConfirm;
  const latestHistory = previousRepairs[0];
  const mapHref =
    stationMapHref(vehicle.station) ??
    (myStation && isSamePublicStation(vehicle.station, myStation)
      ? stationMapHref({ map_url: myStation.map_url })
      : null) ??
    findLocalStationMapUrl(vehicle.station ?? {});

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
      toast.success(decision === 'approved' ? 'Работы согласованы' : 'Ответ отправлен в сервис', {
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
          <BrandMark className={styles.brandMark} />
          <p className={styles.brandName}>Автовидно</p>
          <ThemeToggle className={styles.themeToggle} />
        </header>

        <section className={styles.hero}>
          <h1 className={styles.title}>
            <CarBrandMark
              className={styles.titleBrand}
              carModel={vehicle.car_model}
              fallback="none"
            />
            <span>
              {vehicle.car_model} · {vehicle.license_plate}
            </span>
          </h1>
          <p className={styles.statusLine}>{statusLine}</p>
          {heroMeta ? <p className={styles.heroMeta}>{heroMeta}</p> : null}
          <PublicMileageChart currentRepair={currentRepair} previousRepairs={previousRepairs} />
        </section>

        {hasStationContacts(vehicle.station) ? (
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Сервис</h2>
            </div>
            <dl className={styles.stationList}>
              {vehicle.station?.name ? (
                <>
                  <dt>СТО</dt>
                  <dd>{vehicle.station.name}</dd>
                </>
              ) : null}
              {vehicle.station?.legal_name ? (
                <>
                  <dt>ИП / ООО</dt>
                  <dd>{vehicle.station.legal_name}</dd>
                </>
              ) : null}
              {vehicle.station?.inn ? (
                <>
                  <dt>ИНН</dt>
                  <dd>{vehicle.station.inn}</dd>
                </>
              ) : null}
              {vehicle.station?.ogrn ? (
                <>
                  <dt>{vehicle.station.ogrn.length === 15 ? 'ОГРНИП' : 'ОГРН'}</dt>
                  <dd>{vehicle.station.ogrn}</dd>
                </>
              ) : null}
              {vehicle.station?.phone ? (
                <>
                  <dt>Телефон</dt>
                  <dd>{vehicle.station.phone}</dd>
                </>
              ) : null}
              {vehicle.station?.city ? (
                <>
                  <dt>Город</dt>
                  <dd>{vehicle.station.city}</dd>
                </>
              ) : null}
              {vehicle.station?.address ? (
                <>
                  <dt>Адрес</dt>
                  <dd>
                    {mapHref ? (
                      <a
                        className={styles.stationLink}
                        href={mapHref}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {vehicle.station.address}
                      </a>
                    ) : (
                      vehicle.station.address
                    )}
                  </dd>
                </>
              ) : null}
              {vehicle.station?.working_hours ? (
                <>
                  <dt>График</dt>
                  <dd>{vehicle.station.working_hours}</dd>
                </>
              ) : null}
            </dl>
            {mapHref ? (
              <a className={styles.mapButton} href={mapHref} rel="noreferrer" target="_blank">
                Оставить отзыв
              </a>
            ) : null}
          </section>
        ) : null}

        {needsEstimateDecision && showCurrentRepair && currentRepair ? (
          <section className={clsx(styles.panel, styles.confirmPending)}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Согласование работ</h2>
                <p className={styles.panelHint}>
                  Сервис обновил список. Если всё верно — согласуйте. Чтобы изменить объём,
                  отклоните и напишите коротко.
                </p>
              </div>
            </div>
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
                <Button disabled={isSubmitting} size="large" onClick={() => setIsDeclining(true)}>
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
              <Tag color={publicClientConfirmStatusColors[confirmStatus]}>
                {publicClientConfirmStatusLabels[confirmStatus]}
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
                      <td className={styles.confirmCar}>
                        <CarBrandMark carModel={vehicle.car_model} fallback="none" />
                        <span>
                          {vehicle.car_model} · {vehicle.license_plate}
                        </span>
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

        {showCurrentRepair && currentRepair ? (
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>
                {needsEstimateDecision ? 'Согласование работ' : 'Работы'}
              </h2>
              <span className={styles.progressBadge}>
                {totalCount > 0 ? `${doneCount} из ${totalCount}` : 'Список появится'}
              </span>
            </div>

            {workItems.length > 0 ? (
              <ul className={styles.worksList}>
                {workItems.map((item, index) => {
                  const workPrice = parseMoney(item.price);

                  return (
                    <li
                      className={clsx(
                        styles.workItem,
                        !showPrices && styles.workItemCompact,
                        item.is_done && styles.workItemDone,
                      )}
                      key={`current-${item.title}-${index}`}
                    >
                      <span className={styles.workCheck} aria-hidden>
                        {item.is_done ? '✓' : ''}
                      </span>
                      <span className={styles.workTitle}>{item.title}</span>
                      {showPrices && workPrice != null ? (
                        <span className={styles.workPrice}>{formatMoney(workPrice)}</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.panelEmpty}>Список работ появится после диагностики на СТО</p>
            )}

            {currentRepair.comment?.trim() ? (
              <div className={styles.masterComment}>
                <span className={styles.masterCommentLabel}>Комментарий мастера</span>
                <p className={styles.masterCommentText}>{currentRepair.comment.trim()}</p>
              </div>
            ) : null}

            {estimateStatus === 'approved' ? (
              <p className={styles.estimateMessage}>
                Работы согласованы
                {currentRepair.estimate_decided_at
                  ? ` · ${formatDateTime(currentRepair.estimate_decided_at)}`
                  : ''}
              </p>
            ) : null}

            {estimateStatus === 'declined' ? (
              <p className={styles.estimateMessage}>
                Нужно уточнение с сервисом
                {currentRepair.estimate_comment ? `: «${currentRepair.estimate_comment}»` : '.'}
              </p>
            ) : null}
          </section>
        ) : null}

        <RepairDiagnosticsPanel
          latestDiagnostic={vehicle.latest_diagnostic}
          readOnly
          repairId={currentRepair?.order_number ?? 'public'}
          vehicleVin={vehicle.vin}
        />

        {clientVehiclesCount > 1 ? (
          <section className={clsx(styles.panel, styles.vehiclesPanel)}>
            <h2 className={styles.panelTitle}>Другие авто</h2>
            <ul className={styles.vehiclesList}>
              {clientVehicles.map((item) => {
                const isCurrent = item.public_token === publicToken;

                return (
                  <li key={item.public_token}>
                    {isCurrent ? (
                      <div className={clsx(styles.vehicleItem, styles.vehicleItemCurrent)}>
                        <span className={styles.vehicleModel}>
                          <CarBrandMark carModel={item.car_model} fallback="none" />
                          {item.car_model}
                        </span>
                        <span className={styles.vehicleMeta}>{item.license_plate}</span>
                      </div>
                    ) : (
                      <button
                        className={styles.vehicleItemButton}
                        type="button"
                        onClick={() => {
                          navigate(`/public/vehicles/${item.public_token}`);
                        }}
                      >
                        <span className={styles.vehicleModel}>
                          <CarBrandMark carModel={item.car_model} fallback="none" />
                          {item.car_model}
                        </span>
                        <span className={styles.vehicleMeta}>{item.license_plate}</span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {previousRepairs.length > 0 ? (
          <section className={clsx(styles.panel, styles.historyPanel)}>
            <button
              aria-expanded={historyOpen}
              className={styles.disclosure}
              type="button"
              onClick={() => setHistoryOpen((open) => !open)}
            >
              <span className={styles.toggleMain}>
                <span className={styles.panelTitle}>История</span>
                <span className={styles.panelHint}>
                  {latestHistory
                    ? `${previousRepairs.length} · последний ${latestHistory.order_number}`
                    : `${previousRepairs.length} визитов`}
                </span>
              </span>
              <span aria-hidden className={clsx(styles.chevron, historyOpen && styles.chevronOpen)}>
                ▾
              </span>
            </button>

            <div className={clsx(styles.accordion, historyOpen && styles.accordionOpen)}>
              <div className={styles.accordionInner}>
                <div className={styles.historyList}>
                  {previousRepairs.map((pastRepair) => {
                    const rawWorks = pastRepair.work_items ?? [];
                    const doneWorks = rawWorks.filter((item) => item.is_done === true);
                    const pastWorks = doneWorks.length > 0 ? doneWorks : rawWorks;
                    const pastParts = pastRepair.ordered_parts ?? [];
                    const pastAmount =
                      getRepairCostBreakdown({
                        workItems: rawWorks,
                        orderedParts: pastParts,
                      }).calculatedTotal || parseMoney(pastRepair.total);
                    const pastTotal =
                      (pastAmount != null && pastAmount > 0 ? formatMoney(pastAmount) : null) ||
                      pastRepair.total_formatted ||
                      null;
                    const pastDate = pastRepair.completed_at || pastRepair.updated_at;
                    const isVisitOpen = openHistoryOrder === pastRepair.order_number;

                    return (
                      <article className={styles.historyCard} key={pastRepair.order_number}>
                        <button
                          aria-expanded={isVisitOpen}
                          className={styles.historyRow}
                          type="button"
                          onClick={() => {
                            setOpenHistoryOrder((current) =>
                              current === pastRepair.order_number ? null : pastRepair.order_number,
                            );
                          }}
                        >
                          <span className={styles.historyOrder}>{pastRepair.order_number}</span>
                          <span className={styles.historyDate}>
                            {pastDate ? formatDate(pastDate) : 'Дата не указана'}
                            {typeof pastRepair.mileage === 'number'
                              ? ` · ${formatMileageKm(pastRepair.mileage)}`
                              : ''}
                          </span>
                          <span className={styles.historyTotal}>{pastTotal || '—'}</span>
                        </button>

                        <div
                          className={clsx(styles.accordion, isVisitOpen && styles.accordionOpen)}
                        >
                          <div className={styles.accordionInner}>
                            {pastWorks.length > 0 ? (
                              <ul className={styles.historyWorks}>
                                {pastWorks.map((item, index) => (
                                  <li
                                    className={styles.historyWorkItem}
                                    key={`${pastRepair.order_number}-${item.title}-${index}`}
                                  >
                                    {item.title}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className={styles.panelEmpty}>Работы не сохранены</p>
                            )}

                            {pastParts.length > 0 ? (
                              <ul className={styles.historyParts}>
                                {pastParts.map((part, index) => {
                                  const lineTotal = getPartLineTotal(part);

                                  return (
                                    <li
                                      className={styles.historyPartItem}
                                      key={`${pastRepair.order_number}-part-${part.name}-${index}`}
                                    >
                                      <span className={styles.partName}>{part.name}</span>
                                      {part.quantity > 0 ? (
                                        <span className={styles.partQty}>× {part.quantity}</span>
                                      ) : null}
                                      <span className={styles.partPrice}>
                                        {lineTotal > 0 ? formatMoney(lineTotal) : ''}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <div className={styles.maxRow}>
          <a href={MAX_BOT_URL} rel="noreferrer" target="_blank">
            <Button block className={styles.maxButton} size="large">
              <span className={styles.maxButtonInner}>
                <MaxLogo className={styles.maxLogo} />
                Уведомления в MAX
              </span>
            </Button>
          </a>
        </div>

        {updatedAt ? <p className={styles.updated}>Обновлено {formatDateTime(updatedAt)}</p> : null}
        <p className={styles.legalFooter}>
          <Link className={styles.noticeLink} to="/legal/privacy">
            Политика ПДн
          </Link>
          <span aria-hidden> · </span>
          <Link className={styles.noticeLink} to="/legal/consent">
            Согласие
          </Link>
        </p>
      </div>
    </div>
  );
}
