import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Bounce, toast } from 'react-toastify';

import { useCreateMasterMutation, useUpdateMasterMutation, type Master } from '@/entities/master';
import { getErrorMessage } from '@/shared/lib/api';
import { formatRuPhoneInput } from '@/shared/lib/phone';

import { createMasterFormSchema, type CreateMasterFormValues } from './schema';

const emptyValues: CreateMasterFormValues = {
  fullName: '',
  specialty: '',
  birthday: '',
  phone: '',
};

function toFormValues(master?: Master): CreateMasterFormValues {
  if (!master) {
    return emptyValues;
  }

  return {
    fullName: master.full_name,
    specialty: master.specialty,
    birthday: master.birthday ?? '',
    phone: master.phone ? formatRuPhoneInput(master.phone) : '',
  };
}

function toPayload(values: CreateMasterFormValues) {
  return {
    full_name: values.fullName.trim(),
    specialty: values.specialty.trim(),
    birthday: values.birthday.trim() || null,
    phone: values.phone.trim() || null,
  };
}

export function useCreateMasterForm(onSuccess?: () => void, master?: Master) {
  const [createMaster, { isLoading: isCreating }] = useCreateMasterMutation();
  const [updateMaster, { isLoading: isUpdating }] = useUpdateMasterMutation();
  const defaultValues = toFormValues(master);

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
    const body = toPayload(values);

    try {
      if (master) {
        await updateMaster({ id: master.id, body }).unwrap();
        toast.success('Мастер обновлён', {
          position: 'top-right',
          transition: Bounce,
        });
      } else {
        await createMaster(body).unwrap();
        reset(emptyValues);
        toast.success('Мастер добавлен', {
          position: 'top-right',
          transition: Bounce,
        });
      }

      onSuccess?.();
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          master ? 'Не удалось сохранить мастера' : 'Не удалось добавить мастера',
        ),
        {
          position: 'top-right',
          transition: Bounce,
        },
      );
    }
  });

  return {
    control,
    errors,
    isSubmitting: isCreating || isUpdating,
    onSubmit,
    reset: () => reset(defaultValues),
  };
}
