import type { RepairStatus } from './DashboardPageTypes';

export const statusLabels: Record<RepairStatus, string> = {
  new: 'Новый',
  diagnostics: 'Диагностика',
  inProgress: 'В работе',
  waitingParts: 'Ждём запчасти',
  done: 'Готово',
};

export const statusColors: Record<RepairStatus, string> = {
  new: 'blue',
  diagnostics: 'purple',
  inProgress: 'processing',
  waitingParts: 'warning',
  done: 'success',
};
