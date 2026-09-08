import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Bounce, toast } from 'react-toastify';

import { useUpdatePasswordMutation } from '@/entities/session';
import { applyApiFieldErrors, getErrorMessage } from '@/shared/lib/api';
import { setAccessToken } from '@/shared/lib/auth';

import { changePasswordFormSchema, type ChangePasswordFormValues } from './schema';

const EMPTY_FORM: ChangePasswordFormValues = {
  currentPassword: '',
  password: '',
  passwordConfirmation: '',
};

export function useChangePasswordForm(onSuccess?: () => void) {
  const [updatePassword, { isLoading }] = useUpdatePasswordMutation();

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: EMPTY_FORM,
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updatePassword({
        current_password: values.currentPassword,
        password: values.password,
        password_confirmation: values.passwordConfirmation,
      }).unwrap();

      // Прежний токен ушёл в блэклист, но бэкенд тем же ответом прислал
      // новую куку — обновляем флаг сессии, чтобы вкладка не разлогинилась.
      setAccessToken();
      reset(EMPTY_FORM);
      toast.success('Пароль обновлён', {
        position: 'top-right',
        transition: Bounce,
      });
      onSuccess?.();
    } catch (error) {
      applyApiFieldErrors(error, setError);
      toast.error(getErrorMessage(error, 'Не удалось изменить пароль. Попробуйте ещё раз'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  });

  const resetForm = () => reset(EMPTY_FORM);

  return {
    control,
    errors,
    isLoading,
    onSubmit,
    resetForm,
  };
}
