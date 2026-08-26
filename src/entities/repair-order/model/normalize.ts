import { pickLatestDiagnostic } from '@/shared/lib/diagnostics';
import { parseMoney } from '@/shared/lib/money';

import type { PublicVehicle, RepairDetail, RepairPart, RepairWorkItem } from './types';

type RepairDetailPayload = RepairDetail & {
  parts?: RepairPart[] | null;
};

function normalizeWorkItem(item: RepairWorkItem): RepairWorkItem {
  return {
    ...item,
    price: parseMoney(item.price),
    hours: parseMoney(item.hours),
  };
}

function normalizePart(part: RepairPart): RepairPart {
  return {
    ...part,
    price: parseMoney(part.price),
    quantity: parseMoney(part.quantity) ?? part.quantity,
  };
}

export function normalizeRepairDetail(data: RepairDetailPayload): RepairDetail {
  const parts = data.ordered_parts ?? data.parts ?? [];

  return {
    ...data,
    total: parseMoney(data.total),
    work_items: (data.work_items ?? []).map(normalizeWorkItem),
    ordered_parts: parts.map(normalizePart),
  };
}

export function normalizePublicVehicle(data: PublicVehicle): PublicVehicle {
  const currentRepair = data.current_repair;
  const latestDiagnostic = pickLatestDiagnostic(data);

  if (!currentRepair) {
    return {
      ...data,
      latest_diagnostic: latestDiagnostic,
    };
  }

  const estimateStatus =
    currentRepair.status === 'pending_approval' && !currentRepair.estimate_status
      ? 'pending'
      : currentRepair.estimate_status;

  return {
    ...data,
    latest_diagnostic: latestDiagnostic,
    current_repair: {
      ...currentRepair,
      estimate_status: estimateStatus,
    },
  };
}
