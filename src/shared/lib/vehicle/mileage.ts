/** Lowest allowed mileage for a new/updated repair after last issued order. */
export function getMinAllowedMileage(candidates: Array<number | null | undefined>): number | null {
  const values = candidates.filter(
    (value): value is number => typeof value === 'number' && value >= 0,
  );

  if (values.length === 0) {
    return null;
  }

  return Math.max(...values);
}

export function formatMileageKm(value: number): string {
  return `${value.toLocaleString('ru-RU')} км`;
}

export function formatMileageDelta(from: number, to: number): string {
  const delta = to - from;

  if (delta === 0) {
    return 'без изменения';
  }

  const formatted = Math.abs(delta).toLocaleString('ru-RU');
  return delta > 0 ? `+${formatted} км` : `−${formatted} км`;
}

export function resolveMinAllowedMileage(source: {
  last_completed_mileage?: number | null;
  mileage?: number | null;
  previous_repairs?: Array<{ status?: string; mileage?: number | null }>;
  repairs?: Array<{ status?: string; mileage?: number | null }>;
}): number | null {
  const fromCompletedHistory = [...(source.previous_repairs ?? []), ...(source.repairs ?? [])]
    .filter((item) => item.status === 'completed')
    .map((item) => item.mileage);

  return getMinAllowedMileage([
    source.last_completed_mileage,
    source.last_completed_mileage == null ? source.mileage : null,
    ...fromCompletedHistory,
  ]);
}
