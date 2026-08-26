export { diagnosticScanFromApi, diagnosticScanToApiPayload, pickLatestDiagnostic } from './mapApi';
export { parseScannerCsv } from './parseScannerCsv';
export { matchDiagnosticVin, normalizeDiagnosticVin } from './vinMatch';
export type {
  CreateVehicleDiagnosticRequest,
  DiagnosticFault,
  DiagnosticScan,
  DiagnosticVinMatch,
  VehicleDiagnostic,
  VehicleDiagnosticFault,
} from './types';
