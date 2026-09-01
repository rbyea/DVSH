import axios from 'axios';

import { API_BASE_URL } from '@/shared/config';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/shared/lib/auth';

import type { ApiDataResponse, TokenPayload } from '@/entities/session/model/types';

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    const requestUrl = String(config.url ?? '');

    if (token && !requestUrl.includes('/public/')) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

type RetriableConfig = {
  _isRetry?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const currentToken = getAccessToken();

  if (!currentToken) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = axios
      .post<ApiDataResponse<TokenPayload>>(`${API_BASE_URL}/auth/refresh`, undefined, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
      })
      .then((response) => {
        const accessToken = response.data.data.access_token;
        setAccessToken(accessToken);
        return accessToken;
      })
      .catch(() => {
        clearAccessToken();
        return null;
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

    const accessToken = await refreshAccessToken();

    if (!accessToken) {
      return Promise.reject(error);
    }

    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
    return axiosInstance(originalRequest);
  },
);
