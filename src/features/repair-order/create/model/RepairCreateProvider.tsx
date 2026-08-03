import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Bounce, toast } from 'react-toastify';

import { useCreateClientWithVehicleMutation, useUpdateClientMutation } from '@/entities/client';
import {
  repairStatusLabels,
  useCreateRepairMutation,
  type RepairStatus,
} from '@/entities/repair-order';
import {
  useLazyGetVehicleQuery,
  useLazySearchVehiclesQuery,
  useUpdateVehicleMutation,
  type VehicleCard,
  type VehicleRepairHistory,
  type VehicleSearchResult,
} from '@/entities/vehicle';
import { initialValues, quickWorkTemplates } from '@/pages/RepairCreatePage/constants';
import type { RepairCreateFormValues } from '@/pages/RepairCreatePage/types';
import { applyApiFieldErrors, getErrorMessage } from '@/shared/lib/api';
import { formatRuPhoneInput } from '@/shared/lib/phone';

import { RepairCreateContext } from './RepairCreateContent';
import { clientStepFields, repairCreateFormSchema } from './schema';
import type { RepairCreateContextValue } from './types';

type RepairCreateProviderProps = {
  children: ReactNode;
};

function mapVehicleCardToFormValues(vehicle: VehicleCard): Partial<RepairCreateFormValues> {
  return {
    clientId: vehicle.client.id,
    vehicleId: vehicle.id,
    clientName: vehicle.client.name,
    clientPhone: vehicle.client.phone ? formatRuPhoneInput(vehicle.client.phone) : '',
    clientEmail: vehicle.client.email ?? undefined,
    carModel: vehicle.car_model,
    licensePlate: vehicle.license_plate,
    vin: vehicle.vin,
    mileage: vehicle.mileage ?? undefined,
  };
}

function mapVehicleCardToSearchResult(
  card: VehicleCard,
  fallback?: VehicleSearchResult | null,
): VehicleSearchResult {
  const fromSearch = fallback?.previous_repairs ?? [];
  const fromCard: VehicleRepairHistory[] = (card.repairs ?? []).map((repair) => ({
    id: repair.id,
    order_number: repair.order_number,
    title: repairStatusLabels[repair.status as RepairStatus] ?? repair.order_number,
    status: repair.status,
    completed_at: repair.status === 'done' ? repair.updated_at : null,
  }));

  return {
    id: card.id,
    client_name: card.client.name,
    client_phone: card.client.phone,
    client_email: card.client.email,
    car_model: card.car_model,
    license_plate: card.license_plate,
    vin: card.vin,
    mileage: card.mileage,
    previous_repairs: fromSearch.length > 0 ? fromSearch : fromCard,
  };
}

function toIdNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function RepairCreateProvider({ children }: RepairCreateProviderProps) {
  const navigate = useNavigate();
  const [isVehicleSearchLoading, setIsVehicleSearchLoading] = useState(false);
  const [vehicleSuggestions, setVehicleSuggestions] = useState<VehicleSearchResult[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSearchResult | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const [searchVehicles] = useLazySearchVehiclesQuery();
  const [getVehicle] = useLazyGetVehicleQuery();
  const [createClientWithVehicle, { isLoading: isCreatingClient }] =
    useCreateClientWithVehicleMutation();
  const [updateClient, { isLoading: isUpdatingClient }] = useUpdateClientMutation();
  const [updateVehicle, { isLoading: isUpdatingVehicle }] = useUpdateVehicleMutation();
  const [createRepair, { isLoading: isCreatingRepair }] = useCreateRepairMutation();

  const {
    clearErrors,
    control,
    getValues,
    handleSubmit,
    reset,
    setError,
    setValue,
    trigger,
    formState: { errors, isDirty },
  } = useForm<RepairCreateFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(repairCreateFormSchema),
    mode: 'onBlur',
  });

  const [selectedWorkItems, vehicleSearch, vehicleId, clientId] = useWatch({
    control,
    name: ['workItems', 'vehicleSearch', 'vehicleId', 'clientId'],
  });

  const selectedWorkTitles = new Set(
    (selectedWorkItems ?? []).map((workItem) => workItem.title).filter(Boolean),
  );
  const availableQuickWorkTemplates = quickWorkTemplates.filter(
    (template) => !selectedWorkTitles.has(template),
  );

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
      searchVehicles(searchQuery)
        .unwrap()
        .then((vehicles) => {
          if (isActive) {
            setVehicleSuggestions(vehicles);
          }
        })
        .catch((error) => {
          if (isActive) {
            setVehicleSuggestions([]);
            toast.error(getErrorMessage(error, 'Не удалось выполнить поиск автомобиля'), {
              position: 'top-right',
              transition: Bounce,
            });
          }
        })
        .finally(() => {
          if (isActive) {
            setIsVehicleSearchLoading(false);
          }
        });
    }, 400);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [searchVehicles, vehicleSearch]);

  const applyVehicleSuggestion = async (vehicle: VehicleSearchResult) => {
    try {
      setIsVehicleSearchLoading(true);
      const card = await getVehicle(vehicle.id).unwrap();

      setSelectedVehicle(mapVehicleCardToSearchResult(card, vehicle));
      setIsManualMode(false);
      reset({
        ...getValues(),
        ...mapVehicleCardToFormValues(card),
        vehicleSearch: vehicleSearch ?? '',
        status: getValues('status') || 'new',
      });
      clearErrors(['clientName', 'clientPhone', 'clientEmail', 'carModel', 'licensePlate', 'vin']);
      setCurrentStep(1);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось загрузить карточку автомобиля'), {
        position: 'top-right',
        transition: Bounce,
      });
    } finally {
      setIsVehicleSearchLoading(false);
    }
  };

  const createClientAndContinue = async () => {
    const values = getValues();

    if (values.clientId && values.vehicleId) {
      await continueToRepairStep();
      return;
    }

    const isValid = await trigger([...clientStepFields]);

    if (!isValid) {
      return;
    }

    try {
      const result = await createClientWithVehicle({
        client_name: values.clientName,
        client_phone: values.clientPhone || null,
        client_email: values.clientEmail || null,
        car_model: values.carModel,
        license_plate: values.licensePlate,
        vin: values.vin,
        mileage: values.mileage ?? null,
      }).unwrap();

      setValue('clientId', result.client.id);
      setValue('vehicleId', result.vehicle.id);
      setSelectedVehicle({
        id: result.vehicle.id,
        client_name: result.client.name,
        client_phone: result.client.phone,
        client_email: result.client.email,
        car_model: result.vehicle.car_model,
        license_plate: result.vehicle.license_plate,
        vin: result.vehicle.vin,
        mileage: result.vehicle.mileage,
        previous_repairs: [],
      });
      setIsManualMode(false);
      setCurrentStep(2);
      toast.success('Клиент и автомобиль созданы', {
        position: 'top-right',
        transition: Bounce,
      });
    } catch (error) {
      applyApiFieldErrors(error, setError);
      toast.error(getErrorMessage(error, 'Не удалось создать клиента'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  const continueToRepairStep = async () => {
    const isValid = await trigger([...clientStepFields]);

    if (!isValid) {
      return;
    }

    const values = getValues();

    if (!values.clientId || !values.vehicleId) {
      toast.warning('Сначала создайте клиента или выберите автомобиль', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    try {
      if (isDirty) {
        await Promise.all([
          updateClient({
            id: values.clientId,
            body: {
              name: values.clientName,
              phone: values.clientPhone || null,
              email: values.clientEmail || null,
            },
          }).unwrap(),
          updateVehicle({
            id: values.vehicleId,
            body: {
              car_model: values.carModel,
              license_plate: values.licensePlate,
              vin: values.vin,
              mileage: values.mileage ?? null,
            },
          }).unwrap(),
        ]);
      }

      setCurrentStep(2);
    } catch (error) {
      applyApiFieldErrors(error, setError);
      toast.error(getErrorMessage(error, 'Не удалось сохранить данные клиента'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  const onSubmit = async (values: RepairCreateFormValues) => {
    const vehicleIdNumber = toIdNumber(values.vehicleId);
    const clientIdNumber = toIdNumber(values.clientId);

    if (!vehicleIdNumber) {
      toast.warning('Нужен автомобиль: выберите из поиска или создайте клиента', {
        position: 'top-right',
        transition: Bounce,
      });
      setCurrentStep(values.vehicleId ? 2 : 1);
      return;
    }

    try {
      const created = await createRepair({
        vehicle_id: vehicleIdNumber,
        client_id: clientIdNumber ?? undefined,
        status: values.status,
        planned_ready_at: values.plannedReadyAt?.format('YYYY-MM-DD') ?? null,
        mileage: values.mileage ?? null,
        total: values.total ?? null,
        comment: values.comment || null,
        work_items: (values.workItems ?? [])
          .filter((workItem) => workItem.title)
          .map((workItem) => ({ title: workItem.title ?? '' })),
        ordered_parts: (values.orderedParts ?? [])
          .filter((part) => part.name)
          .map((part) => ({
            name: part.name ?? '',
            quantity: part.quantity ?? 1,
          })),
      }).unwrap();

      toast.success('Ремонт создан', {
        position: 'top-right',
        transition: Bounce,
      });
      navigate(`/repairs/${created.id}`, {
        state: { justCreated: true },
      });
    } catch (error) {
      applyApiFieldErrors(error, setError);
      toast.error(getErrorMessage(error, 'Не удалось создать ремонт'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  const handleStepChange = (step: number) => {
    if (step === 1 && !selectedVehicle && !isManualMode) {
      toast.warning('Введите гос.номер или VIN-номер автомобиля', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    if (step === 2 && !vehicleId && !clientId) {
      toast.warning('Выберите автомобиль или создайте клиента', {
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
    licensePlateSuggestions: [],
    vinSuggestions: [],
    availableQuickWorkTemplates,
    isSubmitting: isCreatingRepair,
    isCreatingClient,
    isSavingClientStep: isUpdatingClient || isUpdatingVehicle,
    isDirty,
    onSubmit,
    createClientAndContinue,
    continueToRepairStep,
    handleStepChange,
    handleSubmit,
  } satisfies RepairCreateContextValue;

  return <RepairCreateContext.Provider value={value}>{children}</RepairCreateContext.Provider>;
}
