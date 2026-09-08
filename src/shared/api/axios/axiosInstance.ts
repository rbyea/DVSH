import axios from 'axios';

import { API_BASE_URL } from '@/shared/config';
import { clearAccessToken, hasAccessToken, setAccessToken } from '@/shared/lib/auth';

import type { ApiDataResponse, TokenPayload } from '@/entities/session/model/types';

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

type RetriableConfig = {
  _isRetry?: boolean;
};

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (!hasAccessToken()) {
    return false;
  }

  if (!refreshPromise) {
    refreshPromise = axios
      .post<ApiDataResponse<TokenPayload>>(`${API_BASE_URL}/auth/refresh`, undefined, {
        withCredentials: true,
        headers: {
          Accept: 'application/json',
        },
      })
      .then(() => {
        setAccessToken();
        return true;
      })
      .catch(() => {
        clearAccessToken();
        return false;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as typeof error.config & RetriableConfig;
    const requestUrl = originalRequest.url ?? '';
    const isAuthEndpoint =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/logout');

    if (error.response?.status !== 401 || originalRequest._isRetry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    originalRequest._isRetry = true;

    const refreshed = await refreshAccessToken();

    if (!refreshed) {
      return Promise.reject(error);
    }

    return axiosInstance(originalRequest);
  },
);
