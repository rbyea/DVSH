import { z } from 'zod';

export const resetPasswordFormSchema = z
  .object({
    password: z.string().min(8, 'Пароль должен быть не короче 8 символов'),
    passwordConfirmation: z.string().min(1, 'Повторите пароль'),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: 'Пароли не совпадают',
    path: ['passwordConfirmation'],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;
