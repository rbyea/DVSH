import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Bounce, toast } from 'react-toastify';

import { useForgotPasswordMutation } from '@/entities/session';
import { applyApiFieldErrors, getErrorMessage } from '@/shared/lib/api';

import { forgotPasswordFormSchema, type ForgotPasswordFormValues } from './schema';

export function useForgotPasswordForm() {
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await forgotPassword({ email: values.email }).unwrap();

      // Бэкенд намеренно отвечает одинаково для знакомых и незнакомых адресов,
      // поэтому экран подтверждения тоже не должен выдавать, что адрес найден.
      setSentTo(values.email);
    } catch (error) {
      applyApiFieldErrors(error, setError);
      toast.error(getErrorMessage(error, 'Не удалось отправить письмо. Попробуйте ещё раз'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  });

  return {
    control,
    errors,
    isLoading,
    onSubmit,
    sentTo,
    startOver: () => setSentTo(null),
  };
}
