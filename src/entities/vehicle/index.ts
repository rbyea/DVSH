export {
  useCreateVehicleDiagnosticMutation,
  useDeleteVehicleDiagnosticMutation,
  useGetVehicleDiagnosticsQuery,
  useGetVehiclesQuery,
  useGetVehicleQuery,
  useGetVehicleModelSuggestionsQuery,
  useLazyGetVehicleQuery,
  useLazySearchVehiclesQuery,
  useSearchVehiclesQuery,
  useAdoptSharedVehicleMutation,
  useUpdateVehicleMutation,
  useGetVehicleInspectionsQuery,
  useCreateVehicleInspectionItemMutation,
  useUpdateVehicleInspectionItemMutation,
  useDeleteVehicleInspectionItemMutation,
  useMarkVehicleInspectionsInOrderMutation,
  useGetVehicleMaintenanceQuery,
  useCreateVehicleMaintenanceItemMutation,
  useUpdateVehicleMaintenanceItemMutation,
  useDeleteVehicleMaintenanceItemMutation,
  vehiclesApi,
} from './api/vehiclesApi';
export type {
  CreateVehicleDiagnosticRequest,
  GetVehiclesParams,
  UpdateVehicleRequest,
  VehicleCard,
  VehicleDiagnostic,
  VehicleDiagnosticFault,
  VehicleClient,
  VehicleHistoryStatus,
  VehicleListItem,
  VehicleListRepair,
  VehicleListResponse,
  VehicleRepairHistory,
  VehicleRepairSummary,
  VehicleSearchResult,
  VehicleSuggestion,
  VehicleModelSuggestion,
} from './model/types';
export type {
  CreateVehicleInspectionRequest,
  InspectionAction,
  InspectionItemStatus,
  InspectionUrgency,
  UpdateVehicleInspectionRequest,
  VehicleInspectionItem,
} from './model/inspection';
export {
  buildInspectionWorkTitle,
  inspectionActionLabels,
  inspectionStatusLabels,
  inspectionUrgencyLabels,
} from './model/inspection';
export {
  buildMaintenancePlan,
  formatMaintenanceAttention,
  formatMaintenanceRowHint,
  formatMaintenanceStopLabel,
  maintenanceTitleSuggestions,
  nextDueFromCurrent,
} from './model/maintenance';
export type {
  CreateVehicleMaintenanceRequest,
  MaintenancePlan,
  MaintenancePlanSource,
  MaintenanceRow,
  MaintenanceStatus,
  UpdateVehicleMaintenanceRequest,
  VehicleMaintenanceItem,
} from './model/maintenance';
export { CarModelAutoComplete } from './ui/CarModelAutoComplete';
export { MaintenanceScheduleChart } from './ui/MaintenanceScheduleChart';
