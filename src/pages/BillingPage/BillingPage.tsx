import { Button } from 'antd';
import clsx from 'clsx';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bounce, toast } from 'react-toastify';

import { useAppSelector } from '@/app/store';
import { getSubscriptionStatus, getTrialDaysLeft, isSubscriptionBlocked } from '@/entities/session';
import { useLogout } from '@/features/auth';
import { billingPlans, type BillingPlanId } from '@/features/billing';

import styles from './BillingPage.module.scss';

function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

export function BillingPage() {
  const user = useAppSelector((state) => state.session.user);
  const blocked = isSubscriptionBlocked(user);
  const trialDays = getTrialDaysLeft(user);
  const status = getSubscriptionStatus(user);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlanId>('quarter');
  const { logout, isLoading: isLoggingOut } = useLogout();

  const handlePay = () => {
    toast.info('Оплата появится здесь. Сейчас это страница выбора тарифа.', {
      position: 'top-right',
      transition: Bounce,
    });
  };

  const headline = blocked
    ? 'Пробный период закончился'
    : status === 'trial'
      ? `Пробный период: ещё ${trialDays ?? 0} дн.`
      : 'Подписка Автовидно';

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>АВ</span>
          <span className={styles.brandName}>Автовидно</span>
        </div>

        <h1 className={styles.title}>{headline}</h1>
        <p className={styles.subtitle}>
          {blocked
            ? 'Аккаунт заблокирован до оплаты. Выберите тариф, чтобы снова открыть ремонты и публичные ссылки станции.'
            : 'После 30 бесплатных дней выберите тариф. Оплата появится здесь.'}
        </p>

        <div className={styles.plans}>
          {billingPlans.map((plan) => (
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
              <span className={styles.planTitle}>{plan.title}</span>
              <span className={styles.planPrice}>{formatMoney(plan.price)}</span>
              <span className={styles.planHint}>{plan.hint}</span>
            </button>
          ))}
        </div>

        <div className={styles.actions}>
          <Button size="large" type="primary" onClick={handlePay}>
            Перейти к оплате
          </Button>
          {!blocked ? (
            <Link className={styles.backLink} to="/dashboard">
              Вернуться в сервис
            </Link>
          ) : (
            <Button loading={isLoggingOut} size="large" onClick={() => void logout()}>
              Выйти
            </Button>
          )}
        </div>

        <p className={styles.note}>
          Оплата ещё не подключена — кнопка пока не списывает деньги. Когда платёж заработает,
          доступ откроется сразу после успешной оплаты.
        </p>
      </div>
    </main>
  );
}
