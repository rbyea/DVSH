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

  if (normalized.includes('доступ запрещ') || normalized.includes('access denied')) {
    return 'Банк отклонил доступ к шлюзу. Для логина r-* нужен https://payment.alfabank.ru/payment/rest, логин *-api и его пароль (часто сначала сменить в кабинете).';
  }

  if (
    normalized.includes('gateway is unavailable') ||
    normalized.includes('ответил http') ||
    normalized.includes('не удалось подключиться к шлюзу')
  ) {
    return 'Неверный адрес API. Для логина r-* это https://payment.alfabank.ru/payment/rest — не ecom.alfabank.ru и не ссылка на форму карты.';
  }

  if (normalized.includes('pending payment') || normalized.includes('already exists')) {
    return 'По этому тарифу уже есть незакрытая оплата. Нажмите «Продлить» ещё раз после обновления страницы или дождитесь возврата из банка.';
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

const diagnosticVinMessages: Record<string, string> = {
  scan_vin_empty: 'В CSV не найден VIN — проверьте файл сканера',
  vehicle_vin_empty: 'Сначала укажите VIN автомобиля в карточке',
  vin_mismatch: 'VIN в файле не совпадает с авто в заказ-наряде',
};

function formatValidationMessage(field: string | undefined, message: string): string {
  const diagnosticMessage = diagnosticVinMessages[message];

  if (diagnosticMessage) {
    return diagnosticMessage;
  }

  const fieldKey = (field?.split('.').pop() ?? field ?? '').toLowerCase();
  const normalized = message.toLowerCase();

  if (
    (fieldKey === 'vin' || /\bvin\b/.test(normalized)) &&
    (normalized.includes('already been taken') || normalized.includes('уже занят'))
  ) {
    return 'VIN-код уже занят.';
  }

  const label = resolveFieldLabel(field);
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
  name: 'Название СТО',
  phone: 'Телефон СТО',
  city: 'Город',
  address: 'Адрес',
  working_hours: 'График работы',
  master_id: 'Мастер',
  amount: 'Сумма',
  occurred_on: 'Дата',
  comment: 'Комментарий',
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
  working_hours: 'workingHours',
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
    setError(formField, {
      type: 'server',
      message: formatValidationMessage(apiField, message),
    });
    applied = true;
  }

  return applied;
}
