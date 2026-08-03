import dayjs, { type Dayjs } from 'dayjs';
import { z } from 'zod';

import { isValidRuPhone } from '@/shared/lib/phone';

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

const vinSchema = z
  .string()
  .trim()
  .min(1, 'Введите VIN')
  .refine((value) => value.length === 17, {
    message: 'VIN должен содержать 17 символов',
  });

export const repairCreateFormSchema = z.object({
  clientId: z.string().optional(),
  vehicleId: z.string().optional(),
  clientName: z.string().trim().min(1, 'Введите имя клиента'),
  clientPhone: phoneSchema,
  vehicleSearch: z.string().optional(),
  clientEmail: optionalEmail,
  carModel: z.string().trim().min(1, 'Введите модель машины'),
  licensePlate: z.string().trim().min(1, 'Введите гос номер'),
  vin: vinSchema,
  mileage: z.number().int().min(0, 'Пробег не может быть отрицательным').optional(),
  status: z.enum(['new', 'diagnostics', 'in_progress', 'waiting_parts']),
  plannedReadyAt: z.custom<Dayjs | undefined>((value) => value == null || dayjs.isDayjs(value), {
    message: 'Некорректная дата',
  }),
  total: z.number().int().min(0, 'Сумма не может быть отрицательной').optional(),
  workItems: z
    .array(
      z.object({
        title: z.string().optional(),
      }),
    )
    .optional(),
  orderedParts: z
    .array(
      z.object({
        name: z.string().optional(),
        quantity: z.number().int().min(1).optional(),
      }),
    )
    .optional(),
  comment: z.string().optional(),
  clientPersonalDataConsent: z.boolean().refine((value) => value, {
    message: 'Подтвердите наличие согласия клиента на обработку ПДн',
  }),
});

export type RepairCreateSchemaValues = z.infer<typeof repairCreateFormSchema>;

export const clientStepFields = [
  'clientName',
  'clientPhone',
  'clientEmail',
  'carModel',
  'licensePlate',
  'vin',
  'mileage',
  'clientPersonalDataConsent',
] as const;
