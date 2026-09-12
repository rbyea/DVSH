import type { CreateVehicleForClientRequest } from './types';

export function resolveClientId(clientId: string): string | number {
  const numericClientId = Number(clientId);

  if (Number.isFinite(numericClientId) && String(numericClientId) === clientId.trim()) {
    return numericClientId;
  }

  return clientId;
}

export function buildCreateVehicleRequest(input: {
  clientId: string;
  clientName?: string;
  clientPhone?: string | null;
  clientEmail?: string | null;
  carModel: string;
  licensePlate: string;
  vin?: string | null;
  chassisNumber?: string | null;
  useChassisNumber?: boolean;
  mileage?: number | null;
}): CreateVehicleForClientRequest {
  const body: CreateVehicleForClientRequest = {
    client_id: resolveClientId(input.clientId),
    car_model: input.carModel,
    license_plate: input.licensePlate,
    vin: input.useChassisNumber ? null : input.vin || null,
    chassis_number: input.useChassisNumber ? input.chassisNumber || null : null,
    mileage: input.mileage ?? null,
  };

  const clientName = input.clientName?.trim();

  if (clientName) {
    body.client_name = clientName;
  }

  if (input.clientPhone) {
    body.client_phone = input.clientPhone;
  }

  if (input.clientEmail) {
    body.client_email = input.clientEmail;
  }

  return body;
}
