import { baseApi } from '@/shared/api';

import type {
  CreateMasterRequest,
  Master,
  StationInfo,
  UpdateMasterRequest,
  UpdateStationRequest,
} from '../model/types';
import type { CreatePayoutExtraRequest, PayoutExtra, StationPayouts } from '../model/payouts';

type ApiDataResponse<T> = {
  data: T;
};

export const mastersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getStation: build.query<StationInfo, void>({
      query: () => '/station',
      transformResponse: (response: ApiDataResponse<StationInfo>) => response.data,
      providesTags: [{ type: 'Station', id: 'CURRENT' }],
    }),
    updateStation: build.mutation<StationInfo, UpdateStationRequest>({
      query: (body) => ({
        url: '/station',
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: ApiDataResponse<StationInfo>) => response.data,
      invalidatesTags: [
        { type: 'Station', id: 'CURRENT' },
        { type: 'Payout', id: 'LIST' },
      ],
    }),
    getMasters: build.query<Master[], void>({
      query: () => '/station/masters',
      transformResponse: (response: ApiDataResponse<Master[]>) => response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map((master) => ({ type: 'Master' as const, id: master.id })),
              { type: 'Master', id: 'LIST' },
            ]
          : [{ type: 'Master', id: 'LIST' }],
    }),
    createMaster: build.mutation<Master, CreateMasterRequest>({
      query: (body) => ({
        url: '/station/masters',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiDataResponse<Master>) => response.data,
      invalidatesTags: [{ type: 'Master', id: 'LIST' }],
    }),
    updateMaster: build.mutation<Master, { id: string; body: UpdateMasterRequest }>({
      query: ({ id, body }) => ({
        url: `/station/masters/${id}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: ApiDataResponse<Master>) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Master', id },
        { type: 'Master', id: 'LIST' },
      ],
    }),
    deleteMaster: build.mutation<void, string>({
      query: (id) => ({
        url: `/station/masters/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Master', id },
        { type: 'Master', id: 'LIST' },
      ],
    }),
    getStationPayouts: build.query<StationPayouts, { from: string; to: string }>({
      query: ({ from, to }) => ({
        url: '/station/payouts',
        params: { from, to },
      }),
      transformResponse: (response: ApiDataResponse<StationPayouts>) => response.data,
      providesTags: [{ type: 'Payout', id: 'LIST' }],
    }),
    createPayoutExtra: build.mutation<PayoutExtra, CreatePayoutExtraRequest>({
      query: (body) => ({
        url: '/station/payouts/extras',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiDataResponse<PayoutExtra>) => response.data,
      invalidatesTags: [{ type: 'Payout', id: 'LIST' }],
    }),
    deletePayoutExtra: build.mutation<void, string>({
      query: (id) => ({
        url: `/station/payouts/extras/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Payout', id: 'LIST' }],
    }),
    togglePayoutSettlement: build.mutation<
      { settled: boolean },
      { occurred_on: string; master_id: string | null }
    >({
      query: (body) => ({
        url: '/station/payouts/settlements',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiDataResponse<{ settled: boolean }>) => response.data,
      invalidatesTags: [{ type: 'Payout', id: 'LIST' }],
    }),
    togglePayoutExtraSettle: build.mutation<{ id: string; settled: boolean }, string>({
      query: (id) => ({
        url: `/station/payouts/extras/${id}/settle`,
        method: 'POST',
      }),
      transformResponse: (response: ApiDataResponse<{ id: string; settled: boolean }>) =>
        response.data,
      invalidatesTags: [{ type: 'Payout', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetStationQuery,
  useUpdateStationMutation,
  useGetMastersQuery,
  useCreateMasterMutation,
  useUpdateMasterMutation,
  useDeleteMasterMutation,
  useGetStationPayoutsQuery,
  useCreatePayoutExtraMutation,
  useDeletePayoutExtraMutation,
  useTogglePayoutExtraSettleMutation,
  useTogglePayoutSettlementMutation,
} = mastersApi;
