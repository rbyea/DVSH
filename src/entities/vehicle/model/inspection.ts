export type InspectionAction = 'replace' | 'repair' | 'check';

export type InspectionUrgency = 'now' | 'recommended' | 'later';

export type InspectionItemStatus = 'open' | 'in_order' | 'done';

export type VehicleInspectionItem = {
  id: string;
  vehicle_id: string;
  /** Что не так / наблюдение */
  finding: string;
  /** Что сделать — уйдёт в название работы */
  title: string;
  action: InspectionAction;
  urgency: InspectionUrgency;
  note?: string | null;
  price?: number | null;
  status: InspectionItemStatus;
  created_at: string;
  updated_at: string;
};

export type CreateVehicleInspectionRequest = {
  finding?: string;
  title: string;
  action: InspectionAction;
  urgency: InspectionUrgency;
  note?: string | null;
  price?: number | null;
};

export type UpdateVehicleInspectionRequest = Partial<
  Pick<
    VehicleInspectionItem,
    'finding' | 'title' | 'action' | 'urgency' | 'note' | 'price' | 'status'
  >
>;

export const inspectionActionLabels: Record<InspectionAction, string> = {
  replace: 'Замена',
  repair: 'Ремонт',
  check: 'Проверка',
};

export const inspectionUrgencyLabels: Record<InspectionUrgency, string> = {
  now: 'Срочно',
  recommended: 'Рекомендуем',
  later: 'На потом',
};

export const inspectionStatusLabels: Record<InspectionItemStatus, string> = {
  open: 'Открыто',
  in_order: 'В заказе',
  done: 'Сделано',
};

export function buildInspectionWorkTitle(
  item: Pick<VehicleInspectionItem, 'action' | 'title'>,
): string {
  const trimmed = item.title.trim();

  if (!trimmed) {
    return inspectionActionLabels[item.action];
  }

  const actionLabel = inspectionActionLabels[item.action];
  const lower = trimmed.toLowerCase();

  if (lower.startsWith(actionLabel.toLowerCase())) {
    return trimmed;
  }

  return `${actionLabel}: ${trimmed}`;
}
