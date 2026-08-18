import { z } from 'zod';

export const createMasterFormSchema = z.object({
  fullName: z.string().trim().min(1, 'Введите ФИО мастера'),
  specialty: z.string().trim().min(1, 'Укажите профессию / специализацию'),
});

export type CreateMasterFormValues = z.infer<typeof createMasterFormSchema>;
