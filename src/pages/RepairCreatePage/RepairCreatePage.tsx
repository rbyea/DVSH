import { Steps } from 'antd';

import { useRepairCreateContext } from '@/features/repair-order/create';
import { AppInfo } from '@/widgets/AppInfo';
import { SelectedCar } from '@/widgets/SelectedCar';
import { RepairDetailsClientStep } from '@/widgets/steps/RepairDetailsClientStep';
import { RepairDetailsStep } from '@/widgets/steps/RepairDetailsStep';
import { SearchVInNumber } from '@/widgets/steps/SearchVInNumber';

import styles from './RepairCreatePage.module.scss';

export const RepairCreatePage = () => {
  const { currentStep, handleStepChange, handleSubmit, onSubmit, selectedVehicle } =
    useRepairCreateContext();

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
          onChange={handleStepChange}
          items={[{ title: 'Проверка авто' }, { title: 'Клиент' }, { title: 'Ремонт' }]}
        />
      </div>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
        {currentStep === 0 && <SearchVInNumber />}

        {currentStep === 1 && <RepairDetailsClientStep />}

        {currentStep === 2 && (
          <>
            {selectedVehicle && <SelectedCar />}
            <RepairDetailsStep />
          </>
        )}
      </form>
    </div>
  );
};
