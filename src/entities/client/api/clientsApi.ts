import { baseApi } from '@/shared/api';

import type {
  Client,
  IntakeClientWithVehicleRequest,
  IntakeResponse,
  UpdateClientRequest,
} from '../model/types';

type ApiDataResponse<T> = {
  data: T;
};

export const clientsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    createClientWithVehicle: build.mutation<IntakeResponse, IntakeClientWithVehicleRequest>({
      query: (body) => ({
        url: '/intake/clients-with-vehicle',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiDataResponse<IntakeResponse>) => response.data,
      invalidatesTags: [
        { type: 'Client', id: 'LIST' },
        { type: 'Vehicle', id: 'SEARCH' },
      ],
    }),
    updateClient: build.mutation<Client, { id: string; body: UpdateClientRequest }>({
      query: ({ id, body }) => ({
        url: `/clients/${id}`,
        method: 'PUT',
        body,
      }),
      transformResponse: (response: ApiDataResponse<Client>) => response.data,
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Client', id }],
    }),
  }),
});

export const { useCreateClientWithVehicleMutation, useUpdateClientMutation } = clientsApi;
