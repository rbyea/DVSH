import { Steps } from 'antd';
import { useRepairCreateContext } from '@/features/repair-order/create';
import styles from './RepairCreatePage.module.scss';
import { AppInfo } from '@/widgets/AppInfo';
import { SearchVInNumber } from '@/widgets/steps/SearchVInNumber';
import { RepairDetailsClientStep } from '@/widgets/steps/RepairDetailsClientStep';
import { SelectedCar } from '@/widgets/SelectedCar';
import { RepairDetailsStep } from '@/widgets/steps/RepairDetailsStep';
export const RepairCreatePage = () => {
  const { currentStep, handleStepChange, handleSubmit, onSubmit, selectedVehicle } =
    useRepairCreateContext();

  return (
    <>
      <AppInfo
        title="Создание ремонта"
        subtitle="Заполните основные данные. Обязательные поля отмечены звёздочкой."
      />

      <Steps
        className={styles.steps}
        current={currentStep}
        onChange={handleStepChange}
        items={[
          { title: 'Проверка авто' },
          { title: 'Создание клиента' },
          { title: 'Карточка ремонта' },
        ]}
      />

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
        {currentStep === 0 && <SearchVInNumber />}

        {currentStep === 1 && (
          <>
            <RepairDetailsClientStep />
          </>
        )}

        {currentStep === 2 && (
          <>
            {selectedVehicle && <SelectedCar />}

            <RepairDetailsStep />
          </>
        )}
      </form>
    </>
  );
};
