export {
  clientsApi,
  useCreateClientWithVehicleMutation,
  useCreateVehicleForClientMutation,
  useGetClientQuery,
  useUpdateClientMutation,
} from './api/clientsApi';
export type {
  Client,
  ClientCard,
  ClientVehicleSummary,
  CreateVehicleForClientRequest,
  IntakeClientWithVehicleRequest,
  IntakeResponse,
  IntakeVehicle,
  UpdateClientRequest,
} from './model/types';
export { mergeVehicleLists } from './model/normalize';
export { buildCreateVehicleRequest } from './model/createRequest';
