import { searchMockVehicles } from '@/entities/vehicle';
import { Button, Card, Form, Input, Spin, Typography } from 'antd';
import clsx from 'clsx';
import { useEffect } from 'react';
import styles from './SearchVInNumber.module.scss';
import { useRepairCreateContext } from '@/features/repair-order/create';
import { initialValues } from '@/pages/RepairCreatePage/constants';
import { Controller } from 'react-hook-form';
import { SelectedCar } from '@/widgets/SelectedCar';

export const SearchVInNumber = () => {
  const {
    vehicleSearch,
    control,
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
  } = useRepairCreateContext();

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

  return (
    <Card className={clsx(styles.section, styles.searchSection)}>
      <Typography.Title className={styles.sectionTitle} level={3}>
        1. Найдите авто
      </Typography.Title>

      <Form.Item label="Введите гос номер или VIN. Если машина уже есть в базе, данные подтянутся автоматически.">
        <Controller
          control={control}
          name="vehicleSearch"
          render={({ field }) => (
            <Input
              {...field}
              onChange={(event) => {
                const value = event.target.value;
                field.onChange(value);
                setSelectedVehicle(null);
                setValue('vehicleId', undefined);
              }}
              placeholder="Введите гос номер или VIN"
              size="large"
            />
          )}
        />
      </Form.Item>

      {vehicleSearch && vehicleSearch.trim().length >= 2 && !selectedVehicle && (
        <div className={styles.vehicleResults}>
          {isVehicleSearchLoading ? (
            <div className={styles.vehicleLoading}>
              <Spin spinning={isVehicleSearchLoading} />
              <span>Ищем машину в базе...</span>
            </div>
          ) : vehicleSuggestions.length > 0 ? (
            vehicleSuggestions.map((vehicle) => (
              <button
                className={styles.vehicleResult}
                key={vehicle.id}
                type="button"
                onClick={() => applyVehicleSuggestion(vehicle)}
              >
                <span className={styles.vehicleResultPlate}>{vehicle.licensePlate}</span>
                <span>{vehicle.carModel}</span>
                <span>{vehicle.vin}</span>
                <span>{vehicle.clientName}</span>
              </button>
            ))
          ) : (
            <div className={styles.vehicleEmptyResult}>
              Машина не найдена. Можно заполнить данные вручную.
            </div>
          )}
        </div>
      )}

      {selectedVehicle && <SelectedCar />}

      {vehicleSuggestions.length === 0 && (
        <Button
          htmlType="button"
          size="large"
          onClick={() => {
            setIsManualMode(true);
            setSelectedVehicle(null);
            setValue('vehicleSearch', '');
            setVehicleSuggestions([]);
            reset(initialValues);
            setCurrentStep(1);
          }}
        >
          Машины нет в базе — заполнить вручную
        </Button>
      )}
    </Card>
  );
};
