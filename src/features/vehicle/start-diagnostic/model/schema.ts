import { z } from 'zod';

import { isValidRuPhone } from '@/shared/lib/phone';
import {
  formatChassisNumberInput,
  formatVinInput,
  isValidChassisNumber,
  isValidRuLicensePlate,
  isValidVin,
  normalizeRuLicensePlate,
} from '@/shared/lib/vehicle';

const optionalEmail = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || /^\S+@\S+\.\S+$/.test(value), {
    message: 'Введите корректную почту',
  });

export const startDiagnosticFormSchema = z
  .object({
    clientName: z.string().trim().min(1, 'Введите имя клиента'),
    clientPhone: z
      .string()
      .trim()
      .min(1, 'Введите телефон клиента')
      .refine((value) => isValidRuPhone(value), {
        message: 'Введите телефон в формате +7 999 123-45-67',
      }),
    clientEmail: optionalEmail,
    carModel: z.string().trim().min(1, 'Введите модель машины'),
    licensePlate: z
      .string()
      .trim()
      .refine((value) => normalizeRuLicensePlate(value).length > 0, {
        message: 'Введите гос номер',
      })
      .refine((value) => isValidRuLicensePlate(value), {
        message: 'Введите гос номер в формате А123ВС 777',
      }),
    vin: z
      .string()
      .trim()
      .refine((value) => value.length === 0 || isValidVin(value), {
        message: 'VIN должен содержать 17 символов (без I, O, Q)',
      }),
    chassisNumber: z
      .string()
      .trim()
      .refine((value) => value.length === 0 || isValidChassisNumber(value), {
        message: 'Номер шасси: 5–25 символов (латиница, цифры)',
      }),
    mileage: z
      .number({ error: 'Укажите пробег автомобиля' })
      .int('Пробег должен быть целым числом')
      .min(0, 'Пробег не может быть отрицательным')
      .optional(),
    clientPersonalDataConsent: z.boolean().refine((value) => value, {
      message: 'Подтвердите наличие согласия клиента на обработку ПДн',
    }),
  })
  .superRefine((data, ctx) => {
    if (typeof data.mileage !== 'number') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Укажите пробег автомобиля',
        path: ['mileage'],
      });
    }

    const vin = formatVinInput(data.vin ?? '');
    const chassisNumber = formatChassisNumberInput(data.chassisNumber ?? '');
    const hasVin = isValidVin(vin);
    const hasChassis = isValidChassisNumber(chassisNumber);

    if (hasVin || hasChassis) {
      return;
    }

    if (chassisNumber.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Номер шасси: 5–25 символов (латиница, цифры)',
        path: ['chassisNumber'],
      });
      return;
    }

    if (vin.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'VIN должен содержать 17 символов (без I, O, Q)',
        path: ['vin'],
      });
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Укажите VIN или номер шасси',
      path: ['vin'],
    });
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Укажите номер шасси, если нет VIN',
      path: ['chassisNumber'],
    });
  });

export type StartDiagnosticFormValues = z.infer<typeof startDiagnosticFormSchema>;
