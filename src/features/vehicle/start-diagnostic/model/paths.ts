export const INSPECTION_HASH = 'inspection';

export function getDiagnosticVehiclePath(vehicleId: string): string {
  return `/vehicles/${vehicleId}#${INSPECTION_HASH}`;
}
