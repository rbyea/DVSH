import type { ClientCard, ClientVehicleSummary, IntakeVehicle } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Unwrap Laravel `{ data: T }` / `{ data, meta }` without treating domain objects as wrappers. */
function unwrapData(value: unknown): unknown {
  if (!isRecord(value) || !('data' in value)) {
    return value;
  }

  const keys = Object.keys(value);
  const isWrapper = keys.every(
    (key) => key === 'data' || key === 'meta' || key === 'links' || key === 'message',
  );

  return isWrapper ? value.data : value;
}

function parseOptionalNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

export function normalizeVehicleSummary(value: unknown): ClientVehicleSummary | null {
  const record = unwrapData(value);

  if (!isRecord(record) || record.id == null) {
    return null;
  }

  return {
    id: String(record.id),
    car_model: readString(record.car_model || record.model),
    license_plate: readString(record.license_plate || record.plate),
    vin: typeof record.vin === 'string' ? record.vin : null,
    chassis_number: typeof record.chassis_number === 'string' ? record.chassis_number : null,
    mileage: parseOptionalNumber(record.mileage),
  };
}

export function normalizeVehicleList(value: unknown): ClientVehicleSummary[] {
  const unwrapped = unwrapData(value);

  if (Array.isArray(unwrapped)) {
    return unwrapped
      .map(normalizeVehicleSummary)
      .filter((item): item is ClientVehicleSummary => item !== null);
  }

  const single = normalizeVehicleSummary(unwrapped);

  if (single) {
    return [single];
  }

  if (!isRecord(unwrapped)) {
    return [];
  }

  return Object.values(unwrapped)
    .map(normalizeVehicleSummary)
    .filter((item): item is ClientVehicleSummary => item !== null);
}

export function normalizeClientCard(response: unknown): ClientCard {
  const data = unwrapData(response);
  const record = isRecord(data) ? data : {};
  const vehicles = normalizeVehicleList(record.vehicles);

  return {
    id: String(record.id ?? ''),
    name: readString(record.name),
    phone: typeof record.phone === 'string' ? record.phone : null,
    email: typeof record.email === 'string' ? record.email : null,
    vehicles: vehicles.length > 0 ? vehicles : normalizeVehicleList(record.vehicle),
  };
}

export function normalizeCreatedVehicle(response: unknown): IntakeVehicle {
  const data = unwrapData(response);
  const record = isRecord(data) ? data : {};
  const vehicleValue = 'vehicle' in record ? unwrapData(record.vehicle) : data;
  const vehicle = isRecord(vehicleValue) ? vehicleValue : record;
  const summary = normalizeVehicleSummary(vehicle);

  return {
    id: summary?.id ?? (vehicle.id == null ? '' : String(vehicle.id)),
    client_id: String(vehicle.client_id ?? record.client_id ?? ''),
    car_model: summary?.car_model ?? '',
    license_plate: summary?.license_plate ?? '',
    vin: summary?.vin,
    chassis_number: summary?.chassis_number,
    mileage: summary?.mileage,
  };
}

export function toVehicleSummary(vehicle: IntakeVehicle): ClientVehicleSummary {
  return {
    id: String(vehicle.id),
    car_model: vehicle.car_model,
    license_plate: vehicle.license_plate,
    vin: vehicle.vin,
    chassis_number: vehicle.chassis_number,
    mileage: vehicle.mileage,
  };
}

export function mergeVehicleLists(
  ...lists: Array<ClientVehicleSummary[] | undefined>
): ClientVehicleSummary[] {
  const merged = new Map<string, ClientVehicleSummary>();

  for (const list of lists) {
    for (const item of list ?? []) {
      if (!item.id) {
        continue;
      }

      merged.set(String(item.id), { ...item, id: String(item.id) });
    }
  }

  return [...merged.values()];
}
