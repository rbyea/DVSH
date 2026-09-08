import { Bounce, toast } from 'react-toastify';

import { useSendEmailVerificationMutation } from '@/entities/session';
import { getErrorMessage } from '@/shared/lib/api';

export function useEmailVerification() {
  const [sendVerification, { isLoading }] = useSendEmailVerificationMutation();

  const resend = async () => {
    try {
      const { message } = await sendVerification().unwrap();

      toast.success(message || 'Письмо отправлено. Проверьте почту', {
        position: 'top-right',
        transition: Bounce,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось отправить письмо. Попробуйте позже'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  return { isLoading, resend };
}
