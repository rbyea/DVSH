import { formatVinInput } from '@/shared/lib/vehicle';

import type { DiagnosticVinMatch } from './types';

export function normalizeDiagnosticVin(value: string | null | undefined): string {
  return formatVinInput(value ?? '');
}

export function matchDiagnosticVin(
  scanVin: string | null | undefined,
  vehicleVin: string | null | undefined,
): DiagnosticVinMatch {
  const scan = normalizeDiagnosticVin(scanVin);
  const vehicle = normalizeDiagnosticVin(vehicleVin);

  if (!scan) {
    return 'scan-empty';
  }

  if (!vehicle) {
    return 'vehicle-empty';
  }

  return scan === vehicle ? 'match' : 'mismatch';
}
