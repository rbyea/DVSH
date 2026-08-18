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
