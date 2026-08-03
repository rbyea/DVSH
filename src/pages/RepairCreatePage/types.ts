import type { RepairCreatePayload } from '@/entities/repair-order';
import type { Dayjs } from 'dayjs';

export type RepairCreateStatus = RepairCreatePayload['status'];

export type RepairCreateFormValues = {
  clientId?: string;
  vehicleId?: string;
  clientName: string;
  clientPhone: string;
  vehicleSearch?: string;
  clientEmail?: string;
  carModel: string;
  licensePlate: string;
  vin: string;
  mileage?: number;
  status: RepairCreateStatus;
  plannedReadyAt?: Dayjs;
  total?: number;
  workItems?: Array<{ title?: string }>;
  orderedParts?: Array<{ name?: string; quantity?: number }>;
  comment?: string;
  clientPersonalDataConsent: boolean;
};
