import { formatMileageKm } from '@/shared/lib/vehicle';

export type VehicleMaintenanceItem = {
  id: string;
  vehicle_id: string;
  title: string;
  every_km: number;
  next_due_km: number;
  last_done_km: number | null;
  note?: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateVehicleMaintenanceRequest = {
  title: string;
  every_km: number;
  next_due_km?: number | null;
  note?: string | null;
};

export type UpdateVehicleMaintenanceRequest = Partial<{
  title: string;
  every_km: number;
  next_due_km: number;
  last_done_km: number | null;
  note: string | null;
}>;

export type MaintenanceStatus = 'overdue' | 'due' | 'soon' | 'later';

export type MaintenanceRow = VehicleMaintenanceItem & {
  remainingKm: number | null;
  status: MaintenanceStatus;
  stopKms: number[];
};

export type MaintenancePlan = {
  currentKm: number | null;
  rows: MaintenanceRow[];
  attention: MaintenanceRow[];
  stops: number[];
  markerProgress: number | null;
};

const CHART_FUTURE_STOPS = 2;
const CHART_MAX_STOPS = 8;

export const maintenanceTitleSuggestions = [
  'Масло двигателя и масляный фильтр',
  'Салонный фильтр',
  'Воздушный фильтр',
  'Топливный фильтр',
  'Свечи зажигания',
  'Тормозная жидкость',
  'Ремень ГРМ',
] as const;

function soonThresholdKm(everyKm: number): number {
  return Math.min(3_000, Math.round(everyKm * 0.2));
}

export function resolveMaintenanceStatus(
  nextDueKm: number,
  currentKm: number | null,
  everyKm: number,
): MaintenanceStatus {
  if (currentKm == null) {
    return 'later';
  }

  const remaining = nextDueKm - currentKm;
  const soon = soonThresholdKm(everyKm);

  if (remaining < 0) {
    return 'overdue';
  }

  if (remaining === 0) {
    return 'due';
  }

  if (remaining <= soon) {
    return 'soon';
  }

  return 'later';
}

export type MaintenancePlanSource = Pick<
  VehicleMaintenanceItem,
  'title' | 'every_km' | 'next_due_km'
> & {
  id?: string;
  last_done_km?: number | null;
};

function collectItemStops(item: MaintenancePlanSource, horizonKm: number): number[] {
  const stops: number[] = [];

  if (typeof item.last_done_km === 'number') {
    stops.push(item.last_done_km);
  }

  let km = item.next_due_km;

  for (let index = 0; index < CHART_FUTURE_STOPS && km <= horizonKm; index += 1) {
    stops.push(km);
    km += item.every_km;
  }

  return stops;
}

function limitChartStops(stops: number[], currentKm: number | null, required: number[]): number[] {
  const unique = [...new Set(stops)].sort((left, right) => left - right);

  if (unique.length <= CHART_MAX_STOPS) {
    return unique;
  }

  const must = new Set<number>([...(currentKm != null ? [currentKm] : []), ...required]);
  const pinned = unique.filter((km) => must.has(km));
  const extras = unique.filter((km) => !must.has(km));

  if (pinned.length >= CHART_MAX_STOPS) {
    const start = currentKm ?? pinned[0] ?? 0;

    return pinned
      .map((km) => ({ km, distance: Math.abs(km - start) }))
      .sort((left, right) => left.distance - right.distance)
      .slice(0, CHART_MAX_STOPS)
      .map((item) => item.km)
      .sort((left, right) => left - right);
  }

  const start = currentKm ?? unique[0] ?? 0;
  const extraSlots = CHART_MAX_STOPS - pinned.length;
  const extraPast = extras.filter((km) => km < start).slice(-1);
  const extraFuture = extras
    .filter((km) => km >= start)
    .slice(0, Math.max(0, extraSlots - extraPast.length));

  return [...pinned, ...extraPast, ...extraFuture].sort((left, right) => left - right);
}

function chartMarkerProgress(stops: number[], currentKm: number | null): number | null {
  if (currentKm == null || stops.length === 0) {
    return null;
  }

  if (stops.length === 1) {
    return 0.5;
  }

  const exact = stops.indexOf(currentKm);

  if (exact >= 0) {
    return (exact + 0.5) / stops.length;
  }

  let left = 0;

  for (let index = 0; index < stops.length; index += 1) {
    if (stops[index] <= currentKm) {
      left = index;
    }
  }

  const right = Math.min(left + 1, stops.length - 1);
  const leftKm = stops[left];
  const rightKm = stops[right];

  if (leftKm == null || rightKm == null || rightKm === leftKm) {
    return (left + 0.5) / stops.length;
  }

  const t = (currentKm - leftKm) / (rightKm - leftKm);

  return (left + 0.5 + t * (right - left)) / stops.length;
}

function compareRows(left: MaintenanceRow, right: MaintenanceRow): number {
  const rank: Record<MaintenanceStatus, number> = {
    overdue: 0,
    due: 1,
    soon: 2,
    later: 3,
  };

  const byStatus = rank[left.status] - rank[right.status];

  if (byStatus !== 0) {
    return byStatus;
  }

  return left.next_due_km - right.next_due_km;
}

export function buildMaintenancePlan(input: {
  mileage?: number | null;
  items?: MaintenancePlanSource[];
}): MaintenancePlan {
  const currentKm = typeof input.mileage === 'number' && input.mileage >= 0 ? input.mileage : null;
  const source = input.items ?? [];
  const maxEveryKm = source.reduce((max, item) => Math.max(max, item.every_km), 10_000);
  const farthestDue = source.reduce((max, item) => Math.max(max, item.next_due_km), 0);
  const horizonKm = Math.max(
    (currentKm ?? 0) + maxEveryKm * CHART_FUTURE_STOPS,
    farthestDue + maxEveryKm * 2,
  );

  const rows = source.map((item, index): MaintenanceRow => ({
    id: item.id ?? `item-${index}`,
    vehicle_id: '',
    title: item.title,
    every_km: item.every_km,
    next_due_km: item.next_due_km,
    last_done_km: item.last_done_km ?? null,
    created_at: '',
    updated_at: '',
    remainingKm: currentKm == null ? null : item.next_due_km - currentKm,
    status: resolveMaintenanceStatus(item.next_due_km, currentKm, item.every_km),
    stopKms: collectItemStops(item, horizonKm),
  }));

  const sorted = [...rows].sort(compareRows);
  const rawStops = [
    ...new Set([
      ...(currentKm != null ? [currentKm] : []),
      ...sorted.flatMap((row) => row.stopKms),
    ]),
  ].sort((left, right) => left - right);
  const stops = limitChartStops(
    rawStops,
    currentKm,
    sorted.flatMap((row) => [
      row.next_due_km,
      ...(row.last_done_km != null ? [row.last_done_km] : []),
    ]),
  );

  return {
    currentKm,
    rows: sorted,
    attention: sorted.filter(
      (row) => row.status === 'overdue' || row.status === 'due' || row.status === 'soon',
    ),
    stops,
    markerProgress: chartMarkerProgress(stops, currentKm),
  };
}

export function formatMaintenanceAttention(plan: MaintenancePlan): string | null {
  const [first, ...rest] = plan.attention;

  if (!first) {
    return null;
  }

  if (rest.length > 0) {
    return `${plan.attention.length} позиции к ТО`;
  }

  if (first.status === 'overdue' || first.status === 'due') {
    return `${first.title} — пора менять`;
  }

  if (first.remainingKm != null && first.remainingKm > 0) {
    return `${first.title} — через ${first.remainingKm.toLocaleString('ru-RU')} км`;
  }

  return first.title;
}

export function nextDueFromCurrent(currentKm: number, everyKm: number): number {
  return currentKm + everyKm;
}

export function formatMaintenanceStopLabel(km: number): string {
  if (km >= 1000) {
    return `${(km / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}\u00a0тыс.`;
  }

  return formatMileageKm(km);
}

export function formatMaintenanceRowHint(row: MaintenanceRow): string {
  if (row.status === 'overdue' || row.status === 'due') {
    return `пора · ${formatMileageKm(row.next_due_km)}`;
  }

  if (row.remainingKm != null && row.remainingKm > 0) {
    return `через ${formatMileageKm(row.remainingKm)}`;
  }

  return `каждые ${formatMileageKm(row.every_km)}`;
}
