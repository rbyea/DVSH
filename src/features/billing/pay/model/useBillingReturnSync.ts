import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Bounce, toast } from 'react-toastify';

import { useAppDispatch } from '@/app/store';
import { billingApi, useLazyGetBillingPaymentByAlfaOrderQuery } from '@/entities/billing';
import { useLazyMeQuery } from '@/entities/session';

const POLL_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 2500;

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function useBillingReturnSync() {
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const ranRef = useRef(false);
  const [loadPayment] = useLazyGetBillingPaymentByAlfaOrderQuery();
  const [loadMe] = useLazyMeQuery();

  useEffect(() => {
    if (ranRef.current) {
      return undefined;
    }

    const paymentFlag = searchParams.get('payment');
    const orderId = searchParams.get('orderId');

    if (paymentFlag !== 'fail' && !orderId) {
      return undefined;
    }

    ranRef.current = true;

    const next = new URLSearchParams(searchParams);
    next.delete('orderId');
    next.delete('payment');
    const search = next.toString();
    const pathname = location.pathname;
    const hash = location.hash || '#subscription';

    navigate(
      {
        pathname,
        hash,
        search: search ? `?${search}` : '',
      },
      { replace: true },
    );

    if (paymentFlag === 'fail') {
      toast.error('Оплата не прошла. Можно выбрать тариф и попробовать снова', {
        position: 'top-right',
        transition: Bounce,
      });
      return undefined;
    }

    if (!orderId) {
      return undefined;
    }

    const alfaOrderId = orderId;
    let cancelled = false;
    const toastId = toast.loading('Проверяем оплату в банке…', {
      position: 'top-right',
    });

    void (async () => {
      for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
        if (attempt > 0) {
          await wait(POLL_INTERVAL_MS);
        }

        if (cancelled) {
          toast.dismiss(toastId);
          return;
        }

        try {
          const payment = await loadPayment(alfaOrderId, false).unwrap();
          dispatch(billingApi.util.invalidateTags([{ type: 'Billing', id: 'LIST' }]));

          if (payment.status === 'paid') {
            await loadMe();
            toast.update(toastId, {
              render: 'Оплата прошла, подписка обновлена',
              type: 'success',
              isLoading: false,
              autoClose: 4000,
              transition: Bounce,
            });
            return;
          }

          if (payment.status === 'declined' || payment.status === 'failed') {
            toast.update(toastId, {
              render: 'Банк отклонил оплату',
              type: 'error',
              isLoading: false,
              autoClose: 5000,
              transition: Bounce,
            });
            return;
          }
        } catch {
          if (attempt === POLL_ATTEMPTS - 1) {
            await loadMe().catch(() => undefined);
            toast.update(toastId, {
              render: 'Не удалось подтвердить оплату. Откройте историю оплат через минуту',
              type: 'info',
              isLoading: false,
              autoClose: 6000,
              transition: Bounce,
            });
            return;
          }
        }
      }

      await loadMe().catch(() => undefined);
      toast.update(toastId, {
        render: 'Банк ещё не подтвердил оплату. Статус появится в истории, когда пройдёт',
        type: 'info',
        isLoading: false,
        autoClose: 6000,
        transition: Bounce,
      });
    })();

    return () => {
      cancelled = true;
    };
    // Снимаем orderId с URL — эффект не должен из‑за этого оборвать опрос.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
