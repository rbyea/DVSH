export {
  clientsApi,
  useCreateClientWithVehicleMutation,
  useCreateVehicleForClientMutation,
  useDeleteClientMutation,
  useGetClientQuery,
  useImportClientsMutation,
  useUpdateClientMutation,
} from './api/clientsApi';
export type {
  Client,
  ClientCard,
  ClientVehicleSummary,
  CreateVehicleForClientRequest,
  ImportClientRowRequest,
  ImportClientsResult,
  IntakeClientWithVehicleRequest,
  IntakeResponse,
  IntakeVehicle,
  UpdateClientRequest,
} from './model/types';
export { mergeVehicleLists } from './model/normalize';
export { buildCreateVehicleRequest } from './model/createRequest';
