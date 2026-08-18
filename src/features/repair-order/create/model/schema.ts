import dayjs, { type Dayjs } from 'dayjs';
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
  })
  .optional();

const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Введите телефон клиента')
  .refine((value) => isValidRuPhone(value), {
    message: 'Введите телефон в формате +7 999 123-45-67',
  });

const licensePlateSchema = z
  .string()
  .trim()
  .refine((value) => normalizeRuLicensePlate(value).length > 0, {
    message: 'Введите гос номер',
  })
  .refine((value) => isValidRuLicensePlate(value), {
    message: 'Введите гос номер в формате А123ВС 777',
  });

export const repairCreateFormSchema = z
  .object({
    clientId: z.string().optional(),
    vehicleId: z.string().optional(),
    clientName: z.string().trim().min(1, 'Введите имя клиента'),
    clientPhone: phoneSchema,
    vehicleSearch: z.string().optional(),
    clientEmail: optionalEmail,
    carModel: z.string().trim().min(1, 'Введите модель машины'),
    licensePlate: licensePlateSchema,
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
      .union([
        z
          .number({
            error: 'Укажите пробег автомобиля',
          })
          .int('Пробег должен быть целым числом')
          .min(0, 'Пробег не может быть отрицательным'),
        z.undefined(),
      ])
      .refine((value): value is number => typeof value === 'number', {
        message: 'Укажите пробег автомобиля',
      }),
    status: z.enum(['new', 'pending_approval', 'in_progress', 'waiting_parts']),
    plannedReadyAt: z
      .union([
        z.custom<Dayjs>((value) => dayjs.isDayjs(value), {
          message: 'Некорректная дата',
        }),
        z.null(),
      ])
      .optional()
      .refine((value) => value == null || !value.isBefore(dayjs(), 'day'), {
        message: 'Дата выдачи не может быть в прошлом',
      }),
    total: z.number().int().min(0, 'Сумма не может быть отрицательной').optional(),
    workItems: z
      .array(
        z.object({
          title: z.string().optional(),
          masterId: z.string().optional(),
          price: z.number().min(0, 'Цена не может быть отрицательной').optional(),
          hours: z.number().min(0, 'Часы не могут быть отрицательными').optional(),
          isExtra: z.boolean().optional(),
        }),
      )
      .optional(),
    orderedParts: z
      .array(
        z.object({
          name: z.string().optional(),
          quantity: z.number().int().min(1).optional(),
          price: z.number().min(0, 'Цена не может быть отрицательной').optional(),
        }),
      )
      .optional(),
    comment: z.string().optional(),
    clientPersonalDataConsent: z.boolean().refine((value) => value, {
      message: 'Подтвердите наличие согласия клиента на обработку ПДн',
    }),
  })
  .superRefine((data, ctx) => {
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

export type RepairCreateSchemaValues = z.infer<typeof repairCreateFormSchema>;

export const clientStepFields = [
  'clientName',
  'clientPhone',
  'clientEmail',
  'carModel',
  'licensePlate',
  'vin',
  'chassisNumber',
  'mileage',
  'clientPersonalDataConsent',
] as const;
