import { z } from 'zod';

export const forgotPasswordFormSchema = z.object({
  email: z.email('Введите корректный адрес электронной почты'),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;
