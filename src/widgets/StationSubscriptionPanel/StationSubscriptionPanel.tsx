import { Button } from 'antd';
import clsx from 'clsx';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAppSelector } from '@/app/store';
import {
  getSubscriptionDaysLeft,
  getSubscriptionHoursLeft,
  getSubscriptionRemainingMs,
  getSubscriptionStatus,
  isSubscriptionBlocked,
} from '@/entities/session';
import {
  billingPlanIncludeGroups,
  billingPlans,
  getPaidPeriodProgressPercent,
  getPlanSaving,
  useBillingReturnSync,
  useStartSubscriptionPayment,
  type BillingPlanId,
} from '@/features/billing';

import styles from './StationSubscriptionPanel.module.scss';

function formatPlanDate(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

function progressStep(percent: number): number {
  return Math.min(100, Math.max(0, Math.round(percent / 10) * 10));
}

function addCalendarMonths(from: Date, months: number): Date {
  const next = new Date(from.getTime());
  next.setMonth(next.getMonth() + months);
  return next;
}

/** Как на бэке: срок тарифа прибавляется к текущей дате окончания, если она ещё впереди. */
function getExtendedUntil(endsAt: string | null | undefined, months: number): Date {
  const parsed = endsAt ? Date.parse(endsAt) : Number.NaN;
  const base = Number.isNaN(parsed) || parsed <= Date.now() ? new Date() : new Date(parsed);

  return addCalendarMonths(base, months);
}

export function StationSubscriptionPanel() {
  const user = useAppSelector((state) => state.session.user);
  const subscriptionStatus = getSubscriptionStatus(user);
  const blocked = isSubscriptionBlocked(user);
  const subscriptionDaysLeft = getSubscriptionDaysLeft(user);
  const subscriptionHoursLeft = getSubscriptionHoursLeft(user);
  const subscriptionEndsAt =
    subscriptionStatus === 'trial'
      ? user?.trial_ends_at
      : subscriptionStatus === 'active'
        ? user?.subscription_ends_at
        : null;
  const [selectedPlan, setSelectedPlan] = useState<BillingPlanId>('quarter');
  const selectedPlanData = billingPlans.find((plan) => plan.id === selectedPlan) ?? billingPlans[1];
  const { startPayment, isPaying } = useStartSubscriptionPayment();

  useBillingReturnSync();

  let subscriptionBadge = 'Демо-доступ';
  let subscriptionTitle = 'Тариф не выбран';
  let subscriptionHint = 'Оплата появится после запуска. Пока вы работаете бесплатно.';
  let remainingValue = '';
  let remainingLabel = 'дн. осталось';
  let progressPercent = 0;
  let actionLabel = 'Оплатить';
  let plansHint = 'Один набор функций, отличается только срок.';
  let subscriptionState: 'ok' | 'warn' | 'danger' = 'warn';

  const remainingUnderWeek =
    subscriptionHoursLeft != null && subscriptionHoursLeft > 0 && subscriptionHoursLeft < 168;

  if (subscriptionStatus === 'trial') {
    subscriptionBadge = 'Пробный период';
    subscriptionTitle = 'Знакомьтесь с сервисом';
    subscriptionHint = `Действует до ${formatPlanDate(subscriptionEndsAt)}. Дальше выберите тариф.`;
    remainingValue = remainingUnderWeek
      ? `${subscriptionHoursLeft}`
      : `${subscriptionDaysLeft ?? 0}`;
    remainingLabel = remainingUnderWeek ? 'ч. осталось' : 'дн. осталось';
    progressPercent =
      (subscriptionDaysLeft ?? 0) <= 0
        ? 0
        : Math.min(100, Math.max(10, Math.round(((subscriptionDaysLeft ?? 0) / 30) * 100)));
    actionLabel = `Оформить «${selectedPlanData.title}»`;
    plansHint = 'После пробного периода доступ закроется. Выберите срок и оплатите.';
    subscriptionState = 'ok';
  } else if (subscriptionStatus === 'active') {
    const daysLeft = subscriptionDaysLeft ?? 0;
    const endingSoon = daysLeft > 0 && daysLeft <= 7;

    subscriptionBadge = endingSoon ? 'Скоро закончится' : 'Подписка активна';
    if (subscriptionEndsAt) {
      subscriptionTitle = endingSoon ? 'Продлите, чтобы не останавливать работу' : 'Доступ открыт';
      subscriptionHint = `Действует до ${formatPlanDate(subscriptionEndsAt)} — новый тариф прибавится к этой дате.`;
    } else {
      subscriptionTitle = 'Подписка без срока';
      subscriptionHint =
        'В Альфе оплата могла пройти, но на станции нет даты окончания. Нужно, чтобы бэк записал subscription_ends_at.';
    }
    const remainingMs = getSubscriptionRemainingMs(user);

    if (daysLeft > 0 && user && subscriptionEndsAt && remainingMs != null) {
      progressPercent = getPaidPeriodProgressPercent(user.id, subscriptionEndsAt, remainingMs);
    }
    remainingValue = remainingUnderWeek
      ? `${subscriptionHoursLeft}`
      : `${subscriptionDaysLeft ?? 0}`;
    remainingLabel = remainingUnderWeek ? 'ч. осталось' : 'дн. осталось';
    actionLabel = `Продлить на ${selectedPlanData.title}`;
    plansHint = endingSoon
      ? 'Тарифы на месте: оплата сразу продлит доступ. Срок добавится к текущему.'
      : 'Можно продлить заранее — дни не сгорят, прибавятся к текущей дате.';
    subscriptionState = endingSoon ? 'warn' : 'ok';
  } else if (blocked) {
    subscriptionBadge = 'Подписка истекла';
    subscriptionTitle = 'Доступ приостановлен';
    subscriptionHint = 'Выберите тариф, чтобы снова работать с ремонтами и публичными ссылками.';
    remainingValue = '0';
    actionLabel = `Оплатить «${selectedPlanData.title}»`;
    plansHint = 'Один набор функций, отличается только срок.';
    subscriptionState = 'danger';
  }

  return (
    <div className={styles.wrap}>
      <section className={clsx(styles.statusCard, styles[`statusCard_${subscriptionState}`])}>
        <div className={styles.statusTop}>
          <span className={styles.statusBadge}>{subscriptionBadge}</span>
          {remainingValue ? (
            <div className={styles.statusDays}>
              <span className={styles.statusDaysValue}>{remainingValue}</span>
              <span className={styles.statusDaysLabel}>{remainingLabel}</span>
            </div>
          ) : null}
        </div>

        <h2 className={styles.statusTitle}>{subscriptionTitle}</h2>
        <p className={styles.statusHint}>{subscriptionHint}</p>

        {subscriptionStatus === 'trial' || subscriptionStatus === 'active' ? (
          <div
            className={clsx(
              styles.statusProgress,
              styles[`statusProgress_${progressStep(progressPercent)}`],
            )}
            aria-hidden
          />
        ) : null}
      </section>

      <section className={styles.plansCard}>
        <div className={styles.plansHead}>
          <h2 className={styles.plansTitle}>Тарифы</h2>
          <p className={styles.plansHint}>{plansHint}</p>
          <ul className={styles.includesPeek}>
            {billingPlanIncludeGroups.map((group) => (
              <li className={styles.includesPeekItem} key={group.title}>
                {group.title}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.plans}>
          {billingPlans.map((plan) => {
            const saving = getPlanSaving(plan);

            return (
              <button
                className={clsx(
                  styles.plan,
                  styles[`plan_${plan.id}`],
                  plan.recommended && styles.planRecommended,
                  selectedPlan === plan.id && styles.planSelected,
                )}
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.recommended ? <span className={styles.planBadge}>Выгодно</span> : null}
                <span className={styles.planPeriod}>
                  <span className={styles.planPeriodValue}>{plan.months}</span>
                  <span className={styles.planPeriodUnit}>мес</span>
                </span>
                <span className={styles.planTitle}>{plan.title}</span>
                <span className={styles.planPrice}>{formatMoney(plan.price)}</span>
                <span className={styles.planHint}>{plan.hint}</span>
                {saving > 0 ? (
                  <span className={styles.planSaving}>экономия {formatMoney(saving)}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className={styles.payRow}>
          <Button
            block
            loading={isPaying}
            size="large"
            type="primary"
            onClick={() => void startPayment(selectedPlan, { newTab: true })}
          >
            {actionLabel}
          </Button>
          {subscriptionStatus === 'active' && subscriptionEndsAt ? (
            <p className={styles.payHint}>
              После оплаты будет действовать до{' '}
              {formatPlanDate(
                getExtendedUntil(subscriptionEndsAt, selectedPlanData.months).toISOString(),
              )}
            </p>
          ) : null}
          <Link className={styles.historyLink} to="/station#payments">
            История оплат
          </Link>
        </div>
      </section>

      <section className={styles.includesCard}>
        <div className={styles.includesHead}>
          <h2 className={styles.includesTitle}>Что входит</h2>
          <p className={styles.includesLead}>Одинаково во всех тарифах — отличается только срок.</p>
        </div>
        <div className={styles.includesGroups}>
          {billingPlanIncludeGroups.map((group) => (
            <div className={styles.includesGroup} key={group.title}>
              <h3 className={styles.includesGroupTitle}>{group.title}</h3>
              <ul className={styles.includesList}>
                {group.items.map((item) => (
                  <li className={styles.includesItem} key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className={styles.includesNote}>
          Аккаунт — одна станция. Без автопродления: следующий период оплачиваете сами.
        </p>
      </section>
    </div>
  );
}
