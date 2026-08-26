import { z } from 'zod';

import { isValidRuPhone } from '@/shared/lib/phone';

export const createMasterFormSchema = z.object({
  fullName: z.string().trim().min(1, 'Введите ФИО мастера'),
  specialty: z.string().trim().min(1, 'Укажите профессию / специализацию'),
  birthday: z.string(),
  phone: z
    .string()
    .refine((value) => !value.trim() || isValidRuPhone(value), 'Введите телефон в формате +7…'),
});

export type CreateMasterFormValues = z.infer<typeof createMasterFormSchema>;
