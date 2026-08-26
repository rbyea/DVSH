export {
  useCreateVehicleDiagnosticMutation,
  useDeleteVehicleDiagnosticMutation,
  useGetVehicleDiagnosticsQuery,
  useGetVehicleQuery,
  useGetVehicleModelSuggestionsQuery,
  useLazyGetVehicleQuery,
  useLazySearchVehiclesQuery,
  useUpdateVehicleMutation,
  vehiclesApi,
} from './api/vehiclesApi';
export type {
  CreateVehicleDiagnosticRequest,
  UpdateVehicleRequest,
  VehicleCard,
  VehicleDiagnostic,
  VehicleDiagnosticFault,
  VehicleClient,
  VehicleHistoryStatus,
  VehicleRepairHistory,
  VehicleRepairSummary,
  VehicleSearchResult,
  VehicleSuggestion,
  VehicleModelSuggestion,
} from './model/types';
export { CarModelAutoComplete } from './ui/CarModelAutoComplete';
