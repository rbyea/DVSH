import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Bounce, toast } from 'react-toastify';

import { useUpdateVehicleMutation, type VehicleCard } from '@/entities/vehicle';
import { applyApiFieldErrors, getErrorMessage } from '@/shared/lib/api';
import {
  formatChassisNumberInput,
  formatRuLicensePlateInput,
  formatRuLicensePlateMaskedInput,
  formatVinInput,
  resolveMinAllowedMileage,
} from '@/shared/lib/vehicle';

import { createUpdateVehicleFormSchema, type UpdateVehicleFormValues } from './schema';

export function toUpdateVehicleFormValues(vehicle: VehicleCard): UpdateVehicleFormValues {
  const vin = formatVinInput(vehicle.vin ?? '');
  const chassisNumber = formatChassisNumberInput(vehicle.chassis_number ?? '');

  return {
    carModel: vehicle.car_model,
    licensePlate: formatRuLicensePlateMaskedInput(vehicle.license_plate),
    vin,
    chassisNumber,
    mileage: vehicle.mileage ?? 0,
    useChassisNumber: Boolean(chassisNumber) && !vin,
  };
}

export function useUpdateVehicleForm(vehicle: VehicleCard, onSaved?: () => void) {
  const minMileage = resolveMinAllowedMileage(vehicle);
  const schema = useMemo(() => createUpdateVehicleFormSchema(minMileage), [minMileage]);
  const [updateVehicle, { isLoading: isSubmitting }] = useUpdateVehicleMutation();

  const {
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors },
  } = useForm<UpdateVehicleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toUpdateVehicleFormValues(vehicle),
  });

  const useChassisNumber = useWatch({ control, name: 'useChassisNumber' });

  useEffect(() => {
    reset(toUpdateVehicleFormValues(vehicle));
  }, [reset, vehicle.id]);

  const resetToVehicle = () => {
    reset(toUpdateVehicleFormValues(vehicle));
  };

  const onSubmit = handleSubmit(async (values) => {
    const vin = values.useChassisNumber ? null : formatVinInput(values.vin) || null;
    const chassisNumber = values.useChassisNumber
      ? formatChassisNumberInput(values.chassisNumber) || null
      : null;

    try {
      await updateVehicle({
        id: vehicle.id,
        body: {
          car_model: values.carModel.trim(),
          license_plate: formatRuLicensePlateInput(values.licensePlate),
          vin,
          chassis_number: chassisNumber,
          mileage: values.mileage ?? null,
        },
      }).unwrap();
      onSaved?.();
      toast.success('Автомобиль обновлён', {
        position: 'top-right',
        transition: Bounce,
      });
    } catch (error) {
      if (!applyApiFieldErrors(error, setError)) {
        toast.error(getErrorMessage(error, 'Не удалось обновить автомобиль'), {
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
    minMileage,
    onSubmit,
    resetToVehicle,
    setValue,
    useChassisNumber: Boolean(useChassisNumber),
  };
}
