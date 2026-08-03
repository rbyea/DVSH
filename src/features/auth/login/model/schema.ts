import { z } from 'zod';

export const loginFormSchema = z.object({
  email: z.email('Введите корректный адрес электронной почты'),
  password: z.string().min(1, 'Введите свой пароль'),
  acceptPersonalData: z.boolean().refine((value) => value, {
    message: 'Нужно принять условия обработки персональных данных',
  }),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
