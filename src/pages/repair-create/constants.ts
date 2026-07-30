import type { RepairCreateFormValues, RepairCreateStatus } from './types';

export const statusOptions: Array<{ label: string; value: RepairCreateStatus }> = [
  { label: 'Новый', value: 'new' },
  { label: 'Диагностика', value: 'diagnostics' },
  { label: 'В работе', value: 'inProgress' },
  { label: 'Ждём запчасти', value: 'waitingParts' },
];

export const initialValues: Partial<RepairCreateFormValues> = {
  status: 'new',
  workItems: [],
  orderedParts: [],
};

export const quickWorkTemplates = [
  'Диагностика',
  'Замена масла',
  'Замена фильтров',
  'Проверка тормозов',
  'Ремонт подвески',
  'Шиномонтаж',
];
