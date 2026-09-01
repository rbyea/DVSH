import { Button, Card, Form, Input, Spin, Typography } from 'antd';
import { Controller } from 'react-hook-form';

import { useRepairCreateContext } from '@/features/repair-order/create';
import { SelectedCar } from '@/widgets/SelectedCar';

import styles from './SearchVInNumber.module.scss';

export const SearchVInNumber = () => {
  const {
    vehicleSearch,
    control,
    setSelectedVehicle,
    selectedVehicle,
    setValue,
    isVehicleSearchLoading,
    applyVehicleSuggestion,
    startManualVehicleEntry,
    vehicleSuggestions,
  } = useRepairCreateContext();

  return (
    <Card className={styles.section}>
      <Typography.Title className={styles.sectionTitle} level={3}>
        1. Найдите авто
      </Typography.Title>

      <Form.Item label="Госномер или VIN — ищем по всем СТО в Автовидно. Если машина уже есть, данные подтянутся.">
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
                setValue('vehicleId', '');
                setValue('clientId', '');
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
              <span>Ищем машину в общей базе...</span>
            </div>
          ) : vehicleSuggestions.length > 0 ? (
            vehicleSuggestions.map((vehicle) => (
              <button
                className={styles.vehicleResult}
                key={vehicle.id}
                type="button"
                onClick={() => {
                  void applyVehicleSuggestion(vehicle);
                }}
              >
                <span className={styles.vehicleResultPlate}>{vehicle.license_plate}</span>
                <span>{vehicle.car_model}</span>
                <span>{vehicle.vin?.trim() || vehicle.chassis_number?.trim() || '—'}</span>
                <span>
                  {vehicle.client_name}
                  {vehicle.is_own_station === false ? (
                    <span className={styles.vehicleResultShared}> · общая база</span>
                  ) : null}
                </span>
              </button>
            ))
          ) : (
            <div className={styles.vehicleEmptyResult}>
              Машина не найдена. Можно заполнить данные вручную.
            </div>
          )}
        </div>
      )}

      {selectedVehicle ? <SelectedCar /> : null}

      <Button htmlType="button" size="large" onClick={startManualVehicleEntry}>
        Заполнить вручную
      </Button>
    </Card>
  );
};
