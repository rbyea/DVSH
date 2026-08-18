import { baseApi } from '@/shared/api';
import { extractPublicToken } from '@/shared/lib/public-repair';

import { normalizeRepairDetail } from '../model/normalize';
import type {
  ApprovePublicEstimateRequest,
  ConfirmPublicRepairRequest,
  CreatePartRequest,
  CreateWorkItemRequest,
  GetRepairsParams,
  PublicLinkResponse,
  PublicVehicle,
  RepairCreated,
  RepairDetail,
  RepairListResponse,
  RepairPart,
  RepairStatus,
  RepairWorkItem,
  StoreRepairRequest,
  UpdatePartRequest,
  UpdateRepairRequest,
  UpdateWorkItemRequest,
} from '../model/types';

type ApiDataResponse<T> = {
  data: T;
};

type TagDescription = { type: 'Repair'; id?: string } | { type: 'PublicRepair'; id?: string };

function publicRepairTagsFromRepair(
  repair: Pick<RepairDetail, 'public_token' | 'public_url'> | undefined,
): TagDescription[] {
  const token = extractPublicToken(repair?.public_token, repair?.public_url);

  if (token) {
    return [{ type: 'PublicRepair', id: token }];
  }

  return [{ type: 'PublicRepair' }];
}

export const repairsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getRepairs: build.query<RepairListResponse, GetRepairsParams | void>({
      query: (params) => ({
        url: '/repairs',
        params: params
          ? {
              search: params.search || undefined,
              status: params.status,
              page: params.page,
              per_page: params.per_page,
            }
          : undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Repair' as const, id })),
              { type: 'Repair' as const, id: 'LIST' },
            ]
          : [{ type: 'Repair' as const, id: 'LIST' }],
    }),
    getRepair: build.query<RepairDetail, string>({
      query: (id) => `/repairs/${id}`,
      transformResponse: (response: ApiDataResponse<RepairDetail>) =>
        normalizeRepairDetail(response.data),
      providesTags: (_result, _error, id) => [{ type: 'Repair', id }],
    }),
    getPublicRepair: build.query<PublicVehicle, string>({
      query: (publicToken) => `/public/vehicles/${publicToken}`,
      transformResponse: (response: ApiDataResponse<PublicVehicle>) => response.data,
      providesTags: (_result, _error, publicToken) => [{ type: 'PublicRepair', id: publicToken }],
    }),
    approvePublicEstimate: build.mutation<
      PublicVehicle,
      { publicToken: string; body: ApprovePublicEstimateRequest }
    >({
      query: ({ publicToken, body }) => ({
        url: `/public/vehicles/${publicToken}/estimate`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiDataResponse<PublicVehicle>) => response.data,
      async onQueryStarted({ publicToken }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(repairsApi.util.updateQueryData('getPublicRepair', publicToken, () => data));
        } catch {
          // Keep previous cache on failure.
        }
      },
      invalidatesTags: (_result, _error, { publicToken }) => [
        { type: 'PublicRepair', id: publicToken },
        // Public payload has no repair id — invalidate all staff Repair queries.
        { type: 'Repair' },
      ],
    }),
    confirmPublicRepair: build.mutation<
      PublicVehicle,
      { publicToken: string; body: ConfirmPublicRepairRequest }
    >({
      query: ({ publicToken, body }) => ({
        url: `/public/vehicles/${publicToken}/confirm`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiDataResponse<PublicVehicle>) => response.data,
      async onQueryStarted({ publicToken }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(repairsApi.util.updateQueryData('getPublicRepair', publicToken, () => data));
        } catch {
          // Keep previous cache on failure.
        }
      },
      invalidatesTags: (_result, _error, { publicToken }) => [
        { type: 'PublicRepair', id: publicToken },
        { type: 'Repair' },
      ],
    }),
    createRepair: build.mutation<RepairCreated, StoreRepairRequest>({
      query: (body) => ({
        url: '/repairs',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiDataResponse<RepairCreated>) => response.data,
      invalidatesTags: [{ type: 'Repair', id: 'LIST' }],
    }),
    updateRepair: build.mutation<RepairDetail, { repairId: string; body: UpdateRepairRequest }>({
      query: ({ repairId, body }) => ({
        url: `/repairs/${repairId}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: ApiDataResponse<RepairDetail>) =>
        normalizeRepairDetail(response.data),
      invalidatesTags: (result, _error, { repairId }) => [
        { type: 'Repair', id: repairId },
        { type: 'Repair', id: 'LIST' },
        ...publicRepairTagsFromRepair(result),
      ],
    }),
    updateRepairStatus: build.mutation<RepairDetail, { repairId: string; status: RepairStatus }>({
      query: ({ repairId, status }) => ({
        url: `/repairs/${repairId}/status`,
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: (response: ApiDataResponse<RepairDetail>) =>
        normalizeRepairDetail(response.data),
      invalidatesTags: (result, _error, { repairId }) => [
        { type: 'Repair', id: repairId },
        { type: 'Repair', id: 'LIST' },
        ...publicRepairTagsFromRepair(result),
      ],
    }),
    regeneratePublicLink: build.mutation<PublicLinkResponse, string>({
      query: (repairId) => ({
        url: `/repairs/${repairId}/public-link`,
        method: 'POST',
      }),
      transformResponse: (response: ApiDataResponse<PublicLinkResponse>) => response.data,
      invalidatesTags: (_result, _error, repairId) => [
        { type: 'Repair', id: repairId },
        { type: 'PublicRepair' },
      ],
    }),
    addWorkItem: build.mutation<RepairWorkItem, { repairId: string; body: CreateWorkItemRequest }>({
      query: ({ repairId, body }) => ({
        url: `/repairs/${repairId}/work-items`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiDataResponse<RepairWorkItem>) => response.data,
      invalidatesTags: (_result, _error, { repairId }) => [
        { type: 'Repair', id: repairId },
        { type: 'PublicRepair' },
      ],
    }),
    updateWorkItem: build.mutation<
      RepairWorkItem,
      { repairId: string; workItemId: string; body: UpdateWorkItemRequest }
    >({
      query: ({ repairId, workItemId, body }) => ({
        url: `/repairs/${repairId}/work-items/${workItemId}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: ApiDataResponse<RepairWorkItem>) => response.data,
      invalidatesTags: (_result, _error, { repairId }) => [
        { type: 'Repair', id: repairId },
        { type: 'Repair', id: 'LIST' },
        { type: 'PublicRepair' },
      ],
    }),
    deleteWorkItem: build.mutation<void, { repairId: string; workItemId: string }>({
      query: ({ repairId, workItemId }) => ({
        url: `/repairs/${repairId}/work-items/${workItemId}`,
        method: 'DELETE',
        responseHandler: async (response) => {
          if (response.status === 204) {
            return undefined;
          }

          return response.json();
        },
      }),
      invalidatesTags: (_result, _error, { repairId }) => [
        { type: 'Repair', id: repairId },
        { type: 'Repair', id: 'LIST' },
        { type: 'PublicRepair' },
      ],
    }),
    addPart: build.mutation<RepairPart, { repairId: string; body: CreatePartRequest }>({
      query: ({ repairId, body }) => ({
        url: `/repairs/${repairId}/parts`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiDataResponse<RepairPart>) => response.data,
      invalidatesTags: (_result, _error, { repairId }) => [{ type: 'Repair', id: repairId }],
    }),
    updatePart: build.mutation<
      RepairPart,
      { repairId: string; partId: string; body: UpdatePartRequest }
    >({
      query: ({ repairId, partId, body }) => ({
        url: `/repairs/${repairId}/parts/${partId}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: ApiDataResponse<RepairPart>) => response.data,
      invalidatesTags: (_result, _error, { repairId }) => [{ type: 'Repair', id: repairId }],
    }),
    deletePart: build.mutation<void, { repairId: string; partId: string }>({
      query: ({ repairId, partId }) => ({
        url: `/repairs/${repairId}/parts/${partId}`,
        method: 'DELETE',
        responseHandler: async (response) => {
          if (response.status === 204) {
            return undefined;
          }

          return response.json();
        },
      }),
      invalidatesTags: (_result, _error, { repairId }) => [{ type: 'Repair', id: repairId }],
    }),
  }),
});

export const {
  useGetRepairsQuery,
  useGetRepairQuery,
  useGetPublicRepairQuery,
  useApprovePublicEstimateMutation,
  useConfirmPublicRepairMutation,
  useCreateRepairMutation,
  useUpdateRepairMutation,
  useUpdateRepairStatusMutation,
  useRegeneratePublicLinkMutation,
  useAddWorkItemMutation,
  useUpdateWorkItemMutation,
  useDeleteWorkItemMutation,
  useAddPartMutation,
  useUpdatePartMutation,
  useDeletePartMutation,
} = repairsApi;
