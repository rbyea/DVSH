export type Client = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
};

export type UpdateClientRequest = {
  name?: string;
  phone?: string | null;
  email?: string | null;
};

export type IntakeClientWithVehicleRequest = {
  client_name: string;
  client_phone?: string | null;
  client_email?: string | null;
  car_model: string;
  license_plate: string;
  vin: string;
  mileage?: number | null;
};

export type IntakeVehicle = {
  id: string;
  client_id: string;
  car_model: string;
  license_plate: string;
  vin: string;
  mileage?: number | null;
};

export type IntakeResponse = {
  client: Client;
  vehicle: IntakeVehicle;
};
