import { useEffect, useState } from 'react';
import { Steps } from 'antd';

import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { createMockRepairOrder } from '@/entities/repair-order';
import type { RepairCreatePayload } from '@/entities/repair-order';
import { searchMockVehicles } from '@/entities/vehicle';
import type { VehicleSuggestion } from '@/entities/vehicle';
import { RepairCreateProvider } from '@/features/repair-order/create';
import styles from './RepairCreatePage.module.scss';
import type { RepairCreateFormValues } from './types';
import { initialValues, quickWorkTemplates, statusOptions } from './constants';
import AppInfo from '@/widgets/app-info/ui/AppInfo';
import SearchVInNumber from '@/widgets/steps/SearchVInNumber/SearchVInNumber';
import RepairDetailsStep from '@/widgets/steps/RepairDetailsStep/RepairDetailsStep';
import { Bounce, toast } from 'react-toastify';
import SelectedCar from '@/widgets/SelectedCar/SelectedCar';

function mapVehicleToFormValues(vehicle: VehicleSuggestion) {
  return {
    vehicleId: vehicle.id,
    clientName: vehicle.clientName,
    clientPhone: vehicle.clientPhone,
    clientEmail: vehicle.clientEmail,
    carModel: vehicle.carModel,
    licensePlate: vehicle.licensePlate,
    vin: vehicle.vin,
    mileage: vehicle.mileage,
  } satisfies Partial<RepairCreateFormValues>;
}

export function RepairCreatePage() {
  const navigate = useNavigate();
  const {
    clearErrors,
    control,
    getValues,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RepairCreateFormValues>({
    defaultValues: initialValues,
  });

  const [licensePlate, vin, selectedWorkItems] = useWatch({
    control,
    name: ['licensePlate', 'vin', 'workItems'],
  });

  const [licensePlateSuggestions, setLicensePlateSuggestions] = useState<VehicleSuggestion[]>([]);
  const [vinSuggestions, setVinSuggestions] = useState<VehicleSuggestion[]>([]);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleSuggestions, setVehicleSuggestions] = useState<VehicleSuggestion[]>([]);
  const [isVehicleSearchLoading, setIsVehicleSearchLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSuggestion | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

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
    const searchQuery = vehicleSearch.trim();

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
    setVehicleSearch(`${vehicle.licensePlate} · ${vehicle.vin}`);
    reset({
      ...getValues(),
      ...mapVehicleToFormValues(vehicle),
    });
    clearErrors(['clientName', 'carModel', 'licensePlate', 'vin']);
    setCurrentStep(1);
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
      toast.warning('Выберите автомобиль из списка или введите вручную', {
        position: 'top-right',
        transition: Bounce,
      });

      return;
    }

    setCurrentStep(step);
  };

  return (
    <RepairCreateProvider>
      <AppInfo
        title="Создание ремонта"
        subtitle="Заполните основные данные. Обязательные поля отмечены звёздочкой."
      />

      <Steps
        className={styles.steps}
        current={currentStep}
        onChange={handleStepChange}
        items={[{ title: 'Проверка авто' }, { title: 'Ремонт' }]}
      />

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
        {currentStep === 0 && (
          <SearchVInNumber
            setVehicleSearch={setVehicleSearch}
            setVehicleSuggestions={setVehicleSuggestions}
            isVehicleSearchLoading={isVehicleSearchLoading}
            setIsVehicleSearchLoading={setIsVehicleSearchLoading}
            applyVehicleSuggestion={applyVehicleSuggestion}
            selectedVehicle={selectedVehicle}
            setSelectedVehicle={setSelectedVehicle}
            setCurrentStep={setCurrentStep}
            setValue={setValue}
            vehicleSuggestions={vehicleSuggestions}
            setIsManualMode={setIsManualMode}
          />
        )}

        {currentStep === 1 && (
          <>
            {selectedVehicle && <SelectedCar selectedVehicle={selectedVehicle} />}

            <RepairDetailsStep
              isManualMode={isManualMode}
              errors={errors}
              control={control}
              setSelectedVehicle={setSelectedVehicle}
              setValue={setValue}
              isSubmitting={isSubmitting}
              applyVehicleSuggestion={applyVehicleSuggestion}
              licensePlateSuggestions={licensePlateSuggestions}
              vinSuggestions={vinSuggestions}
              selectedVehicle={selectedVehicle}
              availableQuickWorkTemplates={availableQuickWorkTemplates}
              statusOptions={statusOptions}
              setCurrentStep={setCurrentStep}
              navigate={navigate}
            />
          </>
        )}
      </form>
    </RepairCreateProvider>
  );
}
