export type RepairStatus = 'new' | 'diagnostics' | 'inProgress' | 'waitingParts' | 'done';

export type RepairRow = {
  id: string;
  orderNumber: string;
  clientName: string;
  car: string;
  status: RepairStatus;
  updatedAt: string;
  total: string;
};

export type RepairCreatePayload = {
  vehicleId?: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  carModel: string;
  licensePlate: string;
  vin: string;
  mileage?: number;
  status: Exclude<RepairStatus, 'done'>;
  plannedReadyAt?: string;
  workItems: Array<{ title: string }>;
  orderedParts: Array<{ name: string; quantity: number }>;
  comment?: string;
};
