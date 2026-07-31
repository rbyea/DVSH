import { useRepairCreateContext } from '@/features/repair-order/create';
import { getAntdValidateStatus } from '@/shared/lib/antd';
import { Button, Card, Form, Input, InputNumber, Typography } from 'antd';
import { Controller } from 'react-hook-form';
import styles from './RepairDetailsClientStep.module.scss';
import { useNavigate } from 'react-router-dom';
export const RepairDetailsClientStep = () => {
  const navigate = useNavigate();
  const { errors, control, setCurrentStep, isSubmitting, isManualMode } = useRepairCreateContext();

  return (
    <>
      <Card className={styles.section}>
        <Typography.Title className={styles.sectionTitle} level={3}>
          Клиент
        </Typography.Title>

        <Form.Item
          help={errors.clientName?.message}
          label="Имя клиента"
          validateStatus={getAntdValidateStatus(Boolean(errors.clientName))}
        >
          <Controller
            control={control}
            name="clientName"
            rules={{ required: 'Введите имя клиента' }}
            render={({ field }) => (
              <Input {...field} placeholder="Например, Иван Петров" size="large" />
            )}
          />
        </Form.Item>

        <Form.Item label="Телефон">
          <Controller
            control={control}
            name="clientPhone"
            render={({ field }) => <Input {...field} placeholder="+7 999 123-45-67" size="large" />}
          />
        </Form.Item>

        <Form.Item
          help={errors.clientEmail?.message}
          label="Почта"
          validateStatus={getAntdValidateStatus(Boolean(errors.clientEmail))}
        >
          <Controller
            control={control}
            name="clientEmail"
            rules={{
              pattern: {
                value: /^\S+@\S+\.\S+$/,
                message: 'Введите корректную почту',
              },
            }}
            render={({ field }) => (
              <Input {...field} placeholder="client@example.com" size="large" />
            )}
          />
        </Form.Item>
      </Card>

      <Card className={styles.section}>
        <Typography.Title className={styles.sectionTitle} level={3}>
          Автомобиль
        </Typography.Title>

        <Form.Item
          help={errors.carModel?.message}
          label="Модель машины"
          validateStatus={getAntdValidateStatus(Boolean(errors.carModel))}
        >
          <Controller
            control={control}
            name="carModel"
            rules={{ required: 'Введите модель машины' }}
            render={({ field }) => (
              <Input {...field} placeholder="Например, Toyota Camry" size="large" />
            )}
          />
        </Form.Item>

        <Form.Item
          help={errors.licensePlate?.message}
          label="Гос номер"
          validateStatus={getAntdValidateStatus(Boolean(errors.licensePlate))}
        >
          <Controller
            control={control}
            name="licensePlate"
            rules={{ required: 'Введите гос номер' }}
            render={({ field }) => <Input {...field} placeholder="А123ВС 777" size="large" />}
          />
        </Form.Item>

        <Form.Item
          help={errors.vin?.message}
          label="VIN номер"
          validateStatus={getAntdValidateStatus(Boolean(errors.vin))}
        >
          <Controller
            control={control}
            name="vin"
            rules={{ required: 'Введите VIN номер' }}
            render={({ field }) => <Input {...field} placeholder="17 символов VIN" size="large" />}
          />
        </Form.Item>

        <Form.Item label="Пробег, км">
          <Controller
            control={control}
            name="mileage"
            render={({ field }) => (
              <InputNumber
                className={styles.numberInput}
                min={0}
                placeholder="85000"
                size="large"
                value={field.value}
                onChange={(value) => field.onChange(value ?? undefined)}
              />
            )}
          />
        </Form.Item>
      </Card>

      <div className={styles.actions}>
        <Button htmlType="button" size="large" onClick={() => setCurrentStep(0)}>
          Назад к проверке авто
        </Button>
        <Button htmlType="button" size="large" onClick={() => navigate('/dashboard')}>
          Отмена
        </Button>
        <Button
          disabled={!isManualMode}
          htmlType="submit"
          loading={isSubmitting}
          size="large"
          type="primary"
        >
          Создать клиента
        </Button>
      </div>
    </>
  );
};
