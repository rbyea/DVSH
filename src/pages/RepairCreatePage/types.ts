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
  chassisNumber: string;
  /** Required on submit; empty until filled in the form. */
  mileage: number | undefined;
  status: RepairCreateStatus;
  plannedReadyAt?: Dayjs | null;
  total?: number;
  workItems?: Array<{
    title?: string;
    masterId?: string;
    price?: number;
    hours?: number;
    isExtra?: boolean;
  }>;
  orderedParts?: Array<{ name?: string; quantity?: number; price?: number }>;
  comment?: string;
  clientPersonalDataConsent: boolean;
};
