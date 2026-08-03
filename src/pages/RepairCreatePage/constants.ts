import type { RepairCreateFormValues, RepairCreateStatus } from './types';

export const statusOptions: Array<{ label: string; value: RepairCreateStatus }> = [
  { label: 'Новый', value: 'new' },
  { label: 'Диагностика', value: 'diagnostics' },
  { label: 'В работе', value: 'in_progress' },
  { label: 'Ждём запчасти', value: 'waiting_parts' },
];

export const initialValues: Partial<RepairCreateFormValues> = {
  clientId: '',
  vehicleId: '',
  clientName: '',
  vehicleSearch: '',
  clientPhone: '',
  clientEmail: '',
  carModel: '',
  licensePlate: '',
  vin: '',
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
