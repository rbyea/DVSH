import { parseMoney } from '@/shared/lib/money';

import type { RepairDetail, RepairPart, RepairWorkItem } from './types';

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
