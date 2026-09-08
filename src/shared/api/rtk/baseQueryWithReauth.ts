import {
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
  fetchBaseQuery,
} from '@reduxjs/toolkit/query';

import { clearSession } from '@/entities/session/model/sessionSlice';
import type { ApiDataResponse, TokenPayload } from '@/entities/session/model/types';
import { API_BASE_URL } from '@/shared/config';
import { clearAccessToken, hasAccessToken, setAccessToken } from '@/shared/lib/auth';

function isPublicApiUrl(url: string): boolean {
  return url.includes('/public/');
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: 'include',
  prepareHeaders: (headers) => {
    headers.set('Accept', 'application/json');
    headers.set('Content-Type', 'application/json');

    return headers;
  },
});

type RefreshResponse = ApiDataResponse<TokenPayload>;

let refreshPromise: Promise<boolean> | null = null;

function getRequestUrl(args: string | FetchArgs): string {
  return typeof args === 'string' ? args : args.url;
}

function shouldSkipReauth(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout') ||
    isPublicApiUrl(url)
  );
}

async function tryRefreshAccessToken(
  api: Parameters<BaseQueryFn>[1],
  extraOptions: Parameters<BaseQueryFn>[2],
): Promise<boolean> {
  if (!hasAccessToken()) {
    return false;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshResult = await rawBaseQuery(
        { url: '/auth/refresh', method: 'POST' },
        api,
        extraOptions,
      );

      if (refreshResult.data && typeof refreshResult.data === 'object') {
        const payload = refreshResult.data as RefreshResponse;

        if (payload.data?.token_type) {
          setAccessToken();
          return true;
        }
      }

      clearAccessToken();
      api.dispatch(clearSession());
      return false;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  const url = getRequestUrl(args);

  if (result.error?.status !== 401 || shouldSkipReauth(url)) {
    return result;
  }

  const refreshed = await tryRefreshAccessToken(api, extraOptions);

  if (!refreshed) {
    return result;
  }

  result = await rawBaseQuery(args, api, extraOptions);
  return result;
};
