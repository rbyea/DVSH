import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { Spin } from 'antd';
import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/store';
import { clearSession, setSession, useMeQuery } from '@/entities/session';
import { baseApi } from '@/shared/api';
import { clearAccessToken, hasAccessToken } from '@/shared/lib/auth';

import styles from './RequireAuth.module.scss';

function isUnauthorizedError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('status' in error)) {
    return false;
  }

  return (error as FetchBaseQueryError).status === 401;
}

export function RequireAuth() {
  const dispatch = useAppDispatch();
  const sessionUser = useAppSelector((state) => state.session.user);
  const hasToken = hasAccessToken();
  const { data, error, isLoading, isError, isSuccess } = useMeQuery(undefined, {
    skip: !hasToken,
  });
  const unauthorized = isError && isUnauthorizedError(error);

  useEffect(() => {
    if (isSuccess && data) {
      dispatch(setSession(data));
    }
  }, [data, dispatch, isSuccess]);

  useEffect(() => {
    if (!unauthorized) {
      return;
    }

    clearAccessToken();
    dispatch(clearSession());
    dispatch(baseApi.util.resetApiState());
  }, [dispatch, unauthorized]);

  if (!hasToken || unauthorized) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading && !sessionUser && !data) {
    return (
      <div className={styles.loading}>
        <Spin size="large" />
      </div>
    );
  }

  return <Outlet />;
}
