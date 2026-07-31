import { Button, Card, DatePicker, Form, Input, InputNumber, Select, Typography } from 'antd';
import { Controller, useFieldArray } from 'react-hook-form';
import styles from './RepairDetailsStep.module.scss';
import { getAntdValidateStatus } from '@/shared/lib/antd';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useRepairCreateContext } from '@/features/repair-order/create';
import { statusOptions } from '@/pages/RepairCreatePage/constants';
import { RepairWorksList } from '@/widgets/RepairWorksList';
import { useState } from 'react';
import { ModalRepair } from '@/widgets/Modals/ModalRepair/ModalRepair';

export const RepairDetailsStep = () => {
  const navigate = useNavigate();
  const [openModal, setOpenModal] = useState(false);

  const {
    isManualMode,
    errors,
    control,
    selectedVehicle,
    availableQuickWorkTemplates,
    setCurrentStep,
    isSubmitting,
    isDirty,
  } = useRepairCreateContext();

  const workItems = useFieldArray({
    control,
    name: 'workItems',
  });

  const orderedParts = useFieldArray({
    control,
    name: 'orderedParts',
  });

  console.log('isDirty', isDirty);

  const handleCloseForm = () => {
    if (isDirty) {
      setOpenModal(true);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <>
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

        {selectedVehicle && <RepairWorksList />}

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
        <Button htmlType="button" size="large" onClick={() => handleCloseForm()}>
          Закрыть
        </Button>
        <Button htmlType="button" size="large" onClick={() => setCurrentStep(1)}>
          Назад к редактированию клиента
        </Button>
        <Button
          disabled={!selectedVehicle && !isManualMode}
          htmlType="submit"
          loading={isSubmitting}
          size="large"
          type="primary"
        >
          Сохранить
        </Button>
      </div>

      <ModalRepair open={openModal} setOpen={setOpenModal} />
    </>
  );
};
