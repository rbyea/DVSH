import type { RepairCreateFormValues } from './types';
import { formatRuLicensePlateMaskedInput } from '@/shared/lib/vehicle';

export const initialValues: Partial<RepairCreateFormValues> = {
  clientId: '',
  vehicleId: '',
  clientName: '',
  vehicleSearch: '',
  clientPhone: '',
  clientEmail: '',
  carModel: '',
  licensePlate: formatRuLicensePlateMaskedInput(''),
  vin: '',
  chassisNumber: '',
  mileage: undefined,
  status: 'new',
  plannedReadyAt: undefined,
  total: undefined,
  workItems: [],
  orderedParts: [],
  comment: '',
  clientPersonalDataConsent: false,
};

export const quickWorkTemplates = [
  'Диагностика',
  'Замена масла',
  'Замена фильтров',
  'Проверка тормозов',
  'Ремонт подвески',
  'Шиномонтаж',
];
