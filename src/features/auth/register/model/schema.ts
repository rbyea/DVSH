import { z } from 'zod';

export const registerFormSchema = z
  .object({
    stationName: z.string().trim().min(2, 'Введите название СТО'),
    name: z.string().trim().min(2, 'Введите имя владельца'),
    email: z.email('Введите корректный адрес электронной почты'),
    password: z.string().min(8, 'Пароль должен быть не короче 8 символов'),
    passwordConfirmation: z.string().min(1, 'Повторите пароль'),
    acceptPersonalData: z.boolean().refine((value) => value, {
      message: 'Нужно принять условия обработки персональных данных',
    }),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: 'Пароли не совпадают',
    path: ['passwordConfirmation'],
  });

export type RegisterFormValues = z.infer<typeof registerFormSchema>;
