/** Laravel decimal / JSON often sends money as `"1500.00"` instead of a number. */
export function parseMoney(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

export function toMoney(value: unknown): number {
  return parseMoney(value) ?? 0;
}
