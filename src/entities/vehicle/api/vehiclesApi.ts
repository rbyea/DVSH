import { baseApi } from '@/shared/api';

import type { UpdateVehicleRequest, VehicleCard, VehicleSearchResult } from '../model/types';

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
    getVehicle: build.query<VehicleCard, string>({
      query: (id) => `/vehicles/${id}`,
      transformResponse: (response: ApiDataResponse<VehicleCard>) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Vehicle', id }],
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
      ],
    }),
  }),
});

export const {
  useGetVehicleQuery,
  useLazyGetVehicleQuery,
  useLazySearchVehiclesQuery,
  useUpdateVehicleMutation,
} = vehiclesApi;
