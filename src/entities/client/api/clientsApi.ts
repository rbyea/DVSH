import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

import { baseApi } from '@/shared/api';

import { resolveClientId } from '../model/createRequest';
import {
  mergeVehicleLists,
  normalizeClientCard,
  normalizeCreatedVehicle,
  toVehicleSummary,
} from '../model/normalize';
import type {
  Client,
  ClientCard,
  CreateVehicleForClientRequest,
  IntakeClientWithVehicleRequest,
  IntakeResponse,
  IntakeVehicle,
  UpdateClientRequest,
} from '../model/types';

type ApiDataResponse<T> = {
  data: T;
};

function isHtmlResponse(data: unknown): boolean {
  return typeof data === 'string' && /<!doctype html>|<html/i.test(data);
}

export const clientsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getClient: build.query<ClientCard, string>({
      query: (id) => `/clients/${id}`,
      serializeQueryArgs: ({ queryArgs }) => String(queryArgs),
      transformResponse: (response: unknown) => normalizeClientCard(response),
      providesTags: (_result, _error, id) => [{ type: 'Client', id: String(id) }],
    }),
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
        { type: 'Vehicle', id: 'MODELS' },
      ],
    }),
    updateClient: build.mutation<Client, { id: string; body: UpdateClientRequest }>({
      query: ({ id, body }) => ({
        url: `/clients/${id}`,
        method: 'PUT',
        body,
      }),
      transformResponse: (response: ApiDataResponse<Client>) => response.data,
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Client', id: String(id) }],
    }),
    createVehicleForClient: build.mutation<IntakeVehicle, CreateVehicleForClientRequest>({
      async queryFn(body, _api, _extraOptions, baseQuery) {
        const clientId = resolveClientId(String(body.client_id));
        const nested = await baseQuery({
          url: `/clients/${clientId}/vehicles`,
          method: 'POST',
          body,
        });

        const nestedCreated =
          !nested.error && !isHtmlResponse(nested.data)
            ? normalizeCreatedVehicle(nested.data)
            : null;

        if (nestedCreated?.id) {
          return { data: nestedCreated };
        }

        const nestedStatus =
          nested.error && typeof nested.error === 'object' && 'status' in nested.error
            ? nested.error.status
            : undefined;
        const canFallbackToCollection =
          isHtmlResponse(nested.data) || nestedStatus === 404 || nestedStatus === 405;

        if (nested.error && !canFallbackToCollection) {
          return { error: nested.error as FetchBaseQueryError };
        }

        const created = await baseQuery({
          url: '/vehicles',
          method: 'POST',
          body,
        });

        if (created.error) {
          return { error: created.error as FetchBaseQueryError };
        }

        if (isHtmlResponse(created.data)) {
          return {
            error: {
              status: 502,
              data: { message: 'Сервер не сохранил автомобиль (ответ не JSON).' },
            },
          };
        }

        const vehicle = normalizeCreatedVehicle(created.data);

        if (!vehicle.id) {
          return {
            error: {
              status: 502,
              data: { message: 'Сервер не вернул id автомобиля — запись не сохранена.' },
            },
          };
        }

        return { data: vehicle };
      },
      async onQueryStarted(body, { dispatch, queryFulfilled }) {
        try {
          const { data: created } = await queryFulfilled;
          const clientId = String(body.client_id);
          const summary = toVehicleSummary(created);

          if (!summary.id) {
            return;
          }

          dispatch(
            clientsApi.util.updateQueryData('getClient', clientId, (draft) => {
              draft.vehicles = mergeVehicleLists(draft.vehicles, [summary]);
            }),
          );
        } catch {
          // 422 / network — cache stays as is
        }
      },
      invalidatesTags: (_result, _error, { client_id }) => [
        { type: 'Client', id: String(client_id) },
        { type: 'Vehicle', id: 'SEARCH' },
        { type: 'Vehicle', id: 'MODELS' },
      ],
    }),
  }),
});

export const {
  useGetClientQuery,
  useCreateClientWithVehicleMutation,
  useUpdateClientMutation,
  useCreateVehicleForClientMutation,
} = clientsApi;
