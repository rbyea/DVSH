import { baseApi } from '@/shared/api';
import type { CreateVehicleDiagnosticRequest, VehicleDiagnostic } from '@/shared/lib/diagnostics';

import type {
  CreateVehicleInspectionRequest,
  UpdateVehicleInspectionRequest,
  VehicleInspectionItem,
} from '../model/inspection';
import type {
  GetVehiclesParams,
  UpdateVehicleRequest,
  VehicleCard,
  VehicleListResponse,
  VehicleModelSuggestion,
  VehicleSearchResult,
} from '../model/types';

type ApiDataResponse<T> = {
  data: T;
};

export const vehiclesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getVehicles: build.query<VehicleListResponse, GetVehiclesParams | void>({
      query: (params) => ({
        url: '/vehicles',
        params: params
          ? {
              search: params.search || undefined,
              page: params.page,
              per_page: params.per_page,
            }
          : undefined,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Vehicle' as const, id })),
              { type: 'Vehicle' as const, id: 'LIST' },
            ]
          : [{ type: 'Vehicle' as const, id: 'LIST' }],
    }),
    searchVehicles: build.query<VehicleSearchResult[], string>({
      query: (q) => ({
        url: '/vehicles/search',
        params: { q },
      }),
      transformResponse: (response: ApiDataResponse<VehicleSearchResult[]>) => response.data,
      providesTags: [{ type: 'Vehicle', id: 'SEARCH' }],
    }),
    adoptSharedVehicle: build.mutation<VehicleCard, { vehicleId: string }>({
      query: ({ vehicleId }) => ({
        url: '/vehicles/adopt',
        method: 'POST',
        body: { vehicle_id: Number(vehicleId) },
      }),
      transformResponse: (response: ApiDataResponse<VehicleCard>) => response.data,
      invalidatesTags: [
        { type: 'Vehicle', id: 'LIST' },
        { type: 'Vehicle', id: 'SEARCH' },
        { type: 'Client', id: 'LIST' },
      ],
    }),
    getVehicleModelSuggestions: build.query<VehicleModelSuggestion[], { q?: string } | void>({
      query: (params) => ({
        url: '/vehicles/model-suggestions',
        params: params?.q ? { q: params.q } : undefined,
      }),
      transformResponse: (response: ApiDataResponse<VehicleModelSuggestion[]>) => response.data,
      providesTags: [{ type: 'Vehicle', id: 'MODELS' }],
    }),
    getVehicle: build.query<VehicleCard, string>({
      query: (id) => `/vehicles/${id}`,
      transformResponse: (response: ApiDataResponse<VehicleCard>) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Vehicle', id }],
    }),
    getVehicleDiagnostics: build.query<VehicleDiagnostic[], string>({
      query: (id) => `/vehicles/${id}/diagnostics`,
      transformResponse: (response: ApiDataResponse<VehicleDiagnostic[]>) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Vehicle', id: `diagnostics-${id}` }],
    }),
    createVehicleDiagnostic: build.mutation<
      VehicleDiagnostic,
      { vehicleId: string; body: CreateVehicleDiagnosticRequest }
    >({
      query: ({ vehicleId, body }) => ({
        url: `/vehicles/${vehicleId}/diagnostics`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiDataResponse<VehicleDiagnostic>) => response.data,
      invalidatesTags: (_result, _error, { vehicleId, body }) => [
        { type: 'Vehicle', id: vehicleId },
        { type: 'Vehicle', id: `diagnostics-${vehicleId}` },
        { type: 'Vehicle', id: 'SEARCH' },
        { type: 'Vehicle', id: 'LIST' },
        ...(body.repair_id
          ? [
              { type: 'Repair' as const, id: String(body.repair_id) },
              { type: 'Repair' as const, id: 'LIST' },
            ]
          : []),
        { type: 'PublicRepair' },
      ],
    }),
    deleteVehicleDiagnostic: build.mutation<
      void,
      { vehicleId: string; diagnosticId: string; repairId?: string }
    >({
      query: ({ vehicleId, diagnosticId }) => ({
        url: `/vehicles/${vehicleId}/diagnostics/${diagnosticId}`,
        method: 'DELETE',
        responseHandler: async (response) => {
          if (response.status === 204) {
            return undefined;
          }

          return response.json();
        },
      }),
      invalidatesTags: (_result, _error, { vehicleId, repairId }) => [
        { type: 'Vehicle', id: vehicleId },
        { type: 'Vehicle', id: `diagnostics-${vehicleId}` },
        { type: 'Vehicle', id: 'SEARCH' },
        { type: 'Vehicle', id: 'LIST' },
        ...(repairId
          ? [
              { type: 'Repair' as const, id: repairId },
              { type: 'Repair' as const, id: 'LIST' },
            ]
          : []),
        { type: 'PublicRepair' },
      ],
    }),
    updateVehicle: build.mutation<VehicleCard, { id: string; body: UpdateVehicleRequest }>({
      query: ({ id, body }) => ({
        url: `/vehicles/${id}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: ApiDataResponse<VehicleCard>) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Vehicle', id },
        { type: 'Vehicle', id: 'SEARCH' },
        { type: 'Vehicle', id: 'MODELS' },
        { type: 'Vehicle', id: 'LIST' },
      ],
    }),
    getVehicleInspections: build.query<VehicleInspectionItem[], string>({
      query: (vehicleId) => `/vehicles/${vehicleId}/inspections`,
      transformResponse: (response: ApiDataResponse<VehicleInspectionItem[]>) => response.data,
      providesTags: (_result, _error, vehicleId) => [
        { type: 'Vehicle', id: `inspections-${vehicleId}` },
      ],
    }),
    createVehicleInspectionItem: build.mutation<
      VehicleInspectionItem,
      { vehicleId: string; body: CreateVehicleInspectionRequest }
    >({
      query: ({ vehicleId, body }) => ({
        url: `/vehicles/${vehicleId}/inspections`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiDataResponse<VehicleInspectionItem>) => response.data,
      invalidatesTags: (_result, _error, { vehicleId }) => [
        { type: 'Vehicle', id: vehicleId },
        { type: 'Vehicle', id: `inspections-${vehicleId}` },
        { type: 'PublicRepair' },
      ],
    }),
    updateVehicleInspectionItem: build.mutation<
      VehicleInspectionItem,
      { vehicleId: string; itemId: string; body: UpdateVehicleInspectionRequest }
    >({
      query: ({ vehicleId, itemId, body }) => ({
        url: `/vehicles/${vehicleId}/inspections/${itemId}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: ApiDataResponse<VehicleInspectionItem>) => response.data,
      invalidatesTags: (_result, _error, { vehicleId }) => [
        { type: 'Vehicle', id: `inspections-${vehicleId}` },
      ],
    }),
    deleteVehicleInspectionItem: build.mutation<void, { vehicleId: string; itemId: string }>({
      query: ({ vehicleId, itemId }) => ({
        url: `/vehicles/${vehicleId}/inspections/${itemId}`,
        method: 'DELETE',
        responseHandler: async (response) => {
          if (response.status === 204 || response.status === 200) {
            return undefined;
          }

          return response.json();
        },
      }),
      invalidatesTags: (_result, _error, { vehicleId }) => [
        { type: 'Vehicle', id: `inspections-${vehicleId}` },
      ],
    }),
    markVehicleInspectionsInOrder: build.mutation<
      VehicleInspectionItem[],
      { vehicleId: string; itemIds: string[] }
    >({
      query: ({ vehicleId, itemIds }) => ({
        url: `/vehicles/${vehicleId}/inspections/mark-in-order`,
        method: 'POST',
        body: { item_ids: itemIds },
      }),
      transformResponse: (response: ApiDataResponse<VehicleInspectionItem[]>) => response.data,
      invalidatesTags: (_result, _error, { vehicleId }) => [
        { type: 'Vehicle', id: `inspections-${vehicleId}` },
      ],
    }),
  }),
});

export const {
  useGetVehiclesQuery,
  useGetVehicleQuery,
  useLazyGetVehicleQuery,
  useLazySearchVehiclesQuery,
  useAdoptSharedVehicleMutation,
  useGetVehicleModelSuggestionsQuery,
  useCreateVehicleDiagnosticMutation,
  useDeleteVehicleDiagnosticMutation,
  useGetVehicleDiagnosticsQuery,
  useUpdateVehicleMutation,
  useGetVehicleInspectionsQuery,
  useCreateVehicleInspectionItemMutation,
  useUpdateVehicleInspectionItemMutation,
  useDeleteVehicleInspectionItemMutation,
  useMarkVehicleInspectionsInOrderMutation,
} = vehiclesApi;
