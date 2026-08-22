export type DiagnosticFault = {
  system: string;
  code: string | null;
  description: string | null;
  status: string | null;
  hasFault: boolean;
};

export type DiagnosticScan = {
  make: string | null;
  model: string | null;
  year: string | null;
  vin: string | null;
  serial: string | null;
  repairType: string | null;
  scannedAt: string | null;
  shopName: string | null;
  faults: DiagnosticFault[];
  fileName: string;
};

export type DiagnosticVinMatch = 'match' | 'mismatch' | 'vehicle-empty' | 'scan-empty';
