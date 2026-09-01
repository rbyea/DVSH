import { z } from 'zod';

import { isHttpUrl } from '@/shared/lib/maps';
import { isValidRuPhone } from '@/shared/lib/phone';

export const updateStationFormSchema = z.object({
  name: z.string().trim().min(1, 'Введите название СТО').max(120, 'Слишком длинное название'),
  legalName: z.string().trim().max(255, 'Слишком длинное название ИП / ООО'),
  phone: z
    .string()
    .trim()
    .refine((value) => value === '' || isValidRuPhone(value), 'Введите телефон в формате +7…'),
  city: z.string().trim().max(80, 'Слишком длинное название города'),
  address: z.string().trim().max(180, 'Слишком длинный адрес'),
  workingHours: z.string().trim().max(80, 'Слишком длинный график'),
  mapUrl: z
    .string()
    .trim()
    .max(2048, 'Слишком длинная ссылка')
    .refine((value) => value === '' || isHttpUrl(value), {
      message: 'Вставьте ссылку с https:// из Яндекс.Карт или 2ГИС',
    }),
  inn: z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d{10}$|^\d{12}$/.test(value), {
      message: 'ИНН: 10 цифр для юрлица или 12 для ИП',
    }),
  ogrn: z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d{13}$|^\d{15}$/.test(value), {
      message: 'ОГРН: 13 цифр или ОГРНИП: 15 цифр',
    }),
});

export type UpdateStationFormValues = z.infer<typeof updateStationFormSchema>;
