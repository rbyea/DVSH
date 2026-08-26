import { baseApi } from '@/shared/api';
import type { CreateVehicleDiagnosticRequest, VehicleDiagnostic } from '@/shared/lib/diagnostics';

import type {
  UpdateVehicleRequest,
  VehicleCard,
  VehicleModelSuggestion,
  VehicleSearchResult,
} from '../model/types';

type ApiDataResponse<T> = {
  data: T;
};

export const vehiclesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    searchVehicles: build.query<VehicleSearchResult[], string>({
      query: (q) => ({
        url: '/vehicles/search',
        params: { q },
      }),
      transformResponse: (response: ApiDataResponse<VehicleSearchResult[]>) => response.data,
      providesTags: [{ type: 'Vehicle', id: 'SEARCH' }],
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
      ],
    }),
  }),
});

export const {
  useGetVehicleQuery,
  useLazyGetVehicleQuery,
  useLazySearchVehiclesQuery,
  useGetVehicleModelSuggestionsQuery,
  useCreateVehicleDiagnosticMutation,
  useDeleteVehicleDiagnosticMutation,
  useGetVehicleDiagnosticsQuery,
  useUpdateVehicleMutation,
} = vehiclesApi;
