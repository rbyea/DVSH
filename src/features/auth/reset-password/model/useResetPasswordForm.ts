import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bounce, toast } from 'react-toastify';

import { useResetPasswordMutation } from '@/entities/session';
import { applyApiFieldErrors, getErrorMessage } from '@/shared/lib/api';

import { resetPasswordFormSchema, type ResetPasswordFormValues } from './schema';

export function useResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const token = searchParams.get('token')?.trim() ?? '';
  const email = searchParams.get('email')?.trim() ?? '';

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: '', passwordConfirmation: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await resetPassword({
        token,
        email,
        password: values.password,
        password_confirmation: values.passwordConfirmation,
      }).unwrap();

      toast.success('Пароль обновлён. Войдите с новым паролем', {
        position: 'top-right',
        transition: Bounce,
      });
      navigate('/login', { replace: true });
    } catch (error) {
      applyApiFieldErrors(error, setError);
      toast.error(getErrorMessage(error, 'Не удалось сменить пароль. Запросите новую ссылку'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  });

  return {
    control,
    email,
    errors,
    // Без обоих параметров ссылка бесполезна — показываем это до отправки формы.
    hasCompleteLink: Boolean(token && email),
    isLoading,
    onSubmit,
  };
}
