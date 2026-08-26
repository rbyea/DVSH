import type {
  CreateVehicleDiagnosticRequest,
  DiagnosticScan,
  VehicleDiagnostic,
  VehicleDiagnosticFault,
} from './types';

function asText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function diagnosticScanFromApi(item: VehicleDiagnostic): DiagnosticScan {
  return {
    id: String(item.id),
    make: asText(item.make),
    model: asText(item.model),
    year: asText(item.year),
    vin: asText(item.vin),
    serial: asText(item.serial),
    repairType: asText(item.repair_type),
    scannedAt: asText(item.scanned_at),
    shopName: asText(item.shop_name),
    fileName: asText(item.file_name) ?? '',
    faults: (item.faults ?? []).map((fault) => {
      const raw = fault as VehicleDiagnosticFault & { hasFault?: boolean };

      return {
        system: fault.system,
        code: fault.code,
        description: fault.description,
        status: fault.status,
        hasFault: Boolean(raw.has_fault ?? raw.hasFault),
      };
    }),
  };
}

export function pickLatestDiagnostic(source: {
  latest_diagnostic?: VehicleDiagnostic | null;
  diagnostic?: VehicleDiagnostic | null;
}): VehicleDiagnostic | null {
  return source.latest_diagnostic ?? source.diagnostic ?? null;
}

export function diagnosticScanToApiPayload(
  scan: DiagnosticScan,
  repairId?: string,
): CreateVehicleDiagnosticRequest {
  return {
    repair_id: repairId || null,
    vin: scan.vin ?? '',
    make: scan.make,
    model: scan.model,
    year: scan.year,
    serial: scan.serial,
    repair_type: scan.repairType,
    scanned_at: scan.scannedAt,
    shop_name: scan.shopName,
    file_name: scan.fileName || null,
    faults: scan.faults.map((fault) => ({
      system: fault.system,
      code: fault.code,
      description: fault.description,
      status: fault.status,
      has_fault: fault.hasFault,
    })),
  };
}
