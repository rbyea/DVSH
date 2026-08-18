import { Steps } from 'antd';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useRepairCreateContext } from '@/features/repair-order/create';
import { AppInfo } from '@/widgets/AppInfo';
import { SelectedCar } from '@/widgets/SelectedCar';
import { RepairDetailsClientStep } from '@/widgets/steps/RepairDetailsClientStep';
import { RepairDetailsStep } from '@/widgets/steps/RepairDetailsStep';
import { SearchVInNumber } from '@/widgets/steps/SearchVInNumber';

import styles from './RepairCreatePage.module.scss';

export const RepairCreatePage = () => {
  const [searchParams] = useSearchParams();
  const vehicleIdFromUrl = searchParams.get('vehicleId');
  const appliedVehicleRef = useRef<string | null>(null);

  const {
    currentStep,
    handleStepChange,
    handleSubmit,
    onSubmit,
    onInvalidSubmit,
    selectedVehicle,
    applyVehicleById,
  } = useRepairCreateContext();

  useEffect(() => {
    if (!vehicleIdFromUrl || appliedVehicleRef.current === vehicleIdFromUrl) {
      return;
    }

    appliedVehicleRef.current = vehicleIdFromUrl;
    void applyVehicleById(vehicleIdFromUrl);
  }, [applyVehicleById, vehicleIdFromUrl]);

  useEffect(() => {
    if (currentStep !== 2) {
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  return (
    <div className={styles.page}>
      <AppInfo
        eyebrow="Приёмка"
        title="Создание ремонта"
        subtitle="Три коротких шага: найти авто, проверить клиента и оформить заказ-наряд."
      />

      <div className={styles.stepsWrap}>
        <Steps
          current={currentStep}
          onChange={(step) => {
            void handleStepChange(step);
          }}
          items={[{ title: 'Проверка авто' }, { title: 'Клиент' }, { title: 'Ремонт' }]}
        />
      </div>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}>
        {currentStep === 0 && <SearchVInNumber />}

        {currentStep === 1 && <RepairDetailsClientStep />}

        {currentStep === 2 && (
          <>
            {selectedVehicle ? <SelectedCar /> : null}
            <RepairDetailsStep />
          </>
        )}
      </form>
    </div>
  );
};
