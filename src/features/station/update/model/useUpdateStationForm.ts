import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Bounce, toast } from 'react-toastify';

import {
  DEFAULT_MASTER_SHARE_PERCENT,
  mergeStationProfile,
  useGetStationQuery,
  useUpdateStationMutation,
  writeLocalStationContacts,
  type StationInfo,
} from '@/entities/master';
import { applyApiFieldErrors, getErrorMessage } from '@/shared/lib/api';
import { formatRuPhoneInput } from '@/shared/lib/phone';

import { updateStationFormSchema, type UpdateStationFormValues } from './schema';

function toFormValues(station: StationInfo): UpdateStationFormValues {
  return {
    name: station.name ?? '',
    legalName: station.legal_name ?? '',
    phone: station.phone ? formatRuPhoneInput(station.phone) : '',
    city: station.city ?? '',
    address: station.address ?? '',
    workingHours: station.working_hours ?? '',
    mapUrl: station.map_url ?? '',
    inn: station.inn ?? '',
    ogrn: station.ogrn ?? '',
  };
}

function asOptional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function useUpdateStationForm(onSaved?: () => void) {
  const { data: station, isLoading } = useGetStationQuery();
  const [updateStation, { isLoading: isSaving }] = useUpdateStationMutation();
  const profile = useMemo(() => (station ? mergeStationProfile(station) : undefined), [station]);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<UpdateStationFormValues>({
    resolver: zodResolver(updateStationFormSchema),
    defaultValues: {
      name: '',
      legalName: '',
      phone: '',
      city: '',
      address: '',
      workingHours: '',
      mapUrl: '',
      inn: '',
      ogrn: '',
    },
  });

  const resetToProfile = () => {
    if (profile) {
      reset(toFormValues(profile));
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!station) {
      return;
    }

    const contacts = {
      legal_name: asOptional(values.legalName),
      phone: asOptional(values.phone),
      city: asOptional(values.city),
      address: asOptional(values.address),
      working_hours: asOptional(values.workingHours),
      map_url: asOptional(values.mapUrl),
      inn: asOptional(values.inn),
      ogrn: asOptional(values.ogrn),
    };
    const core = {
      name: values.name.trim(),
      master_share_percent: station.master_share_percent ?? DEFAULT_MASTER_SHARE_PERCENT,
    };

    writeLocalStationContacts(station.id, contacts);

    try {
      try {
        await updateStation({ ...core, ...contacts }).unwrap();
      } catch {
        const { map_url: _mapUrl, ...contactsWithoutMap } = contacts;
        await updateStation({ ...core, ...contactsWithoutMap }).unwrap();
      }

      reset({
        name: core.name,
        legalName: contacts.legal_name ?? '',
        phone: contacts.phone ? formatRuPhoneInput(contacts.phone) : '',
        city: contacts.city ?? '',
        address: contacts.address ?? '',
        workingHours: contacts.working_hours ?? '',
        mapUrl: contacts.map_url ?? '',
        inn: contacts.inn ?? '',
        ogrn: contacts.ogrn ?? '',
      });
      toast.success('Профиль станции сохранён', {
        position: 'top-right',
        transition: Bounce,
      });
      onSaved?.();
    } catch (error) {
      applyApiFieldErrors(error, setError);
      toast.error(getErrorMessage(error, 'Не удалось сохранить профиль станции'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  });

  return {
    control,
    errors,
    isLoading,
    isSubmitting: isSaving,
    onSubmit,
    profile,
    resetToProfile,
  };
}
