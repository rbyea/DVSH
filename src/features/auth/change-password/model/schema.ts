import { z } from 'zod';

export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Введите текущий пароль'),
    password: z.string().min(8, 'Пароль должен быть не короче 8 символов'),
    passwordConfirmation: z.string().min(1, 'Повторите новый пароль'),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: 'Пароли не совпадают',
    path: ['passwordConfirmation'],
  })
  .refine((values) => values.password !== values.currentPassword, {
    message: 'Новый пароль должен отличаться от текущего',
    path: ['password'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;
