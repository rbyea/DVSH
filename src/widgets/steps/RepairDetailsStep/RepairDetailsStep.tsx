import type { VehicleSuggestion } from '@/entities/vehicle';
import type { RepairCreateFormValues, RepairCreateStatus } from '@/pages/repair-create/types';
import {
  AutoComplete,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Typography,
} from 'antd';
import {
  Controller,
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormSetValue,
} from 'react-hook-form';
import styles from './RepairDetailsStep.module.scss';
import { getAntdValidateStatus } from '@/shared/lib/antd';
import clsx from 'clsx';

interface RepairDetailsStepProps {
  isManualMode: boolean;
  errors: FieldErrors<RepairCreateFormValues>;
  control: Control<RepairCreateFormValues>;
  setSelectedVehicle: (value: VehicleSuggestion | null) => void;
  setValue: UseFormSetValue<RepairCreateFormValues>;
  applyVehicleSuggestion: (value: VehicleSuggestion) => void;
  licensePlateSuggestions: VehicleSuggestion[];
  vinSuggestions: VehicleSuggestion[];
  selectedVehicle: VehicleSuggestion | null;
  availableQuickWorkTemplates: string[];
  statusOptions: Array<{ label: string; value: RepairCreateStatus }>;
  setCurrentStep: (value: number) => void;
  isSubmitting: boolean;
  navigate: (value: string) => void;
}

const RepairDetailsStep = ({
  isManualMode,
  errors,
  control,
  setSelectedVehicle,
  setValue,
  applyVehicleSuggestion,
  licensePlateSuggestions,
  vinSuggestions,
  selectedVehicle,
  statusOptions,
  availableQuickWorkTemplates,
  setCurrentStep,
  isSubmitting,
  navigate,
}: RepairDetailsStepProps) => {
  const workItems = useFieldArray({
    control,
    name: 'workItems',
  });

  const orderedParts = useFieldArray({
    control,
    name: 'orderedParts',
  });
  return (
    <>
      {isManualMode && (
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
                render={({ field }) => (
                  <Input {...field} placeholder="+7 999 123-45-67" size="large" />
                )}
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
                render={({ field }) => (
                  <AutoComplete
                    options={licensePlateSuggestions.map((vehicle) => ({
                      label: `${vehicle.licensePlate} · ${vehicle.carModel} · ${vehicle.clientName}`,
                      value: vehicle.licensePlate,
                    }))}
                    placeholder="А123ВС 777"
                    value={field.value}
                    onChange={(value) => {
                      setSelectedVehicle(null);
                      setValue('vehicleId', undefined);
                      field.onChange(value);
                    }}
                    onSelect={(value) => {
                      const vehicle = licensePlateSuggestions.find(
                        (suggestion) => suggestion.licensePlate === value,
                      );

                      if (vehicle) {
                        applyVehicleSuggestion(vehicle);
                      }
                    }}
                  >
                    <Input size="large" />
                  </AutoComplete>
                )}
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
                render={({ field }) => (
                  <AutoComplete
                    options={vinSuggestions.map((vehicle) => ({
                      label: `${vehicle.vin} · ${vehicle.carModel} · ${vehicle.clientName}`,
                      value: vehicle.vin,
                    }))}
                    placeholder="17 символов VIN"
                    value={field.value}
                    onChange={(value) => {
                      setSelectedVehicle(null);
                      setValue('vehicleId', undefined);
                      field.onChange(value);
                    }}
                    onSelect={(value) => {
                      const vehicle = vinSuggestions.find((suggestion) => suggestion.vin === value);

                      if (vehicle) {
                        applyVehicleSuggestion(vehicle);
                      }
                    }}
                  >
                    <Input size="large" />
                  </AutoComplete>
                )}
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

            {selectedVehicle && (
              <div className={styles.existingVehicle}>
                <Typography.Text strong>
                  Машина найдена в базе (можно найти другие машины и выбрать)
                </Typography.Text>
                <Typography.Paragraph className={styles.existingVehicleText}>
                  Новый ремонт будет добавлен к существующей карточке автомобиля, а не создаст
                  новую.
                </Typography.Paragraph>

                <div className={styles.historyList}>
                  {selectedVehicle.previousRepairs.map((repair) => (
                    <div className={styles.historyItem} key={repair.orderNumber}>
                      <span>{repair.orderNumber}</span>
                      <span>{repair.title}</span>
                      <span>{repair.completedAt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      <Card className={styles.section}>
        <Typography.Title className={styles.sectionTitle} level={3}>
          Статус
        </Typography.Title>

        <Form.Item
          help={errors.status?.message}
          label="Текущий статус"
          validateStatus={getAntdValidateStatus(Boolean(errors.status))}
        >
          <Controller
            control={control}
            name="status"
            rules={{ required: 'Выберите статус' }}
            render={({ field }) => (
              <Select
                options={statusOptions}
                size="large"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Form.Item>

        <Form.Item label="Плановая дата выдачи">
          <Controller
            control={control}
            name="plannedReadyAt"
            render={({ field }) => (
              <DatePicker
                format="DD.MM.YYYY"
                size="large"
                placeholder="ДД.ММ.ГГГГ"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Form.Item>
      </Card>

      <Card className={clsx(styles.section, styles.sectionWork)}>
        <Typography.Title className={styles.sectionTitle} level={3}>
          Список работ
        </Typography.Title>
        <p className={styles.sectionHint}>
          Можно пропустить и заполнить после диагностики. Частые работы добавляются в один клик.
        </p>

        <div className={styles.quickTemplates}>
          {availableQuickWorkTemplates.map((template) => (
            <Button
              htmlType="button"
              key={template}
              onClick={() => workItems.append({ title: template })}
            >
              {template}
            </Button>
          ))}
        </div>

        {workItems.fields.map((field, index) => (
          <div className={styles.listItem} key={field.id}>
            <Form.Item
              help={errors.workItems?.[index]?.title?.message}
              label="Работа"
              validateStatus={getAntdValidateStatus(Boolean(errors.workItems?.[index]?.title))}
            >
              <Controller
                control={control}
                name={`workItems.${index}.title`}
                render={({ field: workField }) => (
                  <Input {...workField} placeholder="Например, замена масла" size="large" />
                )}
              />
            </Form.Item>

            <Button danger htmlType="button" size="large" onClick={() => workItems.remove(index)}>
              Удалить
            </Button>
          </div>
        ))}

        <Button
          block
          htmlType="button"
          size="large"
          onClick={() => workItems.append({ title: '' })}
        >
          Добавить работу
        </Button>
      </Card>

      <Card className={styles.section}>
        <Typography.Title className={styles.sectionTitle} level={3}>
          Заказанные комплектующие
        </Typography.Title>
        <p className={styles.sectionHint}>
          Заполняйте, если запчасти уже понятны. На приёмке можно оставить пустым.
        </p>

        {orderedParts.fields.map((field, index) => (
          <div className={styles.listItem} key={field.id}>
            <Form.Item
              help={errors.orderedParts?.[index]?.name?.message}
              label="Комплектующая"
              validateStatus={getAntdValidateStatus(Boolean(errors.orderedParts?.[index]?.name))}
            >
              <Controller
                control={control}
                name={`orderedParts.${index}.name`}
                render={({ field: partField }) => (
                  <Input {...partField} placeholder="Например, масляный фильтр" size="large" />
                )}
              />
            </Form.Item>

            <Form.Item label="Кол-во">
              <Controller
                control={control}
                name={`orderedParts.${index}.quantity`}
                render={({ field: quantityField }) => (
                  <InputNumber
                    className={styles.numberInput}
                    min={1}
                    size="large"
                    value={quantityField.value}
                    onChange={(value) => quantityField.onChange(value ?? 1)}
                  />
                )}
              />
            </Form.Item>

            <Button
              danger
              htmlType="button"
              size="large"
              onClick={() => orderedParts.remove(index)}
            >
              Удалить
            </Button>
          </div>
        ))}

        <Button
          block
          htmlType="button"
          size="large"
          onClick={() => orderedParts.append({ name: '', quantity: 1 })}
        >
          Добавить комплектующую
        </Button>
      </Card>

      <Card className={styles.section}>
        <Typography.Title className={styles.sectionTitle} level={3}>
          Комментарий
        </Typography.Title>

        <Form.Item label="Комментарий мастера">
          <Controller
            control={control}
            name="comment"
            render={({ field }) => (
              <Input.TextArea
                {...field}
                placeholder="Что важно не забыть по этому ремонту"
                rows={4}
                size="large"
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
          disabled={!selectedVehicle && !isManualMode}
          htmlType="submit"
          loading={isSubmitting}
          size="large"
          type="primary"
        >
          Создать ремонт
        </Button>
      </div>
    </>
  );
};
export default RepairDetailsStep;
