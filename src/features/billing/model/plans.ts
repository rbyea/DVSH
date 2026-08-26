export type BillingPlanId = 'month' | 'quarter' | 'year';

export type BillingPlan = {
  id: BillingPlanId;
  months: number;
  price: number;
  title: string;
  hint: string;
  recommended?: boolean;
};

export const billingPlans: BillingPlan[] = [
  {
    id: 'month',
    months: 1,
    price: 1200,
    title: '1 месяц',
    hint: '1 200 ₽/мес',
  },
  {
    id: 'quarter',
    months: 3,
    price: 3300,
    title: '3 месяца',
    hint: '~1 100 ₽/мес',
    recommended: true,
  },
  {
    id: 'year',
    months: 12,
    price: 12000,
    title: '12 месяцев',
    hint: '1 000 ₽/мес',
  },
];

/** Что входит в любой тариф — набор функций один, отличается только срок. */
export const billingPlanIncludeGroups = [
  {
    title: 'Учёт на станции',
    items: [
      'Заказ-наряды без лимита: приёмка, статусы, поиск',
      'Клиенты и несколько авто на клиента — госномер, VIN или шасси, пробег',
      'Работы: цена, часы, доп. работы, назначение мастера',
      'Запчасти в заказ-наряде',
      'Печать заказ-наряда',
      'Диагностика сканера: CSV с кодами ошибок, сверка VIN, карточка авто',
    ],
  },
  {
    title: 'Клиенту',
    items: [
      'Публичная ссылка без приложения и регистрации',
      'Согласование работ и подтверждение после выдачи',
      'История ремонтов по автомобилю',
      'Диагностика сканера на карточке авто',
      'Уведомления о статусе в MAX',
    ],
  },
  {
    title: 'Станция',
    items: [
      'Справочник мастеров',
      'Сводка выполненных работ и доля мастера',
      'Профиль станции: название, телефон, адрес, график',
    ],
  },
] as const;

export function getPlanSaving(plan: BillingPlan): number {
  const monthPlan = billingPlans.find((item) => item.id === 'month');

  if (!monthPlan || plan.id === 'month') {
    return 0;
  }

  return Math.max(0, monthPlan.price * plan.months - plan.price);
}

const MS_IN_DAY = 24 * 60 * 60 * 1000;
const DAYS_IN_MONTH = 30.4375;

/** Тариф, купленный на оставшийся срок (по длительности активного периода). */
export function getPlanByDurationMs(durationMs: number): BillingPlan | null {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return null;
  }

  const months = Math.round(durationMs / MS_IN_DAY / DAYS_IN_MONTH);

  return billingPlans.find((plan) => plan.months === months) ?? null;
}

/** Ближайший тариф по длительности (если точного 1/3/12 мес нет). */
export function getNearestPlanByDurationMs(durationMs: number): BillingPlan | null {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return null;
  }

  const months = durationMs / MS_IN_DAY / DAYS_IN_MONTH;

  return billingPlans.reduce((closest, plan) =>
    Math.abs(plan.months - months) < Math.abs(closest.months - months) ? plan : closest,
  );
}

/** Тариф по дате окончания оплаченного периода. */
export function getPlanByEndDate(endDate: string | null | undefined): BillingPlan | null {
  if (!endDate) {
    return null;
  }

  const endsAt = Date.parse(endDate);

  if (Number.isNaN(endsAt)) {
    return null;
  }

  return getPlanByDurationMs(endsAt - Date.now());
}

export function getNearestPlanByEndDate(endDate: string | null | undefined): BillingPlan | null {
  if (!endDate) {
    return null;
  }

  const endsAt = Date.parse(endDate);

  if (Number.isNaN(endsAt)) {
    return null;
  }

  return getNearestPlanByDurationMs(endsAt - Date.now());
}
