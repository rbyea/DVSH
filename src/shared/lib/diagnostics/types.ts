export type DiagnosticFault = {
  system: string;
  code: string | null;
  description: string | null;
  status: string | null;
  hasFault: boolean;
};

export type DiagnosticScan = {
  id?: string;
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

export type VehicleDiagnosticFault = {
  system: string;
  code: string | null;
  description: string | null;
  status: string | null;
  has_fault: boolean;
};

export type VehicleDiagnostic = {
  id: string;
  vehicle_id: string;
  repair_id?: string | null;
  vin: string;
  make?: string | null;
  model?: string | null;
  year?: string | null;
  serial?: string | null;
  repair_type?: string | null;
  scanned_at?: string | null;
  shop_name?: string | null;
  file_name?: string | null;
  faults: VehicleDiagnosticFault[];
  created_at?: string;
};

export type CreateVehicleDiagnosticRequest = {
  repair_id?: string | number | null;
  vin: string;
  make?: string | null;
  model?: string | null;
  year?: string | null;
  serial?: string | null;
  repair_type?: string | null;
  scanned_at?: string | null;
  shop_name?: string | null;
  file_name?: string | null;
  faults: VehicleDiagnosticFault[];
};

export type DiagnosticVinMatch = 'match' | 'mismatch' | 'vehicle-empty' | 'scan-empty';
