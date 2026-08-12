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

export function getErrorMessage(error: unknown, fallback: string): string {
  if (isFetchBaseQueryError(error)) {
    const data = error.data;

    if (
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof data.message === 'string' &&
      data.message
    ) {
      return humanizeServerMessage(data.message) ?? data.message;
    }

    const laravelErrors = getLaravelErrors(error);

    if (laravelErrors) {
      const firstMessage = Object.values(laravelErrors)[0]?.[0];

      if (firstMessage) {
        return humanizeServerMessage(firstMessage) ?? firstMessage;
      }
    }
  }

  if (error instanceof Error && error.message) {
    return humanizeServerMessage(error.message) ?? error.message;
  }

  return fallback;
}

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
