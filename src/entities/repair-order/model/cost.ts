import { toMoney } from '@/shared/lib/money';

import type { RepairPart, RepairWorkItem } from './types';

export type RepairCostBreakdown = {
  /** Сумма основных работ */
  worksTotal: number;
  /** Сумма доп. работ */
  extraWorksTotal: number;
  partsTotal: number;
  /** Работы + доп. работы + запчасти (справочно) */
  calculatedTotal: number;
};

function asMoney(value: unknown): number {
  return toMoney(value);
}

export function isExtraWorkItem(
  item: Pick<RepairWorkItem, 'is_extra'> | { isExtra?: boolean },
): boolean {
  if ('is_extra' in item) {
    return Boolean(item.is_extra);
  }

  return Boolean((item as { isExtra?: boolean }).isExtra);
}

/** Line total for a part: unit price × quantity. */
export function getPartLineTotal(part: Pick<RepairPart, 'quantity' | 'price'>): number {
  const unitPrice = asMoney(part.price);
  const quantity = asMoney(part.quantity);

  return unitPrice * (quantity > 0 ? quantity : 0);
}

export function getRepairCostBreakdown(input: {
  workItems?: Array<
    Pick<RepairWorkItem, 'price' | 'is_extra'> | { price?: unknown; isExtra?: boolean }
  > | null;
  orderedParts?: Array<Pick<RepairPart, 'quantity' | 'price'>> | null;
}): RepairCostBreakdown {
  let worksTotal = 0;
  let extraWorksTotal = 0;

  for (const item of input.workItems ?? []) {
    const price = asMoney(item.price);

    if (isExtraWorkItem(item)) {
      extraWorksTotal += price;
    } else {
      worksTotal += price;
    }
  }

  const partsTotal = (input.orderedParts ?? []).reduce(
    (sum, part) => sum + getPartLineTotal(part),
    0,
  );

  return {
    worksTotal,
    extraWorksTotal,
    partsTotal,
    calculatedTotal: worksTotal + extraWorksTotal + partsTotal,
  };
}
