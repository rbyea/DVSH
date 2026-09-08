import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Bounce, toast } from 'react-toastify';

import { useUpdateClientMutation, type Client } from '@/entities/client';
import { applyApiFieldErrors, getErrorMessage } from '@/shared/lib/api';
import { formatRuPhoneInput } from '@/shared/lib/phone';

import { updateClientFormSchema, type UpdateClientFormValues } from './schema';

export function toUpdateClientFormValues(client: Client): UpdateClientFormValues {
  return {
    name: client.name,
    phone: client.phone ? formatRuPhoneInput(client.phone) : '',
    email: client.email ?? '',
  };
}

export function useUpdateClientForm(client: Client, onSaved?: () => void) {
  const [updateClient, { isLoading: isSubmitting }] = useUpdateClientMutation();

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<UpdateClientFormValues>({
    resolver: zodResolver(updateClientFormSchema),
    defaultValues: toUpdateClientFormValues(client),
  });

  useEffect(() => {
    reset(toUpdateClientFormValues(client));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-seed when switching to another client
  }, [client.id, reset]);

  const resetToClient = () => {
    reset(toUpdateClientFormValues(client));
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      const updated = await updateClient({
        id: client.id,
        body: {
          name: values.name.trim(),
          phone: values.phone.trim() || null,
          email: values.email.trim() || null,
        },
      }).unwrap();
      reset(toUpdateClientFormValues(updated));
      onSaved?.();
      toast.success('Клиент обновлён', {
        position: 'top-right',
        transition: Bounce,
      });
    } catch (error) {
      if (!applyApiFieldErrors(error, setError)) {
        toast.error(getErrorMessage(error, 'Не удалось обновить клиента'), {
          position: 'top-right',
          transition: Bounce,
        });
      }
    }
  });

  return {
    control,
    errors,
    isSubmitting,
    onSubmit,
    resetToClient,
  };
}
