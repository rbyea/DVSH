export type BillingPlanId = 'month' | 'quarter' | 'year';

export type BillingPaymentStatus = 'pending' | 'paid' | 'declined' | 'failed';

export type BillingPayment = {
  id: number | string;
  plan: BillingPlanId;
  amount: number;
  status: BillingPaymentStatus;
  payment_url?: string | null;
  alfa_order_id?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
};

export type CreateBillingPaymentRequest = {
  plan: BillingPlanId;
};

export type CreateBillingPaymentResponse = {
  payment_id: string;
  payment_url: string;
};
