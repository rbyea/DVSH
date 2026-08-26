import { baseApi } from '@/shared/api';

import type {
  BillingPayment,
  CreateBillingPaymentRequest,
  CreateBillingPaymentResponse,
} from '../model/types';

type ApiDataResponse<T> = {
  data: T;
};

export const billingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    createBillingPayment: build.mutation<CreateBillingPaymentResponse, CreateBillingPaymentRequest>(
      {
        query: (body) => ({
          url: '/billing/payments',
          method: 'POST',
          body,
        }),
        transformResponse: (response: ApiDataResponse<CreateBillingPaymentResponse>) =>
          response.data,
        invalidatesTags: [{ type: 'Billing', id: 'LIST' }],
      },
    ),
    getBillingPayments: build.query<BillingPayment[], void>({
      query: () => '/billing/payments',
      transformResponse: (response: ApiDataResponse<BillingPayment[]>) => response.data,
      providesTags: [{ type: 'Billing', id: 'LIST' }],
    }),
    getBillingPaymentByAlfaOrder: build.query<BillingPayment, string>({
      query: (alfaOrderId) => ({
        url: '/billing/payments',
        params: { alfa_order_id: alfaOrderId },
      }),
      transformResponse: (response: ApiDataResponse<BillingPayment>) => response.data,
      providesTags: (result) =>
        result ? [{ type: 'Billing', id: result.id }] : [{ type: 'Billing', id: 'LIST' }],
    }),
  }),
});

export const {
  useCreateBillingPaymentMutation,
  useGetBillingPaymentsQuery,
  useLazyGetBillingPaymentByAlfaOrderQuery,
} = billingApi;
