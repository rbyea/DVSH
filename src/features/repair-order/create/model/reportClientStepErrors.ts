import type { FieldErrors, UseFormGetFieldState, UseFormSetFocus } from 'react-hook-form';
import { Bounce, toast } from 'react-toastify';

import type { RepairCreateFormValues } from '@/pages/RepairCreatePage/types';

import { clientStepFields } from './schema';

export function getCreateFieldElementId(field: string): string {
  return `create-field-${field}`;
}

function scrollToCreateField(field: string): void {
  document
    .getElementById(getCreateFieldElementId(field))
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function focusFirstClientStepError(
  getFieldState: UseFormGetFieldState<RepairCreateFormValues>,
  setFocus: UseFormSetFocus<RepairCreateFormValues>,
): string | null {
  for (const field of clientStepFields) {
    const { error } = getFieldState(field);
    const message = error?.message;

    if (!message) {
      continue;
    }

    setFocus(field);
    requestAnimationFrame(() => {
      scrollToCreateField(field);
    });

    return message;
  }

  return null;
}

export function reportClientStepValidationErrors(
  getFieldState: UseFormGetFieldState<RepairCreateFormValues>,
  setFocus: UseFormSetFocus<RepairCreateFormValues>,
): void {
  const message = focusFirstClientStepError(getFieldState, setFocus);

  toast.error(message ?? 'Проверьте заполнение формы клиента', {
    position: 'top-right',
    transition: Bounce,
    toastId: 'client-step-validation',
  });
}

export function focusClientStepFieldError(
  getFieldState: UseFormGetFieldState<RepairCreateFormValues>,
  setFocus: UseFormSetFocus<RepairCreateFormValues>,
): void {
  focusFirstClientStepError(getFieldState, setFocus);
}

function getFirstErrorMessage(errors: FieldErrors<RepairCreateFormValues>): string | null {
  for (const field of clientStepFields) {
    const message = errors[field]?.message;
    if (typeof message === 'string' && message) {
      return message;
    }
  }

  for (const key of Object.keys(errors) as Array<keyof RepairCreateFormValues>) {
    const message = errors[key]?.message;
    if (typeof message === 'string' && message) {
      return message;
    }
  }

  return null;
}

export function reportCreateFormValidationErrors(
  errors: FieldErrors<RepairCreateFormValues>,
  getFieldState: UseFormGetFieldState<RepairCreateFormValues>,
  setFocus: UseFormSetFocus<RepairCreateFormValues>,
  setCurrentStep: (step: number) => void,
): void {
  const hasClientStepError = clientStepFields.some((field) => Boolean(errors[field]));

  if (hasClientStepError) {
    setCurrentStep(1);
    window.setTimeout(() => {
      reportClientStepValidationErrors(getFieldState, setFocus);
    }, 0);
    return;
  }

  toast.error(getFirstErrorMessage(errors) ?? 'Проверьте заполнение формы', {
    position: 'top-right',
    transition: Bounce,
    toastId: 'create-form-validation',
  });
}
