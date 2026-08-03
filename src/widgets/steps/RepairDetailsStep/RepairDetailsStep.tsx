import { Button, Card, DatePicker, Form, Input, InputNumber, Select, Typography } from 'antd';
import clsx from 'clsx';
import { useState } from 'react';
import { Controller, useFieldArray, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { useRepairCreateContext } from '@/features/repair-order/create';
import { statusOptions } from '@/pages/RepairCreatePage/constants';
import { getAntdValidateStatus } from '@/shared/lib/antd';
import { ModalRepair } from '@/widgets/Modals/ModalRepair/ModalRepair';
import { RepairWorksList } from '@/widgets/RepairWorksList';

import styles from './RepairDetailsStep.module.scss';

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

  const [
    status,
    clientName,
    carModel,
    licensePlate,
    plannedReadyAt,
    total,
    watchedWorks,
    watchedParts,
  ] = useWatch({
    control,
    name: [
      'status',
      'clientName',
      'carModel',
      'licensePlate',
      'plannedReadyAt',
      'total',
      'workItems',
      'orderedParts',
    ],
  });

  const statusLabel = statusOptions.find((option) => option.value === status)?.label ?? 'Новый';
  const worksCount = watchedWorks?.filter((item) => item.title?.trim()).length ?? 0;
  const partsCount = watchedParts?.filter((item) => item.name?.trim()).length ?? 0;
  const carLabel = [carModel, licensePlate].filter(Boolean).join(', ') || 'Авто не указано';
  const totalLabel =
    typeof total === 'number'
      ? new Intl.NumberFormat('ru-RU', {
          style: 'currency',
          currency: 'RUB',
          maximumFractionDigits: 0,
        }).format(total)
      : null;

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
        <div className={styles.sectionHead}>
          <Typography.Title className={styles.sectionTitle} level={3}>
            Детали заказа
          </Typography.Title>
          <p className={styles.sectionHint}>Статус, срок, сумма и заметка мастера</p>
        </div>

        <div className={styles.detailsGrid}>
          <Form.Item
            help={errors.status?.message}
            label="Статус"
            validateStatus={getAntdValidateStatus(Boolean(errors.status))}
          >
            <Controller
              control={control}
              name="status"
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
                  className={styles.fullWidth}
                  format="DD.MM.YYYY"
                  placeholder="Необязательно"
                  size="large"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </Form.Item>

          <Form.Item label="Сумма">
            <Controller
              control={control}
              name="total"
              render={({ field }) => (
                <InputNumber
                  addonAfter="₽"
                  className={styles.fullWidth}
                  min={0}
                  placeholder="Необязательно"
                  size="large"
                  step={100}
                  value={field.value}
                  onChange={(value) =>
                    field.onChange(typeof value === 'number' ? value : undefined)
                  }
                />
              )}
            />
          </Form.Item>
        </div>

        <Form.Item label="Комментарий мастера">
          <Controller
            control={control}
            name="comment"
            render={({ field }) => (
              <Input.TextArea
                {...field}
                placeholder="Что важно не забыть по этому ремонту"
                rows={3}
                size="large"
              />
            )}
          />
        </Form.Item>
      </Card>

      <Card className={clsx(styles.section, styles.sectionWork)}>
        <div className={styles.sectionHead}>
          <Typography.Title className={styles.sectionTitle} level={3}>
            Работы
          </Typography.Title>
          <p className={styles.sectionHint}>Можно пропустить и заполнить после диагностики</p>
        </div>

        <RepairWorksList />

        {availableQuickWorkTemplates.length > 0 && (
          <div className={styles.quickTemplates}>
            {availableQuickWorkTemplates.map((template) => (
              <button
                className={styles.chip}
                key={template}
                type="button"
                onClick={() => workItems.append({ title: template })}
              >
                + {template}
              </button>
            ))}
          </div>
        )}

        {workItems.fields.length > 0 && (
          <div className={styles.list}>
            {workItems.fields.map((field, index) => (
              <div className={styles.listItem} key={field.id}>
                <Controller
                  control={control}
                  name={`workItems.${index}.title`}
                  render={({ field: workField }) => (
                    <Input
                      {...workField}
                      placeholder="Название работы"
                      size="large"
                      status={errors.workItems?.[index]?.title ? 'error' : undefined}
                    />
                  )}
                />
                <Button
                  danger
                  className={styles.removeButton}
                  htmlType="button"
                  type="text"
                  onClick={() => workItems.remove(index)}
                >
                  Удалить
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          className={styles.addButton}
          htmlType="button"
          size="large"
          type="dashed"
          onClick={() => workItems.append({ title: '' })}
        >
          Добавить работу
        </Button>
      </Card>

      <Card className={styles.section}>
        <div className={styles.sectionHead}>
          <Typography.Title className={styles.sectionTitle} level={3}>
            Запчасти
          </Typography.Title>
          <p className={styles.sectionHint}>На приёмке можно оставить пустым</p>
        </div>

        {orderedParts.fields.length > 0 && (
          <div className={styles.list}>
            {orderedParts.fields.map((field, index) => (
              <div className={clsx(styles.listItem, styles.listItemPart)} key={field.id}>
                <Controller
                  control={control}
                  name={`orderedParts.${index}.name`}
                  render={({ field: partField }) => (
                    <Input
                      {...partField}
                      placeholder="Название запчасти"
                      size="large"
                      status={errors.orderedParts?.[index]?.name ? 'error' : undefined}
                    />
                  )}
                />

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

                <Button
                  danger
                  className={styles.removeButton}
                  htmlType="button"
                  type="text"
                  onClick={() => orderedParts.remove(index)}
                >
                  Удалить
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          className={styles.addButton}
          htmlType="button"
          size="large"
          type="dashed"
          onClick={() => orderedParts.append({ name: '', quantity: 1 })}
        >
          Добавить запчасть
        </Button>
      </Card>

      <div className={styles.summary}>
        <div className={styles.summaryMain}>
          <span className={styles.summaryTitle}>К созданию</span>
          <span className={styles.summaryLine}>
            {[clientName || 'Клиент не указан', carLabel].join(' · ')}
          </span>
        </div>
        <div className={styles.summaryMeta}>
          <span>{statusLabel}</span>
          <span>{plannedReadyAt ? plannedReadyAt.format('DD.MM.YYYY') : 'Без даты выдачи'}</span>
          <span>{totalLabel ?? 'Сумма не указана'}</span>
          <span>
            {worksCount} раб. · {partsCount} запч.
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <Button htmlType="button" size="large" onClick={handleCloseForm}>
          Закрыть
        </Button>
        <div className={styles.actionsPrimary}>
          <Button htmlType="button" size="large" onClick={() => setCurrentStep(1)}>
            Назад
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
      </div>

      <ModalRepair open={openModal} setOpen={setOpenModal} />
    </>
  );
};
