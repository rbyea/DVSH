export type VehicleHistoryStatus =
  'new' | 'diagnostics' | 'in_progress' | 'waiting_parts' | 'done' | 'completed';

export type VehicleRepairHistory = {
  id: string;
  order_number: string;
  title: string;
  status: VehicleHistoryStatus;
  completed_at: string | null;
};

export type VehicleSearchResult = {
  id: string;
  client_name: string;
  client_phone?: string | null;
  client_email?: string | null;
  car_model: string;
  license_plate: string;
  vin: string;
  mileage?: number | null;
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
};

export type VehicleCard = {
  id: string;
  client: VehicleClient;
  car_model: string;
  license_plate: string;
  vin: string;
  mileage?: number | null;
  repairs: VehicleRepairSummary[];
};

export type UpdateVehicleRequest = {
  car_model?: string;
  license_plate?: string;
  vin?: string;
  mileage?: number | null;
};

/** @deprecated Use VehicleSearchResult */
export type VehicleSuggestion = VehicleSearchResult;
