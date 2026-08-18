export type Client = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
};

export type ClientVehicleSummary = {
  id: string;
  car_model: string;
  license_plate: string;
  vin?: string | null;
  chassis_number?: string | null;
  mileage?: number | null;
};

/** GET /clients/{id} — client card with vehicles. */
export type ClientCard = Client & {
  vehicles: ClientVehicleSummary[];
};

export type UpdateClientRequest = {
  name?: string;
  phone?: string | null;
  email?: string | null;
};

export type CreateVehicleForClientRequest = {
  client_id: string | number;
  /** Совместимость со старым POST /vehicles; при наличии client_id нового клиента не создавать */
  client_name?: string;
  client_phone?: string | null;
  client_email?: string | null;
  car_model: string;
  license_plate: string;
  vin?: string | null;
  chassis_number?: string | null;
  mileage?: number | null;
};

export type IntakeClientWithVehicleRequest = {
  client_name: string;
  client_phone?: string | null;
  client_email?: string | null;
  car_model: string;
  license_plate: string;
  vin?: string | null;
  chassis_number?: string | null;
  mileage?: number | null;
};

export type IntakeVehicle = {
  id: string;
  client_id: string;
  car_model: string;
  license_plate: string;
  vin?: string | null;
  chassis_number?: string | null;
  mileage?: number | null;
};

export type IntakeResponse = {
  client: Client;
  vehicle: IntakeVehicle;
};
