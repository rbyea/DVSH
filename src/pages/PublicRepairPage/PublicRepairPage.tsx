import { Button, Input, Result, Spin, Tag } from 'antd';
import clsx from 'clsx';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bounce, toast } from 'react-toastify';

import {
  estimateStatusColors,
  estimateStatusLabels,
  repairStatusColors,
  repairStatusLabels,
  useApprovePublicEstimateMutation,
  useGetPublicRepairQuery,
  type EstimateDecision,
  type EstimateStatus,
  type RepairStatus,
} from '@/entities/repair-order';
import { getErrorMessage } from '@/shared/lib/api';
import { acceptPublicPdnNotice, hasAcceptedPublicPdnNotice } from '@/shared/lib/legal';

import styles from './PublicRepairPage.module.scss';

const statusClassName: Record<RepairStatus, string> = {
  new: styles.status_new,
  diagnostics: styles.status_diagnostics,
  in_progress: styles.status_in_progress,
  waiting_parts: styles.status_waiting_parts,
  done: styles.status_done,
};

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

function resolveEstimateStatus(
  status: EstimateStatus | null | undefined,
  total: number | null | undefined,
): EstimateStatus | null {
  if (status) {
    return status;
  }

  if (typeof total === 'number' && total > 0) {
    return 'pending';
  }

  return null;
}

export function PublicRepairPage() {
  const { publicToken = '' } = useParams<{ publicToken: string }>();
  const [declineComment, setDeclineComment] = useState('');
  const [isDeclining, setIsDeclining] = useState(false);
  const [noticeAccepted, setNoticeAccepted] = useState(() =>
    publicToken ? hasAcceptedPublicPdnNotice(publicToken) : false,
  );

  const {
    data: repair,
    isLoading,
    isError,
    refetch,
  } = useGetPublicRepairQuery(publicToken, {
    skip: !publicToken,
  });
  const [approveEstimate, { isLoading: isSubmitting }] = useApprovePublicEstimateMutation();

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

  if (isError || !repair) {
    return (
      <div className={styles.error}>
        <Result
          status="404"
          title="Ремонт не найден"
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
            <span className={styles.brandMark}>DV</span>
            <div>
              <p className={styles.brandName}>DVSH</p>
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

  const doneCount = repair.work_items.filter((item) => item.is_done).length;
  const totalCount = repair.work_items.length;
  const totalValue = typeof repair.total === 'number' ? repair.total : null;
  const totalLabel =
    repair.total_formatted ||
    (typeof totalValue === 'number' ? formatMoney(totalValue) : 'Сумма уточняется');
  const estimateStatus = resolveEstimateStatus(repair.estimate_status, totalValue);

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

  return (
    <div className={styles.page}>
      <div className={clsx(styles.shell, statusClassName[repair.status])}>
        <header className={styles.brand}>
          <span className={styles.brandMark}>DV</span>
          <div>
            <p className={styles.brandName}>DVSH</p>
            <p className={styles.brandHint}>Статус ремонта для клиента</p>
          </div>
        </header>

        <section className={styles.hero}>
          <p className={styles.eyebrow}>Заказ-наряд</p>
          <h1 className={styles.title}>{repair.order_number}</h1>
          <p className={styles.carLine}>
            {repair.car_model} · {repair.license_plate}
          </p>
          <div className={styles.heroTags}>
            <Tag className={styles.statusTag} color={repairStatusColors[repair.status]}>
              {repair.status_label || repairStatusLabels[repair.status]}
            </Tag>
            {estimateStatus ? (
              <Tag color={estimateStatusColors[estimateStatus]}>
                {estimateStatusLabels[estimateStatus]}
              </Tag>
            ) : null}
          </div>
        </section>

        <section className={styles.meta}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Сумма сметы</span>
            <span className={styles.metaValue}>{totalLabel}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Плановая выдача</span>
            <span className={styles.metaValue}>{formatDate(repair.planned_ready_at)}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Прогресс работ</span>
            <span className={styles.metaValue}>
              {totalCount > 0 ? `${doneCount} из ${totalCount}` : 'Список формируется'}
            </span>
          </div>
        </section>

        <section
          className={clsx(
            styles.estimate,
            estimateStatus === 'approved' && styles.estimateApproved,
            estimateStatus === 'declined' && styles.estimateDeclined,
          )}
        >
          <div className={styles.estimateHead}>
            <h2 className={styles.estimateTitle}>Согласование сметы</h2>
            <span className={styles.estimateAmount}>{totalLabel}</span>
          </div>

          {estimateStatus === 'approved' ? (
            <p className={styles.estimateMessage}>
              Вы согласовали смету
              {repair.estimate_decided_at ? ` · ${formatDateTime(repair.estimate_decided_at)}` : ''}
              . Сервис продолжит работы.
            </p>
          ) : null}

          {estimateStatus === 'declined' ? (
            <p className={styles.estimateMessage}>
              Смета отклонена
              {repair.estimate_comment ? `: «${repair.estimate_comment}»` : '.'} Мастер свяжется с
              вами для уточнения.
            </p>
          ) : null}

          {estimateStatus === 'pending' && typeof totalValue === 'number' && totalValue > 0 ? (
            <>
              <p className={styles.estimateMessage}>
                Проверьте список работ и сумму. Если всё верно — согласуйте смету. Если нужно
                изменить объём работ, отклоните и кратко опишите пожелания.
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
            </>
          ) : null}

          {!estimateStatus ? (
            <p className={styles.estimateMessage}>
              Смета ещё формируется на СТО. Когда мастер укажет сумму, здесь появится кнопка
              согласования.
            </p>
          ) : null}
        </section>

        <section className={styles.works}>
          <h2 className={styles.worksTitle}>Работы</h2>
          {repair.work_items.length > 0 ? (
            <ul className={styles.worksList}>
              {repair.work_items.map((item) => (
                <li
                  className={clsx(styles.workItem, item.is_done && styles.workItemDone)}
                  key={`${item.title}-${item.is_done}`}
                >
                  <span className={styles.workCheck}>{item.is_done ? '✓' : '○'}</span>
                  <span>{item.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.worksEmpty}>Работы появятся после диагностики на СТО</p>
          )}
        </section>

        <p className={styles.updated}>Обновлено {formatDateTime(repair.updated_at)}</p>
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
