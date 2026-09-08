import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Bounce, toast } from 'react-toastify';

import { useCreateClientWithVehicleMutation } from '@/entities/client';
import { applyApiFieldErrors, getErrorMessage } from '@/shared/lib/api';
import {
  formatChassisNumberInput,
  formatRuLicensePlateInput,
  formatVinInput,
} from '@/shared/lib/vehicle';

import { getDiagnosticVehiclePath } from './paths';
import { startDiagnosticFormSchema, type StartDiagnosticFormValues } from './schema';

export type VehicleDetailsDiagnosticState = {
  openInspectionForm?: boolean;
};

export function useStartDiagnosticForm() {
  const navigate = useNavigate();
  const [createClientWithVehicle, { isLoading: isSubmitting }] =
    useCreateClientWithVehicleMutation();

  const {
    control,
    handleSubmit,
    setError,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<StartDiagnosticFormValues>({
    resolver: zodResolver(startDiagnosticFormSchema),
    defaultValues: {
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      carModel: '',
      licensePlate: '',
      vin: '',
      chassisNumber: '',
      mileage: undefined,
      clientPersonalDataConsent: false,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const result = await createClientWithVehicle({
        client_name: values.clientName,
        client_phone: values.clientPhone || null,
        client_email: values.clientEmail || null,
        car_model: values.carModel,
        license_plate: formatRuLicensePlateInput(values.licensePlate),
        vin: formatVinInput(values.vin) || null,
        chassis_number: formatChassisNumberInput(values.chassisNumber) || null,
        mileage: values.mileage ?? null,
      }).unwrap();

      toast.success('Авто заведено — можно заполнять список работ', {
        position: 'top-right',
        transition: Bounce,
      });

      navigate(getDiagnosticVehiclePath(String(result.vehicle.id)), {
        state: { openInspectionForm: true } satisfies VehicleDetailsDiagnosticState,
      });
    } catch (error) {
      if (!applyApiFieldErrors(error, setError)) {
        toast.error(getErrorMessage(error, 'Не удалось завести автомобиль'), {
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
    setValue,
    clearErrors,
  };
}
