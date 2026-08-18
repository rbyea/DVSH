import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';

function isFetchBaseQueryError(error: unknown): error is FetchBaseQueryError {
  return typeof error === 'object' && error !== null && 'status' in error;
}

function getLaravelErrors(error: unknown): Record<string, string[]> | null {
  if (!isFetchBaseQueryError(error) || error.status !== 422) {
    return null;
  }

  const data = error.data;

  if (typeof data !== 'object' || data === null || !('errors' in data)) {
    return null;
  }

  const errors = data.errors;

  if (typeof errors !== 'object' || errors === null) {
    return null;
  }

  return errors as Record<string, string[]>;
}

function humanizeServerMessage(message: string): string | null {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('mileage') &&
    (normalized.includes('меньше') ||
      normalized.includes('greater than or equal') ||
      normalized.includes('min'))
  ) {
    return 'Пробег не может быть меньше пробега с последнего выданного заказа.';
  }

  if (
    normalized.includes('repair_orders_public_token_unique') ||
    (normalized.includes('duplicate entry') && normalized.includes('public_token')) ||
    (normalized.includes('sqlstate[23000]') && normalized.includes('public_token'))
  ) {
    return 'Не удалось создать ремонт: конфликт публичной ссылки на это авто. Нужно исправление на сервере.';
  }

  if (
    normalized.includes('integrity constraint violation') ||
    normalized.includes('sqlstate[23000]') ||
    normalized.includes('duplicate entry')
  ) {
    return 'Не удалось сохранить: конфликт данных на сервере. Попробуйте ещё раз или обратитесь в поддержку.';
  }

  return null;
}

function resolveFieldLabel(field: string | undefined): string | undefined {
  if (!field) {
    return undefined;
  }

  const key = field.split('.').pop() ?? field;

  return apiFieldLabels[key] ?? apiFieldLabels[field];
}

function formatValidationMessage(field: string | undefined, message: string): string {
  const label = resolveFieldLabel(field);
  const normalized = message.toLowerCase();
  const isRequired =
    normalized.includes('required') ||
    normalized.includes('обязательн') ||
    normalized.includes('must be present');

  if (isRequired && label) {
    return `${label} обязательно для заполнения`;
  }

  const humanized = humanizeServerMessage(message) ?? message;

  if (label && !humanized.toLowerCase().includes(label.toLowerCase())) {
    return `${label}: ${humanized}`;
  }

  return humanized;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (isFetchBaseQueryError(error)) {
    const laravelErrors = getLaravelErrors(error);

    if (laravelErrors) {
      const firstEntry = Object.entries(laravelErrors)[0];
      const firstMessage = firstEntry?.[1]?.[0];

      if (firstMessage) {
        return formatValidationMessage(firstEntry?.[0], firstMessage);
      }
    }

    const data = error.data;

    if (
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof data.message === 'string' &&
      data.message
    ) {
      return formatValidationMessage(undefined, data.message);
    }
  }

  if (error instanceof Error && error.message) {
    return formatValidationMessage(undefined, error.message);
  }

  return fallback;
}

const apiFieldLabels: Record<string, string> = {
  client_id: 'Клиент',
  client_name: 'Имя клиента',
  car_model: 'Модель',
  license_plate: 'Гос номер',
  vin: 'VIN',
  chassis_number: 'Номер шасси',
  mileage: 'Пробег',
};

const apiFieldToFormField: Record<string, string> = {
  client_name: 'clientName',
  client_phone: 'clientPhone',
  client_email: 'clientEmail',
  car_model: 'carModel',
  license_plate: 'licensePlate',
  vin: 'vin',
  chassis_number: 'chassisNumber',
  mileage: 'mileage',
  status: 'status',
  planned_ready_at: 'plannedReadyAt',
  comment: 'comment',
  total: 'total',
  station_name: 'stationName',
  password_confirmation: 'passwordConfirmation',
};

export function applyApiFieldErrors<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
): boolean {
  const laravelErrors = getLaravelErrors(error);

  if (!laravelErrors) {
    return false;
  }

  let applied = false;

  for (const [apiField, messages] of Object.entries(laravelErrors)) {
    const message = messages[0];

    if (!message) {
      continue;
    }

    const formField = (apiFieldToFormField[apiField] ?? apiField) as FieldPath<TFieldValues>;
    setError(formField, { type: 'server', message });
    applied = true;
  }

  return applied;
}
