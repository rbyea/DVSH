import type { ImportClientRow } from './types';

export const TEMPLATE_HEADERS = [
  'Имя',
  'Телефон',
  'Почта',
  'Автомобиль',
  'Госномер',
  'VIN',
  'Шасси',
  'Пробег',
] as const;

export const IMPORT_ROW_LIMIT = 1000;

type ImportField = Exclude<keyof ImportClientRow, 'source_row'>;

const HEADER_ALIASES: Record<string, ImportField> = {
  имя: 'client_name',
  фио: 'client_name',
  клиент: 'client_name',
  name: 'client_name',
  телефон: 'client_phone',
  тел: 'client_phone',
  phone: 'client_phone',
  почта: 'client_email',
  email: 'client_email',
  'e-mail': 'client_email',
  автомобиль: 'car_model',
  авто: 'car_model',
  марка: 'car_model',
  модель: 'car_model',
  car: 'car_model',
  госномер: 'license_plate',
  'гос номер': 'license_plate',
  номер: 'license_plate',
  plate: 'license_plate',
  vin: 'vin',
  вин: 'vin',
  шасси: 'chassis_number',
  пробег: 'mileage',
  mileage: 'mileage',
};

export function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replaceAll('ё', 'е').replaceAll(/\s+/g, ' ');
}

export function resolveHeaderField(header: string): ImportField | null {
  return HEADER_ALIASES[normalizeHeader(header)] ?? null;
}

export function parseMileageCell(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value);
  }

  const digits = String(value ?? '').replace(/\D+/g, '');

  if (!digits) {
    return undefined;
  }

  return Number(digits);
}

export function cellText(value: unknown): string {
  if (value == null) {
    return '';
  }

  return String(value).trim();
}
