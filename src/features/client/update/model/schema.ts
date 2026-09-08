import { z } from 'zod';

import { isValidRuPhone } from '@/shared/lib/phone';

export const updateClientFormSchema = z.object({
  name: z.string().trim().min(1, 'Введите имя клиента'),
  phone: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || isValidRuPhone(value), {
      message: 'Введите телефон в формате +7 999 123-45-67',
    }),
  email: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || /^\S+@\S+\.\S+$/.test(value), {
      message: 'Введите корректную почту',
    }),
});

export type UpdateClientFormValues = z.infer<typeof updateClientFormSchema>;
