import { parseMoney } from '@/shared/lib/money';

import { resolveStatusAfterEstimate, repairStatusLabels } from './status';
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

  if (!currentRepair) {
    return data;
  }

  const status = resolveStatusAfterEstimate(currentRepair.status, currentRepair.estimate_status);

  if (status === currentRepair.status) {
    return data;
  }

  return {
    ...data,
    current_repair: {
      ...currentRepair,
      status,
      status_label: repairStatusLabels[status],
    },
  };
}
