import { baseApi } from '@/shared/api';

import type {
  ApprovePublicEstimateRequest,
  CreatePartRequest,
  CreateWorkItemRequest,
  GetRepairsParams,
  PublicLinkResponse,
  PublicRepair,
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
      transformResponse: (response: ApiDataResponse<RepairDetail>) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Repair', id }],
    }),
    getPublicRepair: build.query<PublicRepair, string>({
      query: (publicToken) => `/public/repairs/${publicToken}`,
      transformResponse: (response: ApiDataResponse<PublicRepair>) => response.data,
      providesTags: (_result, _error, publicToken) => [{ type: 'PublicRepair', id: publicToken }],
    }),
    approvePublicEstimate: build.mutation<
      PublicRepair,
      { publicToken: string; body: ApprovePublicEstimateRequest }
    >({
      query: ({ publicToken, body }) => ({
        url: `/public/repairs/${publicToken}/estimate`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiDataResponse<PublicRepair>) => response.data,
      invalidatesTags: (_result, _error, { publicToken }) => [
        { type: 'PublicRepair', id: publicToken },
        { type: 'Repair', id: 'LIST' },
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
      transformResponse: (response: ApiDataResponse<RepairDetail>) => response.data,
      invalidatesTags: (_result, _error, { repairId }) => [
        { type: 'Repair', id: repairId },
        { type: 'Repair', id: 'LIST' },
      ],
    }),
    updateRepairStatus: build.mutation<RepairDetail, { repairId: string; status: RepairStatus }>({
      query: ({ repairId, status }) => ({
        url: `/repairs/${repairId}/status`,
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: (response: ApiDataResponse<RepairDetail>) => response.data,
      invalidatesTags: (_result, _error, { repairId }) => [
        { type: 'Repair', id: repairId },
        { type: 'Repair', id: 'LIST' },
      ],
    }),
    regeneratePublicLink: build.mutation<PublicLinkResponse, string>({
      query: (repairId) => ({
        url: `/repairs/${repairId}/public-link`,
        method: 'POST',
      }),
      transformResponse: (response: ApiDataResponse<PublicLinkResponse>) => response.data,
      invalidatesTags: (_result, _error, repairId) => [{ type: 'Repair', id: repairId }],
    }),
    addWorkItem: build.mutation<RepairWorkItem, { repairId: string; body: CreateWorkItemRequest }>({
      query: ({ repairId, body }) => ({
        url: `/repairs/${repairId}/work-items`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiDataResponse<RepairWorkItem>) => response.data,
      invalidatesTags: (_result, _error, { repairId }) => [{ type: 'Repair', id: repairId }],
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
