import type { ClientConfirmStatus, EstimateStatus, RepairStatus } from './types';

export const repairStatusLabels: Record<RepairStatus, string> = {
  new: 'Новый',
  pending_approval: 'На согласовании',
  in_progress: 'В работе',
  waiting_parts: 'Ждём запчасти',
  done: 'Готово',
  completed: 'Выдан',
};

export const repairStatusColors: Record<RepairStatus, string> = {
  new: 'blue',
  pending_approval: 'orange',
  in_progress: 'processing',
  waiting_parts: 'warning',
  done: 'success',
  completed: 'default',
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

export const clientConfirmStatusLabels: Record<ClientConfirmStatus, string> = {
  pending: 'Ждёт подтверждения клиента',
  confirmed: 'Подтверждено клиентом',
  disputed: 'Клиент сообщил об ошибке',
};

export const clientConfirmStatusColors: Record<ClientConfirmStatus, string> = {
  pending: 'warning',
  confirmed: 'success',
  disputed: 'error',
};

type RepairLockSource = {
  status: RepairStatus;
  client_confirm_status?: ClientConfirmStatus | null;
};

/**
 * Staff read-only after «Выдан», except when client disputed
 * (STO may fix and re-send for confirmation).
 */
export function isRepairLocked(repair: RepairLockSource | RepairStatus): boolean {
  if (typeof repair === 'string') {
    return repair === 'completed';
  }

  if (repair.status !== 'completed') {
    return false;
  }

  return repair.client_confirm_status !== 'disputed';
}

/** True after client confirmed handover — never editable again. */
export function isRepairPermanentlyLocked(repair: RepairLockSource): boolean {
  return repair.client_confirm_status === 'confirmed';
}

export function needsClientConfirm(repair: RepairLockSource): boolean {
  return repair.status === 'completed' && repair.client_confirm_status === 'pending';
}
