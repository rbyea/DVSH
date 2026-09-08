import { baseApi } from '@/shared/api';

import type {
  ApiDataResponse,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponseData,
  MessageResponse,
  RegisterRequest,
  ResetPasswordRequest,
  TokenPayload,
  UpdatePasswordRequest,
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
    updatePassword: build.mutation<TokenPayload, UpdatePasswordRequest>({
      query: (body) => ({
        url: '/auth/password',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiDataResponse<TokenPayload>) => response.data,
    }),
    forgotPassword: build.mutation<MessageResponse, ForgotPasswordRequest>({
      query: (body) => ({
        url: '/auth/password/forgot',
        method: 'POST',
        body,
      }),
    }),
    resetPassword: build.mutation<MessageResponse, ResetPasswordRequest>({
      query: (body) => ({
        url: '/auth/password/reset',
        method: 'POST',
        body,
      }),
    }),
    sendEmailVerification: build.mutation<MessageResponse, void>({
      query: () => ({
        url: '/auth/email/verification',
        method: 'POST',
      }),
    }),
    acknowledgeWhatsNew: build.mutation<User, { id: string }>({
      query: (body) => ({
        url: '/auth/whats-new/seen',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiDataResponse<User>) => response.data,
      invalidatesTags: ['Session'],
    }),
  }),
});

export const {
  useAcknowledgeWhatsNewMutation,
  useForgotPasswordMutation,
  useLoginMutation,
  useLogoutMutation,
  useMeQuery,
  useLazyMeQuery,
  useRefreshMutation,
  useRegisterMutation,
  useResetPasswordMutation,
  useSendEmailVerificationMutation,
  useUpdatePasswordMutation,
} = authApi;
