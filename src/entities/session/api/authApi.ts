import { baseApi } from '@/shared/api';

import type {
  ApiDataResponse,
  LoginRequest,
  LoginResponseData,
  RegisterRequest,
  TokenPayload,
  User,
} from '../model/types';

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    register: build.mutation<LoginResponseData, RegisterRequest>({
      query: (body) => ({
        url: '/auth/register',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiDataResponse<LoginResponseData>) => response.data,
      invalidatesTags: ['Session'],
    }),
    login: build.mutation<LoginResponseData, LoginRequest>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiDataResponse<LoginResponseData>) => response.data,
      invalidatesTags: ['Session'],
    }),
    logout: build.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
        responseHandler: async (response) => {
          if (response.status === 204) {
            return undefined;
          }

          return response.json();
        },
      }),
      invalidatesTags: ['Session'],
    }),
    me: build.query<User, void>({
      query: () => '/auth/me',
      transformResponse: (response: ApiDataResponse<User>) => response.data,
      providesTags: ['Session'],
    }),
    refresh: build.mutation<TokenPayload, void>({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
      }),
      transformResponse: (response: ApiDataResponse<TokenPayload>) => response.data,
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useMeQuery,
  useRefreshMutation,
  useRegisterMutation,
} = authApi;
