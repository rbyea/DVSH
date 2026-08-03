import { Spin } from 'antd';
import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { useAppDispatch } from '@/app/store';
import { clearSession, setSession, useMeQuery } from '@/entities/session';
import { baseApi } from '@/shared/api';
import { clearAccessToken, hasAccessToken } from '@/shared/lib/auth';

import styles from './RequireAuth.module.scss';

export function RequireAuth() {
  const dispatch = useAppDispatch();
  const hasToken = hasAccessToken();
  const { data, isLoading, isError, isSuccess } = useMeQuery(undefined, {
    skip: !hasToken,
  });

  useEffect(() => {
    if (isSuccess && data) {
      dispatch(setSession(data));
    }
  }, [data, dispatch, isSuccess]);

  useEffect(() => {
    if (!isError) {
      return;
    }

    clearAccessToken();
    dispatch(clearSession());
    dispatch(baseApi.util.resetApiState());
  }, [dispatch, isError]);

  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spin size="large" />
      </div>
    );
  }

  if (isError) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
