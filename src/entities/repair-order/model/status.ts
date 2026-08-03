import type { EstimateStatus, RepairStatus } from './types';

export const repairStatusLabels: Record<RepairStatus, string> = {
  new: 'Новый',
  diagnostics: 'Диагностика',
  in_progress: 'В работе',
  waiting_parts: 'Ждём запчасти',
  done: 'Готово',
};

export const repairStatusColors: Record<RepairStatus, string> = {
  new: 'blue',
  diagnostics: 'purple',
  in_progress: 'processing',
  waiting_parts: 'warning',
  done: 'success',
};

export const estimateStatusLabels: Record<EstimateStatus, string> = {
  pending: 'Ждёт согласования',
  approved: 'Согласовано клиентом',
  declined: 'Клиент отклонил',
};

export const estimateStatusColors: Record<EstimateStatus, string> = {
  pending: 'warning',
  approved: 'success',
  declined: 'error',
};
