export type VehicleHistoryStatus =
  'new' | 'pending_approval' | 'revision' | 'in_progress' | 'waiting_parts' | 'done' | 'completed';

export type VehicleRepairHistory = {
  id: string;
  order_number: string;
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
  status: VehicleHistoryStatus;
  updated_at: string;
  total: number;
  mileage?: number | null;
  title?: string;
  work_items?: Array<{ title: string; is_done?: boolean }>;
};

export type VehicleCard = {
  id: string;
  client: VehicleClient;
  car_model: string;
  license_plate: string;
  vin?: string | null;
  chassis_number?: string | null;
  mileage?: number | null;
  last_completed_mileage?: number | null;
  repairs: VehicleRepairSummary[];
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
