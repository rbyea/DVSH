import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import type { RepairCreateContextValue } from './types';
import { RepairCreateContext } from './RepairCreateContent';
import { searchMockVehicles, type VehicleSuggestion } from '@/entities/vehicle';
import { useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import type { RepairCreateFormValues } from '@/pages/RepairCreatePage/types';
import { initialValues, quickWorkTemplates } from '@/pages/RepairCreatePage/constants';
import { createMockRepairOrder, type RepairCreatePayload } from '@/entities/repair-order';
import { Bounce, toast } from 'react-toastify';

type RepairCreateProviderProps = {
  children: ReactNode;
};

function mapVehicleToFormValues(vehicle: VehicleSuggestion) {
  return {
    vehicleId: vehicle.id,
    clientName: vehicle.clientName,
    clientPhone: vehicle.clientPhone,
    vehicleSearch: vehicle.vehicleSearch,
    clientEmail: vehicle.clientEmail,
    carModel: vehicle.carModel,
    licensePlate: vehicle.licensePlate,
    vin: vehicle.vin,
    mileage: vehicle.mileage,
  } satisfies Partial<RepairCreateFormValues>;
}

export function RepairCreateProvider({ children }: RepairCreateProviderProps) {
  const navigate = useNavigate();
  const [isVehicleSearchLoading, setIsVehicleSearchLoading] = useState(false);
  const [vehicleSuggestions, setVehicleSuggestions] = useState<VehicleSuggestion[]>([]);
  const [licensePlateSuggestions, setLicensePlateSuggestions] = useState<VehicleSuggestion[]>([]);

  const [vinSuggestions, setVinSuggestions] = useState<VehicleSuggestion[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSuggestion | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const {
    clearErrors,
    control,
    getValues,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<RepairCreateFormValues>({
    defaultValues: initialValues,
  });

  const [licensePlate, vin, selectedWorkItems, vehicleSearch, vehicleId] = useWatch({
    control,
    name: ['licensePlate', 'vin', 'workItems', 'vehicleSearch', 'vehicleId'],
  });

  const selectedWorkTitles = new Set(
    (selectedWorkItems ?? []).map((workItem) => workItem.title).filter(Boolean),
  );
  const availableQuickWorkTemplates = quickWorkTemplates.filter(
    (template) => !selectedWorkTitles.has(template),
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      searchMockVehicles(licensePlate ?? '').then(setLicensePlateSuggestions);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [licensePlate]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      searchMockVehicles(vin ?? '').then(setVinSuggestions);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [vin]);

  useEffect(() => {
    const searchQuery = vehicleSearch?.trim() || '';

    if (searchQuery?.length > 0 && searchQuery?.length < 2) {
      setVehicleSuggestions([]);
      setIsVehicleSearchLoading(false);
      return;
    }

    let isActive = true;
    setIsVehicleSearchLoading(true);

    const timeoutId = window.setTimeout(() => {
      searchMockVehicles(searchQuery)
        .then((vehicles) => {
          if (isActive) {
            setVehicleSuggestions(vehicles);
          }
        })
        .finally(() => {
          if (isActive) {
            setIsVehicleSearchLoading(false);
          }
        });
    }, 1050);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [vehicleSearch]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      searchMockVehicles(licensePlate ?? '').then(setLicensePlateSuggestions);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [licensePlate]);

  useEffect(() => {
    const searchQuery = vehicleSearch?.trim() || '';

    if (searchQuery.length < 2) {
      setVehicleSuggestions([]);
      setIsVehicleSearchLoading(false);
      return;
    }

    let isActive = true;
    setIsVehicleSearchLoading(true);

    const timeoutId = window.setTimeout(() => {
      searchMockVehicles(searchQuery)
        .then((vehicles) => {
          if (isActive) {
            setVehicleSuggestions(vehicles);
          }
        })
        .finally(() => {
          if (isActive) {
            setIsVehicleSearchLoading(false);
          }
        });
    }, 1050);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [vehicleSearch]);

  const applyVehicleSuggestion = (vehicle: VehicleSuggestion) => {
    setSelectedVehicle(vehicle);
    setIsManualMode(false);
    setIsVehicleSearchLoading(false);
    setValue('vehicleSearch', `${vehicleSearch}`);
    reset({
      ...getValues(),
      ...mapVehicleToFormValues(vehicle),
    });
    clearErrors(['clientName', 'carModel', 'licensePlate', 'vin']);
    setCurrentStep(2);
  };

  const onSubmit = async (values: RepairCreateFormValues) => {
    const payload: RepairCreatePayload = {
      vehicleId: values.vehicleId,
      clientName: values.clientName,
      clientPhone: values.clientPhone,
      clientEmail: values.clientEmail,
      carModel: values.carModel,
      licensePlate: values.licensePlate,
      vin: values.vin,
      mileage: values.mileage,
      status: values.status,
      plannedReadyAt: values.plannedReadyAt?.format('YYYY-MM-DD'),
      workItems: (values.workItems ?? [])
        .filter((workItem) => workItem.title)
        .map((workItem) => ({ title: workItem.title ?? '' })),
      orderedParts: (values.orderedParts ?? [])
        .filter((part) => part.name)
        .map((part) => ({
          name: part.name ?? '',
          quantity: part.quantity ?? 1,
        })),
      comment: values.comment,
    };

    await createMockRepairOrder(payload);
    navigate('/dashboard');
  };

  const handleStepChange = (step: number) => {
    if (step === 1 && !selectedVehicle && !isManualMode) {
      toast.warning('Введите гос.номер или VIN-номер автомобиля', {
        position: 'top-right',
        transition: Bounce,
      });

      return;
    } else if (step === 2 && vehicleId?.length === 0) {
      toast.warning('Выберите автомобиль в первом пункте или создайте клиента', {
        position: 'top-right',
        transition: Bounce,
      });

      return;
    }

    setCurrentStep(step);
  };

  const value = {
    getValues,
    vehicleSearch,
    setVehicleSuggestions,
    setSelectedVehicle,
    selectedVehicle,
    setCurrentStep,
    setIsManualMode,
    setValue,
    reset,
    isVehicleSearchLoading,
    setIsVehicleSearchLoading,
    applyVehicleSuggestion,
    vehicleSuggestions,
    currentStep,
    isManualMode,
    errors,
    control,
    licensePlateSuggestions,
    vinSuggestions,
    availableQuickWorkTemplates,
    isSubmitting,
    isDirty,
    onSubmit,
    handleStepChange,
    handleSubmit,
  } satisfies RepairCreateContextValue;

  return <RepairCreateContext.Provider value={value}>{children}</RepairCreateContext.Provider>;
}
