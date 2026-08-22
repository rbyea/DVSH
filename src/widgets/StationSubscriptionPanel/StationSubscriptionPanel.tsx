import { Button } from 'antd';
import clsx from 'clsx';
import { useState } from 'react';
import { Bounce, toast } from 'react-toastify';

import { useAppSelector } from '@/app/store';
import {
  getSubscriptionDaysLeft,
  getSubscriptionStatus,
  isSubscriptionBlocked,
} from '@/entities/session';
import {
  billingPlanIncludeGroups,
  billingPlans,
  getPlanByEndDate,
  getPlanSaving,
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

export function StationSubscriptionPanel() {
  const user = useAppSelector((state) => state.session.user);
  const subscriptionStatus = getSubscriptionStatus(user);
  const blocked = isSubscriptionBlocked(user);
  const subscriptionDaysLeft = getSubscriptionDaysLeft(user);
  const subscriptionEndsAt =
    subscriptionStatus === 'trial'
      ? user?.trial_ends_at
      : subscriptionStatus === 'active'
        ? user?.subscription_ends_at
        : null;
  const currentPlan = subscriptionStatus === 'active' ? getPlanByEndDate(subscriptionEndsAt) : null;
  const [selectedPlan, setSelectedPlan] = useState<BillingPlanId>(currentPlan?.id ?? 'quarter');

  let subscriptionBadge = 'Демо-доступ';
  let subscriptionTitle = 'Тариф не выбран';
  let subscriptionHint = 'Оплата появится после запуска. Пока вы работаете бесплатно.';
  let subscriptionPrice = '';
  let subscriptionPriceNote = '';
  let subscriptionDaysText = '';
  let progressPercent = 0;
  let actionLabel = 'Перейти к оплате';
  let subscriptionState: 'ok' | 'warn' | 'danger' = 'warn';

  if (subscriptionStatus === 'trial') {
    subscriptionBadge = 'Пробный период';
    subscriptionTitle = 'Знакомьтесь с сервисом';
    subscriptionHint = `Действует до ${formatPlanDate(subscriptionEndsAt)}. Дальше выберите тариф.`;
    subscriptionDaysText = `${subscriptionDaysLeft ?? 0}`;
    progressPercent = Math.min(100, Math.round(((subscriptionDaysLeft ?? 0) / 30) * 100));
    actionLabel = 'Оформить тариф';
    subscriptionState = 'ok';
  } else if (subscriptionStatus === 'active') {
    subscriptionBadge = 'Подписка активна';
    subscriptionTitle = currentPlan ? `Тариф «${currentPlan.title}»` : 'Подписка активна';
    subscriptionHint = `Действует до ${formatPlanDate(subscriptionEndsAt)}`;
    if (currentPlan) {
      subscriptionPrice = formatMoney(currentPlan.price);
      subscriptionPriceNote = currentPlan.hint;
      progressPercent = Math.min(
        100,
        Math.round(((subscriptionDaysLeft ?? 0) / (currentPlan.months * 30)) * 100),
      );
    }
    subscriptionDaysText = `${subscriptionDaysLeft ?? 0}`;
    actionLabel = 'Продлить';
    subscriptionState = 'ok';
  } else if (blocked) {
    subscriptionBadge = 'Подписка истекла';
    subscriptionTitle = 'Доступ приостановлен';
    subscriptionHint = 'Выберите тариф, чтобы снова работать с ремонтами и публичными ссылками.';
    subscriptionDaysText = '0';
    actionLabel = 'Оплатить и открыть доступ';
    subscriptionState = 'danger';
  }

  const handlePay = () => {
    toast.info('Оплата появится здесь. Сейчас это страница выбора тарифа.', {
      position: 'top-right',
      transition: Bounce,
    });
  };

  return (
    <div className={styles.wrap}>
      <section className={clsx(styles.statusCard, styles[`statusCard_${subscriptionState}`])}>
        <div className={styles.statusTop}>
          <span className={styles.statusBadge}>{subscriptionBadge}</span>
          {subscriptionDaysText ? (
            <div className={styles.statusDays}>
              <span className={styles.statusDaysValue}>{subscriptionDaysText}</span>
              <span className={styles.statusDaysLabel}>дн. осталось</span>
            </div>
          ) : null}
        </div>

        <h2 className={styles.statusTitle}>{subscriptionTitle}</h2>
        <p className={styles.statusHint}>{subscriptionHint}</p>

        {subscriptionPrice ? (
          <p className={styles.statusPriceRow}>
            <span className={styles.statusPrice}>{subscriptionPrice}</span>
            {subscriptionPriceNote ? (
              <span className={styles.statusPriceNote}>{subscriptionPriceNote}</span>
            ) : null}
          </p>
        ) : null}

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
          <p className={styles.plansHint}>
            Один набор функций, отличается только срок. Оплата ещё не подключена — кнопка пока не
            списывает деньги.
          </p>
        </div>

        <div className={styles.plans}>
          {billingPlans.map((plan) => {
            const saving = getPlanSaving(plan);

            return (
              <button
                className={clsx(
                  styles.plan,
                  plan.recommended && styles.planRecommended,
                  selectedPlan === plan.id && styles.planSelected,
                )}
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.recommended ? <span className={styles.planBadge}>Выгодно</span> : null}
                {currentPlan?.id === plan.id ? (
                  <span className={styles.planCurrent}>Текущий</span>
                ) : null}
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

        <div className={styles.includes}>
          <h3 className={styles.includesTitle}>Что входит</h3>
          <div className={styles.includesGroups}>
            {billingPlanIncludeGroups.map((group) => (
              <div className={styles.includesGroup} key={group.title}>
                <h4 className={styles.includesGroupTitle}>{group.title}</h4>
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
        </div>

        <Button size="large" type="primary" onClick={handlePay}>
          {actionLabel}
        </Button>
      </section>
    </div>
  );
}
