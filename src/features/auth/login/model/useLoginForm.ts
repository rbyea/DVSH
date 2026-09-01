import { zodResolver } from '@hookform/resolvers/zod';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Bounce, toast } from 'react-toastify';

import { useAppDispatch } from '@/app/store';
import { setSession, useLoginMutation, getPostAuthPath } from '@/entities/session';
import { setAccessToken } from '@/shared/lib/auth';
import { storeEmployeePdnConsent } from '@/shared/lib/legal';

import { loginFormSchema, type LoginFormValues } from './schema';

function isFetchBaseQueryError(error: unknown): error is FetchBaseQueryError {
  return typeof error === 'object' && error !== null && 'status' in error;
}

function getLoginErrorMessage(error: unknown): string {
  if (isFetchBaseQueryError(error)) {
    const data = error.data;

    if (
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof data.message === 'string' &&
      data.message
    ) {
      const normalized = data.message.toLowerCase().trim().replace(/\.$/, '');

      if (normalized === 'unauthorized' || normalized === 'unauthenticated') {
        return 'Неверный email или пароль';
      }

      return data.message;
    }

    if (typeof data === 'string' && data) {
      const normalized = data.toLowerCase().trim().replace(/\.$/, '');

      if (normalized === 'unauthorized' || normalized === 'unauthenticated') {
        return 'Неверный email или пароль';
      }
    }

    if (error.status === 401) {
      return 'Неверный email или пароль';
    }

    if (error.status === 403) {
      return 'Подписка закончилась. Войдите и оплатите доступ';
    }

    if (error.status === 422) {
      return 'Проверьте правильность введённых данных';
    }
  }

  return 'Не удалось войти. Попробуйте ещё раз';
}

export function useLoginForm() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [login, { isLoading }] = useLoginMutation();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
      acceptPersonalData: false,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const data = await login({
        email: values.email,
        password: values.password,
      }).unwrap();

      setAccessToken(data.access_token);
      dispatch(setSession(data.user));
      storeEmployeePdnConsent();
      navigate(getPostAuthPath(data.user), { replace: true });
    } catch (error) {
      toast.error(getLoginErrorMessage(error), {
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
  };
}
