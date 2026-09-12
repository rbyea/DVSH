export type ImportClientRow = {
  source_row: number;
  client_name: string;
  client_phone?: string;
  client_email?: string;
  car_model?: string;
  license_plate?: string;
  vin?: string;
  chassis_number?: string;
  mileage?: number;
};

export type ImportClientPreviewRow = ImportClientRow & {
  issue?: string;
};

export type ImportClientsResult = {
  created_clients: number;
  created_vehicles: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
};

export type ParseClientsWorkbookResult = {
  rows: ImportClientPreviewRow[];
  fileName: string;
};
