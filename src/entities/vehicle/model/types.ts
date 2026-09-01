import type { VehicleDiagnostic } from '@/shared/lib/diagnostics';

export type {
  CreateVehicleDiagnosticRequest,
  VehicleDiagnostic,
  VehicleDiagnosticFault,
} from '@/shared/lib/diagnostics';

export type VehicleHistoryStatus =
  'new' | 'pending_approval' | 'revision' | 'in_progress' | 'waiting_parts' | 'done' | 'completed';

export type VehicleRepairHistory = {
  id: string;
  order_number: string;
  is_own_station?: boolean;
  /** Fallback single line when work_items are missing. */
  title?: string;
  status: VehicleHistoryStatus;
  completed_at: string | null;
  updated_at?: string | null;
  mileage?: number | null;
  total?: number | null;
  work_items?: Array<{ title: string; is_done?: boolean }>;
};

export type VehicleSearchResult = {
  id: string;
  is_own_station?: boolean;
  client_name: string;
  client_phone?: string | null;
  client_email?: string | null;
  car_model: string;
  license_plate: string;
  vin?: string | null;
  chassis_number?: string | null;
  mileage?: number | null;
  /** Max mileage from issued (completed) repairs — floor for new orders. */
  last_completed_mileage?: number | null;
  previous_repairs: VehicleRepairHistory[];
};

export type VehicleClient = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
};

export type VehicleRepairSummary = {
  id: string;
  order_number: string;
  is_own_station?: boolean;
  status: VehicleHistoryStatus;
  updated_at: string;
  total: number;
  mileage?: number | null;
  title?: string;
  work_items?: Array<{ title: string; is_done?: boolean }>;
};

export type VehicleCard = {
  id: string;
  public_token?: string | null;
  client: VehicleClient;
  car_model: string;
  license_plate: string;
  vin?: string | null;
  chassis_number?: string | null;
  mileage?: number | null;
  last_completed_mileage?: number | null;
  repairs: VehicleRepairSummary[];
  latest_diagnostic?: VehicleDiagnostic | null;
};

export type VehicleListRepair = {
  id: string;
  order_number: string;
  status: VehicleHistoryStatus;
  updated_at: string;
};

export type VehicleListItem = {
  id: string;
  client_name: string;
  car_model: string;
  license_plate: string;
  vin?: string | null;
  chassis_number?: string | null;
  mileage?: number | null;
  repairs_count: number;
  last_repair: VehicleListRepair | null;
};

export type VehicleListResponse = {
  data: VehicleListItem[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
};

export type GetVehiclesParams = {
  search?: string;
  page?: number;
  per_page?: number;
};

export type VehicleModelSuggestion = {
  car_model: string;
};

export type UpdateVehicleRequest = {
  car_model?: string;
  license_plate?: string;
  vin?: string | null;
  chassis_number?: string | null;
  mileage?: number | null;
};

/** @deprecated Use VehicleSearchResult */
export type VehicleSuggestion = VehicleSearchResult;
