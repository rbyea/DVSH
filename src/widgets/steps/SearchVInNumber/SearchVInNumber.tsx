import { searchMockVehicles, type VehicleSuggestion } from '@/entities/vehicle';
import { Button, Card, Input, Spin, Typography } from 'antd';
import clsx from 'clsx';
import { useEffect } from 'react';
import styles from './SearchVInNumber.module.scss';
import type { UseFormSetValue } from 'react-hook-form';
import type { RepairCreateFormValues } from '@/pages/repair-create/types';
import SelectedCar from '@/widgets/SelectedCar/SelectedCar';
import { useRepairCreateContext } from '@/features/repair-order/create';

interface SearchVInNumberProps {
  setVehicleSearch: (value: string) => void;
  setVehicleSuggestions: (value: VehicleSuggestion[]) => void;
  isVehicleSearchLoading: boolean;
  applyVehicleSuggestion: (value: VehicleSuggestion) => void;
  setSelectedVehicle: (value: VehicleSuggestion | null) => void;
  selectedVehicle: VehicleSuggestion | null;
  setCurrentStep: (value: number) => void;
  setValue: UseFormSetValue<RepairCreateFormValues>;
  vehicleSuggestions: VehicleSuggestion[];
  setIsManualMode: (value: boolean) => void;
  setIsVehicleSearchLoading: (value: boolean) => void;
}

const SearchVInNumber = ({
  setVehicleSuggestions,
  setSelectedVehicle,
  selectedVehicle,
  setCurrentStep,
  setIsManualMode,
  setValue,
  isVehicleSearchLoading,
  setIsVehicleSearchLoading,
  applyVehicleSuggestion,
  vehicleSuggestions,
}: SearchVInNumberProps) => {
  const { vehicleSearch, setVehicleSearch } = useRepairCreateContext();

  // console.log("vehicleSearch", vehicleSearch);

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

  return (
    <Card className={clsx(styles.section, styles.searchSection)}>
      <Typography.Title className={styles.sectionTitle} level={3}>
        1. Найдите авто
      </Typography.Title>
      <p className={styles.sectionHint}>
        Введите гос номер или VIN. Если машина уже есть в базе, данные подтянутся автоматически.
      </p>

      <Input
        placeholder="Например, А123ВС 777 или JTNB..."
        size="large"
        value={vehicleSearch}
        onChange={(event) => {
          setVehicleSearch(event.target.value);
          setSelectedVehicle(null);
          setValue('vehicleId', undefined);
        }}
      />

      {vehicleSearch.trim().length >= 2 && !selectedVehicle && (
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

      {selectedVehicle && <SelectedCar selectedVehicle={selectedVehicle} />}

      {vehicleSuggestions.length === 0 && (
        <Button
          htmlType="button"
          size="large"
          onClick={() => {
            setIsManualMode(true);
            setSelectedVehicle(null);
            setValue('vehicleId', undefined);
            setCurrentStep(1);
          }}
        >
          Машины нет в базе — заполнить вручную
        </Button>
      )}
    </Card>
  );
};

export default SearchVInNumber;
