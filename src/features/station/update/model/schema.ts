import { z } from 'zod';

import { isValidRuPhone } from '@/shared/lib/phone';

export const updateStationFormSchema = z.object({
  name: z.string().trim().min(1, 'Введите название СТО').max(120, 'Слишком длинное название'),
  phone: z
    .string()
    .trim()
    .refine((value) => value === '' || isValidRuPhone(value), 'Введите телефон в формате +7…'),
  city: z.string().trim().max(80, 'Слишком длинное название города'),
  address: z.string().trim().max(180, 'Слишком длинный адрес'),
  workingHours: z.string().trim().max(80, 'Слишком длинный график'),
});

export type UpdateStationFormValues = z.infer<typeof updateStationFormSchema>;
