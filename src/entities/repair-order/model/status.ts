import type { ClientConfirmStatus, EstimateStatus, RepairStatus } from './types';

export const repairStatusLabels: Record<RepairStatus, string> = {
  new: 'Новый',
  pending_approval: 'На согласовании',
  revision: 'Изменение работ',
  in_progress: 'В работе',
  waiting_parts: 'Ждём запчасти',
  done: 'Готово',
  completed: 'Выдан',
};

export const repairStatusColors: Record<RepairStatus, string> = {
  new: 'blue',
  pending_approval: 'orange',
  revision: 'purple',
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

/** Labels on the public client card — first person, not staff wording. */
export const publicClientConfirmStatusLabels: Record<ClientConfirmStatus, string> = {
  pending: 'Проверьте данные',
  confirmed: 'Данные подтверждены',
  disputed: 'Сервис проверяет',
};

export const publicClientConfirmStatusColors: Record<ClientConfirmStatus, string> = {
  pending: 'warning',
  confirmed: 'success',
  disputed: 'processing',
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

type PublicEstimateSource = {
  status: RepairStatus;
  estimate_status?: EstimateStatus | null;
};

/** Client must approve works whenever the order is waiting on them. */
export function needsPublicEstimateDecision(repair: PublicEstimateSource): boolean {
  if (repair.estimate_status === 'approved' || repair.estimate_status === 'declined') {
    return false;
  }

  return repair.estimate_status === 'pending' || repair.status === 'pending_approval';
}

/** After the client answers, leave «На согласовании»: approve → work, decline → revise list. */
export function resolveStatusAfterEstimate(
  status: RepairStatus,
  estimateStatus?: EstimateStatus | null,
): RepairStatus {
  if (status !== 'pending_approval') {
    return status;
  }

  if (estimateStatus === 'approved') {
    return 'in_progress';
  }

  if (estimateStatus === 'declined') {
    return 'revision';
  }

  return status;
}
