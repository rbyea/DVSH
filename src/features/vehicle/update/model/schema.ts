import { z } from 'zod';

import {
  formatChassisNumberInput,
  formatVinInput,
  isValidChassisNumber,
  isValidRuLicensePlate,
  isValidVin,
  normalizeRuLicensePlate,
} from '@/shared/lib/vehicle';

export function createUpdateVehicleFormSchema(minMileage: number | null) {
  return z
    .object({
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
      vin: z.string(),
      chassisNumber: z.string(),
      mileage: z
        .number({ error: 'Укажите пробег автомобиля' })
        .int('Пробег должен быть целым числом')
        .min(0, 'Пробег не может быть отрицательным')
        .refine((value) => minMileage == null || value >= minMileage, {
          message:
            minMileage == null
              ? 'Укажите пробег автомобиля'
              : `Пробег не может быть меньше ${minMileage.toLocaleString('ru-RU')} км после статуса «Выдан»`,
        }),
      useChassisNumber: z.boolean(),
    })
    .superRefine((data, ctx) => {
      const vin = formatVinInput(data.vin);
      const chassisNumber = formatChassisNumberInput(data.chassisNumber);

      if (data.useChassisNumber) {
        if (!isValidChassisNumber(chassisNumber)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: chassisNumber
              ? 'Номер шасси: 5–25 символов (латиница, цифры)'
              : 'Укажите номер шасси',
            path: ['chassisNumber'],
          });
        }
        return;
      }

      if (!isValidVin(vin)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: vin ? 'VIN должен содержать 17 символов (без I, O, Q)' : 'Укажите VIN',
          path: ['vin'],
        });
      }
    });
}

export type UpdateVehicleFormValues = z.infer<ReturnType<typeof createUpdateVehicleFormSchema>>;
