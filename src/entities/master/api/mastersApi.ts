import { baseApi } from '@/shared/api';

import type {
  CreateMasterRequest,
  Master,
  StationInfo,
  UpdateMasterRequest,
  UpdateStationRequest,
} from '../model/types';

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
      invalidatesTags: [{ type: 'Station', id: 'CURRENT' }],
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
  }),
});

export const {
  useGetStationQuery,
  useUpdateStationMutation,
  useGetMastersQuery,
  useCreateMasterMutation,
  useUpdateMasterMutation,
  useDeleteMasterMutation,
} = mastersApi;
