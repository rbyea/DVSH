import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useForm, useWatch, type UseFormSetError } from 'react-hook-form';
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
import {
  formatChassisNumberInput,
  formatRuLicensePlateInput,
  formatRuLicensePlateMaskedInput,
  formatMileageKm,
  formatVinInput,
  resolveMinAllowedMileage,
} from '@/shared/lib/vehicle';

import { RepairCreateContext } from './RepairCreateContent';
import {
  focusClientStepFieldError,
  reportClientStepValidationErrors,
  reportCreateFormValidationErrors,
} from './reportClientStepErrors';
import { clientStepFields, repairCreateFormSchema } from './schema';
import type { RepairCreateContextValue } from './types';

type RepairCreateProviderProps = {
  children: ReactNode;
};

function mapVehicleCardToFormValues(vehicle: VehicleCard): Partial<RepairCreateFormValues> {
  return {
    clientId: String(vehicle.client.id),
    vehicleId: String(vehicle.id),
    clientName: vehicle.client.name,
    clientPhone: vehicle.client.phone ? formatRuPhoneInput(vehicle.client.phone) : '',
    clientEmail: vehicle.client.email ?? undefined,
    carModel: vehicle.car_model,
    licensePlate: formatRuLicensePlateMaskedInput(vehicle.license_plate),
    vin: formatVinInput(vehicle.vin ?? ''),
    chassisNumber: formatChassisNumberInput(vehicle.chassis_number ?? ''),
    mileage: vehicle.mileage ?? undefined,
  };
}

function mapRepairSummaryToHistory(repair: VehicleCard['repairs'][number]): VehicleRepairHistory {
  return {
    id: String(repair.id),
    order_number: repair.order_number,
    title: repair.title ?? repairStatusLabels[repair.status as RepairStatus] ?? repair.order_number,
    status: repair.status,
    completed_at:
      repair.status === 'done' || repair.status === 'completed' ? repair.updated_at : null,
    updated_at: repair.updated_at,
    mileage: repair.mileage ?? null,
    total: repair.total,
    work_items: repair.work_items,
  };
}

/** Prefer richer fields from vehicle card when search history is thin. */
function mergeVehicleHistory(
  fromSearch: VehicleRepairHistory[],
  fromCard: VehicleRepairHistory[],
): VehicleRepairHistory[] {
  if (fromSearch.length === 0) {
    return fromCard;
  }

  if (fromCard.length === 0) {
    return fromSearch;
  }

  const cardById = new Map(fromCard.map((item) => [String(item.id), item]));
  const merged = fromSearch.map((item) => {
    const fromCardItem = cardById.get(String(item.id));

    if (!fromCardItem) {
      return item;
    }

    const searchWorks = item.work_items ?? [];
    const cardWorks = fromCardItem.work_items ?? [];

    return {
      ...item,
      mileage: item.mileage ?? fromCardItem.mileage ?? null,
      total: item.total ?? fromCardItem.total ?? null,
      title: item.title ?? fromCardItem.title,
      work_items: searchWorks.length > 0 ? searchWorks : cardWorks,
    };
  });

  const searchIds = new Set(fromSearch.map((item) => String(item.id)));

  for (const cardItem of fromCard) {
    if (!searchIds.has(String(cardItem.id))) {
      merged.push(cardItem);
    }
  }

  return merged;
}

function mapVehicleCardToSearchResult(
  card: VehicleCard,
  fallback?: VehicleSearchResult | null,
): VehicleSearchResult {
  const fromSearch = fallback?.previous_repairs ?? [];
  const fromCard = (card.repairs ?? []).map(mapRepairSummaryToHistory);

  return {
    id: String(card.id),
    client_name: card.client.name,
    client_phone: card.client.phone,
    client_email: card.client.email,
    car_model: card.car_model,
    license_plate: card.license_plate,
    vin: card.vin ?? null,
    chassis_number: card.chassis_number ?? null,
    mileage: card.mileage,
    last_completed_mileage: card.last_completed_mileage ?? null,
    previous_repairs: mergeVehicleHistory(fromSearch, fromCard),
  };
}

function hasVehicleId(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function assertMileageAllowed(
  mileage: number | undefined,
  vehicle: VehicleSearchResult | null,
  setError: UseFormSetError<RepairCreateFormValues>,
): boolean {
  if (typeof mileage !== 'number') {
    return true;
  }

  const minMileage = vehicle ? resolveMinAllowedMileage(vehicle) : null;

  if (minMileage == null || mileage >= minMileage) {
    return true;
  }

  setError('mileage', {
    type: 'manual',
    message: `Пробег не может быть меньше ${formatMileageKm(minMileage)} (последний выданный заказ)`,
  });
  toast.error(`Пробег не может быть меньше ${formatMileageKm(minMileage)} после статуса «Выдан»`, {
    position: 'top-right',
    transition: Bounce,
  });
  return false;
}

export function RepairCreateProvider({ children }: RepairCreateProviderProps) {
  const navigate = useNavigate();
  const [isVehicleSearchLoading, setIsVehicleSearchLoading] = useState(false);
  const [vehicleSuggestions, setVehicleSuggestions] = useState<VehicleSearchResult[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSearchResult | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const vehicleSelectRequestIdRef = useRef(0);

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
    getFieldState,
    getValues,
    handleSubmit,
    reset,
    setError,
    setFocus,
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
    const requestId = ++vehicleSelectRequestIdRef.current;

    try {
      setIsVehicleSearchLoading(true);
      const card = await getVehicle(vehicle.id).unwrap();

      if (requestId !== vehicleSelectRequestIdRef.current) {
        return;
      }

      setSelectedVehicle(mapVehicleCardToSearchResult(card, vehicle));
      setIsManualMode(false);
      reset({
        ...getValues(),
        ...mapVehicleCardToFormValues(card),
        vehicleSearch: vehicleSearch ?? '',
        status: getValues('status') || 'new',
        clientPersonalDataConsent: true,
      });
      clearErrors([
        'clientName',
        'clientPhone',
        'clientEmail',
        'carModel',
        'licensePlate',
        'vin',
        'chassisNumber',
        'mileage',
        'clientPersonalDataConsent',
      ]);
      setCurrentStep(2);
    } catch (error) {
      if (requestId !== vehicleSelectRequestIdRef.current) {
        return;
      }

      toast.error(getErrorMessage(error, 'Не удалось загрузить карточку автомобиля'), {
        position: 'top-right',
        transition: Bounce,
      });
    } finally {
      if (requestId === vehicleSelectRequestIdRef.current) {
        setIsVehicleSearchLoading(false);
      }
    }
  };

  const applyVehicleById = async (id: string) => {
    await applyVehicleSuggestion({
      id,
      client_name: '',
      car_model: '',
      license_plate: '',
      previous_repairs: [],
    });
  };

  const startManualVehicleEntry = () => {
    vehicleSelectRequestIdRef.current += 1;
    setIsVehicleSearchLoading(false);
    setIsManualMode(true);
    setSelectedVehicle(null);
    setVehicleSuggestions([]);
    reset({ ...initialValues });
    setCurrentStep(1);
  };

  const createClientAndContinue = async () => {
    const values = getValues();

    if (values.clientId && values.vehicleId) {
      await continueToRepairStep();
      return;
    }

    const isValid = await trigger([...clientStepFields], { shouldFocus: true });

    if (!isValid) {
      reportClientStepValidationErrors(getFieldState, setFocus);
      return;
    }

    if (!assertMileageAllowed(values.mileage, selectedVehicle, setError)) {
      focusClientStepFieldError(getFieldState, setFocus);
      return;
    }

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

      setValue('clientId', String(result.client.id));
      setValue('vehicleId', String(result.vehicle.id));
      setSelectedVehicle({
        id: String(result.vehicle.id),
        client_name: result.client.name,
        client_phone: result.client.phone,
        client_email: result.client.email,
        car_model: result.vehicle.car_model,
        license_plate: result.vehicle.license_plate,
        vin: result.vehicle.vin ?? null,
        chassis_number: result.vehicle.chassis_number ?? null,
        mileage: result.vehicle.mileage,
        previous_repairs: [],
      });
      setValue('licensePlate', formatRuLicensePlateMaskedInput(result.vehicle.license_plate));
      setIsManualMode(false);
      setCurrentStep(2);
      toast.success('Клиент и автомобиль созданы', {
        position: 'top-right',
        transition: Bounce,
      });
    } catch (error) {
      applyApiFieldErrors(error, setError);
      focusClientStepFieldError(getFieldState, setFocus);
      toast.error(getErrorMessage(error, 'Не удалось создать клиента'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  const continueToRepairStep = async () => {
    const isValid = await trigger([...clientStepFields], { shouldFocus: true });

    if (!isValid) {
      reportClientStepValidationErrors(getFieldState, setFocus);
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

    if (!assertMileageAllowed(values.mileage, selectedVehicle, setError)) {
      focusClientStepFieldError(getFieldState, setFocus);
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
              license_plate: formatRuLicensePlateInput(values.licensePlate),
              vin: formatVinInput(values.vin) || null,
              chassis_number: formatChassisNumberInput(values.chassisNumber) || null,
              mileage: values.mileage ?? null,
            },
          }).unwrap(),
        ]);
      }

      setCurrentStep(2);
    } catch (error) {
      applyApiFieldErrors(error, setError);
      focusClientStepFieldError(getFieldState, setFocus);
      toast.error(getErrorMessage(error, 'Не удалось сохранить данные клиента'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  const onSubmit = async (values: RepairCreateFormValues) => {
    const vehicleIdValue = values.vehicleId?.trim() ?? '';
    const clientIdValue = values.clientId?.trim() ?? '';

    if (!hasVehicleId(vehicleIdValue)) {
      toast.warning('Нужен автомобиль: выберите из поиска или создайте клиента', {
        position: 'top-right',
        transition: Bounce,
      });
      setCurrentStep(1);
      return;
    }

    if (!assertMileageAllowed(values.mileage, selectedVehicle, setError)) {
      setCurrentStep(1);
      return;
    }

    try {
      const created = await createRepair({
        vehicle_id: vehicleIdValue,
        client_id: clientIdValue || undefined,
        status: 'new',
        planned_ready_at: values.plannedReadyAt?.format('YYYY-MM-DD') ?? null,
        mileage: values.mileage ?? null,
        total:
          (values.workItems ?? []).reduce(
            (sum, workItem) => sum + (typeof workItem.price === 'number' ? workItem.price : 0),
            0,
          ) +
          (values.orderedParts ?? []).reduce(
            (sum, part) =>
              sum + (typeof part.price === 'number' ? part.price * (part.quantity ?? 1) : 0),
            0,
          ),
        comment: values.comment || null,
        work_items: (values.workItems ?? [])
          .filter((workItem) => workItem.title)
          .map((workItem) => ({
            title: workItem.title ?? '',
            master_id: workItem.masterId?.trim() || null,
            price: typeof workItem.price === 'number' ? workItem.price : null,
            hours: typeof workItem.hours === 'number' ? workItem.hours : null,
            is_extra: Boolean(workItem.isExtra),
          })),
        ordered_parts: (values.orderedParts ?? [])
          .filter((part) => part.name)
          .map((part) => ({
            name: part.name ?? '',
            quantity: part.quantity ?? 1,
            price: typeof part.price === 'number' ? part.price : null,
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

  const onInvalidSubmit = (formErrors: typeof errors) => {
    reportCreateFormValidationErrors(formErrors, getFieldState, setFocus, setCurrentStep);
  };

  const handleStepChange = async (step: number) => {
    if (step === 1 && !selectedVehicle && !isManualMode) {
      toast.warning('Введите гос.номер или VIN-номер автомобиля', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    if (step === 2) {
      if (!hasVehicleId(vehicleId) || !clientId) {
        toast.warning('Выберите автомобиль или создайте клиента', {
          position: 'top-right',
          transition: Bounce,
        });
        return;
      }

      // Авто из базы уже выбрано — шаг клиента не подтверждаем повторно
      if (selectedVehicle && !isManualMode) {
        setValue('clientPersonalDataConsent', true, { shouldValidate: false });
        setCurrentStep(2);
        return;
      }

      const isValid = await trigger([...clientStepFields], { shouldFocus: true });

      if (!isValid) {
        setCurrentStep(1);
        reportClientStepValidationErrors(getFieldState, setFocus);
        return;
      }
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
    clearErrors,
    reset,
    isVehicleSearchLoading,
    setIsVehicleSearchLoading,
    applyVehicleSuggestion,
    applyVehicleById,
    startManualVehicleEntry,
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
    onInvalidSubmit,
    createClientAndContinue,
    continueToRepairStep,
    handleStepChange,
    handleSubmit,
  } satisfies RepairCreateContextValue;

  return <RepairCreateContext.Provider value={value}>{children}</RepairCreateContext.Provider>;
}
