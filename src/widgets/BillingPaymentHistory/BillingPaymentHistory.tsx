import { Pagination, Spin } from 'antd';
import clsx from 'clsx';
import { useEffect, useState, type ReactNode } from 'react';

import {
  useGetBillingPaymentsQuery,
  type BillingPayment,
  type BillingPaymentStatus,
} from '@/entities/billing';
import { billingPlans, useStartSubscriptionPayment } from '@/features/billing';

import styles from './BillingPaymentHistory.module.scss';

const statusLabel: Record<BillingPaymentStatus, string> = {
  paid: 'Оплачен',
  pending: 'Ожидает',
  declined: 'Отклонён',
  failed: 'Не прошёл',
};

function formatWhen(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

function planTitle(planId: string): string {
  return billingPlans.find((plan) => plan.id === planId)?.title ?? planId;
}

function isUnprocessable(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 422;
}

const PAGE_SIZE = 5;

export function BillingPaymentHistory() {
  const { data, isLoading, isError, error } = useGetBillingPaymentsQuery();
  const { startPayment, isPaying } = useStartSubscriptionPayment();
  const [page, setPage] = useState(1);
  const total = data?.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const pageItems = data?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) ?? [];

  const continuePayment = (payment: BillingPayment) => {
    void startPayment(payment.plan, { newTab: true });
  };

  let body: ReactNode;

  if (isLoading) {
    body = (
      <div className={styles.loading}>
        <Spin />
      </div>
    );
  } else if (isError) {
    body = (
      <p className={styles.empty}>
        {isUnprocessable(error)
          ? 'История оплат появится после обновления сервера.'
          : 'Не удалось загрузить историю оплат.'}
      </p>
    );
  } else if (!data?.length) {
    body = <p className={styles.empty}>Пока нет оплат. После перевода они появятся здесь.</p>;
  } else {
    body = (
      <>
        <ul className={styles.list}>
          {pageItems.map((payment) => (
            <li className={styles.row} key={payment.id}>
              <div className={styles.rowMain}>
                <span className={styles.plan}>{planTitle(payment.plan)}</span>
                <span className={styles.when}>
                  {formatWhen(payment.paid_at ?? payment.created_at)}
                </span>
              </div>
              <div className={styles.rowMeta}>
                <span className={styles.amount}>{formatMoney(payment.amount)}</span>
                <span className={clsx(styles.status, styles[`status_${payment.status}`])}>
                  {statusLabel[payment.status]}
                </span>
                {payment.status === 'pending' ? (
                  payment.payment_url ? (
                    <a
                      className={styles.resumeLink}
                      href={payment.payment_url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Повторить оплату
                    </a>
                  ) : (
                    <button
                      className={styles.resumeLink}
                      disabled={isPaying}
                      type="button"
                      onClick={() => continuePayment(payment)}
                    >
                      Повторить оплату
                    </button>
                  )
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        {total > PAGE_SIZE ? (
          <Pagination
            className={styles.pagination}
            current={page}
            hideOnSinglePage
            pageSize={PAGE_SIZE}
            showSizeChanger={false}
            total={total}
            onChange={setPage}
          />
        ) : null}
      </>
    );
  }

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <p className={styles.lead}>Переводы по тарифам этой станции.</p>
      </div>
      {body}
    </section>
  );
}
