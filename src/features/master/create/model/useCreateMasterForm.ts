import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Bounce, toast } from 'react-toastify';

import { useCreateMasterMutation } from '@/entities/master';
import { getErrorMessage } from '@/shared/lib/api';

import { createMasterFormSchema, type CreateMasterFormValues } from './schema';

const defaultValues: CreateMasterFormValues = {
  fullName: '',
  specialty: '',
};

export function useCreateMasterForm(onSuccess?: () => void) {
  const [createMaster, { isLoading }] = useCreateMasterMutation();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateMasterFormValues>({
    resolver: zodResolver(createMasterFormSchema),
    defaultValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createMaster({
        full_name: values.fullName.trim(),
        specialty: values.specialty.trim(),
      }).unwrap();

      reset(defaultValues);
      toast.success('Мастер добавлен', {
        position: 'top-right',
        transition: Bounce,
      });
      onSuccess?.();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось добавить мастера'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  });

  return {
    control,
    errors,
    isSubmitting: isLoading,
    onSubmit,
    reset: () => reset(defaultValues),
  };
}
