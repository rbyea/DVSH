import { Bounce, toast } from 'react-toastify';

import { useCreateBillingPaymentMutation, type BillingPlanId } from '@/entities/billing';
import { getErrorMessage } from '@/shared/lib/api';

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 404;
}

export function useStartSubscriptionPayment() {
  const [createPayment, { isLoading }] = useCreateBillingPaymentMutation();

  const startPayment = async (plan: BillingPlanId, options?: { newTab?: boolean }) => {
    const newTab = options?.newTab ? window.open('about:blank', '_blank') : null;

    try {
      const result = await createPayment({ plan }).unwrap();

      if (!result.payment_url) {
        newTab?.close();
        toast.error('Банк не вернул ссылку на оплату', {
          position: 'top-right',
          transition: Bounce,
        });
        return;
      }

      if (newTab) {
        newTab.opener = null;
        newTab.location.assign(result.payment_url);
        return;
      }

      window.location.assign(result.payment_url);
    } catch (error) {
      newTab?.close();
      toast.error(
        isNotFound(error)
          ? 'На сервере ещё нет оплаты. Нужен выкат POST /billing/payments'
          : getErrorMessage(error, 'Не удалось начать оплату'),
        {
          position: 'top-right',
          transition: Bounce,
        },
      );
    }
  };

  return { startPayment, isPaying: isLoading };
}
