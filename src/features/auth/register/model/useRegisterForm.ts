import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bounce, toast } from 'react-toastify';

import { useAppDispatch } from '@/app/store';
import { getPostAuthPath, setSession, useRegisterMutation } from '@/entities/session';
import { applyApiFieldErrors, getErrorMessage } from '@/shared/lib/api';
import { setAccessToken } from '@/shared/lib/auth';
import { storeEmployeePdnConsent } from '@/shared/lib/legal';

import { registerFormSchema, type RegisterFormValues } from './schema';

export function useRegisterForm() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref')?.trim().toUpperCase() || undefined;
  const [registerAccount, { isLoading }] = useRegisterMutation();

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      stationName: '',
      name: '',
      email: '',
      password: '',
      passwordConfirmation: '',
      acceptPersonalData: false,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const data = await registerAccount({
        name: values.name,
        email: values.email,
        password: values.password,
        password_confirmation: values.passwordConfirmation,
        station_name: values.stationName,
        ...(referralCode ? { referral_code: referralCode } : {}),
      }).unwrap();

      setAccessToken(data.access_token);
      dispatch(setSession(data.user));
      storeEmployeePdnConsent();
      toast.success(
        referralCode
          ? 'Аккаунт создан. 60 дней бесплатно по приглашению'
          : 'Аккаунт создан. 30 дней бесплатно',
        {
          position: 'top-right',
          transition: Bounce,
        },
      );
      navigate(getPostAuthPath(data.user), { replace: true });
    } catch (error) {
      applyApiFieldErrors(error, setError);
      toast.error(getErrorMessage(error, 'Не удалось зарегистрироваться. Попробуйте ещё раз'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  });

  return {
    control,
    errors,
    isLoading,
    isInvited: Boolean(referralCode),
    onSubmit,
  };
}
