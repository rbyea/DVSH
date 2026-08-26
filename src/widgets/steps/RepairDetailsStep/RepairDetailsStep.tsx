import { Button, Card, DatePicker, Form, Input, InputNumber, Select, Typography } from 'antd';
import clsx from 'clsx';
import { useState, type KeyboardEvent } from 'react';
import { Controller, useFieldArray, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { useGetMastersQuery } from '@/entities/master';
import { getRepairCostBreakdown, WorkTitleAutoComplete } from '@/entities/repair-order';
import { useRepairCreateContext } from '@/features/repair-order/create';
import { disablePastDates } from '@/shared/lib/date';
import { ModalRepair } from '@/widgets/Modals/ModalRepair/ModalRepair';
import { RepairWorksList } from '@/widgets/RepairWorksList';

import styles from './RepairDetailsStep.module.scss';

export const RepairDetailsStep = () => {
  const navigate = useNavigate();
  const [openModal, setOpenModal] = useState(false);

  const {
    errors,
    control,
    availableQuickWorkTemplates,
    setValue,
    setCurrentStep,
    isSubmitting,
    isDirty,
    selectedVehicle,
  } = useRepairCreateContext();

  const { data: masters = [] } = useGetMastersQuery();
  const masterOptions = masters
    .filter((master) => master.is_active)
    .map((master) => ({
      value: master.id,
      label: `${master.full_name} · ${master.specialty}`,
    }));

  const workItems = useFieldArray({
    control,
    name: 'workItems',
  });

  const orderedParts = useFieldArray({
    control,
    name: 'orderedParts',
  });

  const [
    clientName,
    carModel,
    licensePlate,
    plannedReadyAt,
    watchedWorks,
    watchedParts,
    vehicleId,
  ] = useWatch({
    control,
    name: [
      'clientName',
      'carModel',
      'licensePlate',
      'plannedReadyAt',
      'workItems',
      'orderedParts',
      'vehicleId',
    ],
  });

  const worksCount =
    watchedWorks?.filter((item) => item.title?.trim() && !item.isExtra).length ?? 0;
  const extraWorksCount =
    watchedWorks?.filter((item) => item.title?.trim() && item.isExtra).length ?? 0;
  const partsCount = watchedParts?.filter((item) => item.name?.trim()).length ?? 0;
  const carLabel = [carModel, licensePlate].filter(Boolean).join(', ') || 'Авто не указано';
  const costBreakdown = getRepairCostBreakdown({
    workItems: watchedWorks?.map((item) => ({
      price: item.price,
      isExtra: item.isExtra,
    })),
    orderedParts: watchedParts?.map((part) => ({
      quantity: part.quantity ?? 1,
      price: part.price,
    })),
  });
  const formatMoney = (value: number) =>
    new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(value);
  const totalLabel = formatMoney(
    costBreakdown.worksTotal + costBreakdown.extraWorksTotal + costBreakdown.partsTotal,
  );

  const handleCloseForm = () => {
    if (isDirty) {
      setOpenModal(true);
    } else {
      navigate('/dashboard');
    }
  };

  const handleWorkTitleEnter = (index: number, isExtra: boolean) => {
    const title = watchedWorks?.[index]?.title?.trim() ?? '';

    if (!title) {
      return;
    }

    const sameGroupIndexes = (watchedWorks ?? [])
      .map((item, itemIndex) => ({ item, itemIndex }))
      .filter(({ item }) => Boolean(item.isExtra) === isExtra)
      .map(({ itemIndex }) => itemIndex);
    const isLastInGroup = sameGroupIndexes[sameGroupIndexes.length - 1] === index;

    if (isLastInGroup) {
      workItems.append({
        title: '',
        masterId: undefined,
        price: undefined,
        hours: undefined,
        isExtra,
      });
    }
  };

  const appendWorkItem = (isExtra: boolean, title = '') => {
    workItems.append({
      title,
      masterId: undefined,
      price: undefined,
      hours: undefined,
      isExtra,
    });
  };

  const renderWorkRow = (fieldId: string, index: number, isExtra: boolean) => (
    <div className={styles.listItemWork} key={fieldId}>
      <Controller
        control={control}
        name={`workItems.${index}.title`}
        render={({ field: workField }) => (
          <WorkTitleAutoComplete
            className={styles.workTitleInput}
            placeholder={isExtra ? 'Название доп. работы' : 'Название работы'}
            size="large"
            status={errors.workItems?.[index]?.title ? 'error' : undefined}
            value={workField.value ?? ''}
            onBlur={workField.onBlur}
            onChange={workField.onChange}
            onSelectSuggestion={(suggestion) => {
              workField.onChange(suggestion.title);
              setValue(`workItems.${index}.masterId`, suggestion.master_id ?? undefined, {
                shouldDirty: true,
              });
              setValue(
                `workItems.${index}.hours`,
                typeof suggestion.hours === 'number' ? suggestion.hours : undefined,
                { shouldDirty: true },
              );
              setValue(
                `workItems.${index}.price`,
                typeof suggestion.price === 'number' ? suggestion.price : undefined,
                { shouldDirty: true },
              );
            }}
            onPressEnter={() => handleWorkTitleEnter(index, isExtra)}
          />
        )}
      />
      <Controller
        control={control}
        name={`workItems.${index}.masterId`}
        render={({ field: masterField }) => (
          <Select
            allowClear
            className={styles.masterSelect}
            options={masterOptions}
            placeholder="Мастер"
            size="large"
            value={masterField.value || undefined}
            onChange={(value) => masterField.onChange(value ?? undefined)}
          />
        )}
      />
      <Controller
        control={control}
        name={`workItems.${index}.hours`}
        render={({ field: hoursField }) => (
          <InputNumber
            className={styles.workMetricInput}
            min={0}
            placeholder="Часы"
            size="large"
            step={0.5}
            value={hoursField.value}
            onChange={(value) => hoursField.onChange(typeof value === 'number' ? value : undefined)}
          />
        )}
      />
      <Controller
        control={control}
        name={`workItems.${index}.price`}
        render={({ field: priceField }) => (
          <InputNumber
            className={styles.workMetricInput}
            min={0}
            placeholder="Цена, ₽"
            size="large"
            step={100}
            value={priceField.value}
            onChange={(value) => priceField.onChange(typeof value === 'number' ? value : undefined)}
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
  );

  const handlePartNameKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const name = watchedParts?.[index]?.name?.trim() ?? '';

    if (!name) {
      return;
    }

    const isLast = index === orderedParts.fields.length - 1;

    if (isLast) {
      orderedParts.append({ name: '', quantity: 1, price: undefined });
    }
  };

  return (
    <>
      <Card className={clsx(styles.section, styles.sectionWork)}>
        <div className={styles.sectionHead}>
          <Typography.Title className={styles.sectionTitle} level={3}>
            Работы
          </Typography.Title>
          <p className={styles.sectionHint}>Можно пропустить и заполнить после диагностики</p>
        </div>

        <RepairWorksList repairs={selectedVehicle?.previous_repairs ?? []} />

        {availableQuickWorkTemplates.length > 0 && (
          <div className={styles.quickTemplates}>
            {availableQuickWorkTemplates.map((template) => (
              <button
                className={styles.chip}
                key={template}
                type="button"
                onClick={() => appendWorkItem(false, template)}
              >
                + {template}
              </button>
            ))}
          </div>
        )}

        {workItems.fields.some((_, index) => !watchedWorks?.[index]?.isExtra) && (
          <div className={styles.list}>
            {workItems.fields.map((field, index) =>
              watchedWorks?.[index]?.isExtra ? null : renderWorkRow(field.id, index, false),
            )}
          </div>
        )}

        <Button
          className={styles.addButton}
          htmlType="button"
          size="large"
          type="dashed"
          onClick={() => appendWorkItem(false)}
        >
          Добавить работу
        </Button>
      </Card>

      <Card className={clsx(styles.section, styles.sectionWork)}>
        <div className={styles.sectionHead}>
          <Typography.Title className={styles.sectionTitle} level={3}>
            Доп. работы
          </Typography.Title>
          <p className={styles.sectionHint}>Отдельный блок — сумма считается отдельно в итогах</p>
        </div>

        {workItems.fields.some((_, index) => Boolean(watchedWorks?.[index]?.isExtra)) && (
          <div className={styles.list}>
            {workItems.fields.map((field, index) =>
              watchedWorks?.[index]?.isExtra ? renderWorkRow(field.id, index, true) : null,
            )}
          </div>
        )}

        <Button
          className={styles.addButton}
          htmlType="button"
          size="large"
          type="dashed"
          onClick={() => appendWorkItem(true)}
        >
          Добавить доп. работу
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
                      onKeyDown={(event) => handlePartNameKeyDown(event, index)}
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
                      placeholder="Кол-во"
                      size="large"
                      value={quantityField.value}
                      onChange={(value) => quantityField.onChange(value ?? 1)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          event.stopPropagation();
                        }
                      }}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name={`orderedParts.${index}.price`}
                  render={({ field: priceField }) => (
                    <InputNumber
                      className={styles.numberInput}
                      min={0}
                      placeholder="Цена, ₽"
                      size="large"
                      step={100}
                      value={priceField.value}
                      onChange={(value) =>
                        priceField.onChange(typeof value === 'number' ? value : undefined)
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          event.stopPropagation();
                        }
                      }}
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
          onClick={() => orderedParts.append({ name: '', quantity: 1, price: undefined })}
        >
          Добавить запчасть
        </Button>
      </Card>

      <Card className={styles.section}>
        <div className={styles.sectionHead}>
          <Typography.Title className={styles.sectionTitle} level={3}>
            Детали заказа
          </Typography.Title>
          <p className={styles.sectionHint}>Срок и заметка мастера · статус «Новый»</p>
        </div>

        <div className={styles.detailsGrid}>
          <Form.Item label="Плановая дата выдачи">
            <Controller
              control={control}
              name="plannedReadyAt"
              render={({ field }) => (
                <DatePicker
                  className={styles.fullWidth}
                  disabledDate={disablePastDates}
                  format="DD.MM.YYYY"
                  placeholder="Необязательно"
                  size="large"
                  value={field.value}
                  onChange={field.onChange}
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

      <div className={styles.summary}>
        <div className={styles.summaryMain}>
          <span className={styles.summaryTitle}>К созданию</span>
          <span className={styles.summaryLine}>
            {[clientName || 'Клиент не указан', carLabel].join(' · ')}
          </span>
        </div>
        <div className={styles.summaryMeta}>
          <span>Новый</span>
          <span>{plannedReadyAt ? plannedReadyAt.format('DD.MM.YYYY') : 'Без даты выдачи'}</span>
          <span>
            Работы {formatMoney(costBreakdown.worksTotal)} · доп.{' '}
            {formatMoney(costBreakdown.extraWorksTotal)} · запчасти{' '}
            {formatMoney(costBreakdown.partsTotal)}
          </span>
          <span>К оплате {totalLabel} (посчитано автоматически)</span>
          <span>
            {worksCount} раб. · {extraWorksCount} доп. · {partsCount} запч.
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <Button
          className={clsx(styles.actionSecondary, styles.actionClose)}
          htmlType="button"
          size="large"
          onClick={handleCloseForm}
        >
          Закрыть
        </Button>
        <div className={styles.actionsPrimary}>
          <Button
            className={styles.actionSecondary}
            htmlType="button"
            size="large"
            onClick={() => setCurrentStep(1)}
          >
            Назад
          </Button>
          <Button
            className={styles.actionPrimary}
            disabled={!vehicleId}
            htmlType="submit"
            loading={isSubmitting}
            size="large"
            type="primary"
          >
            <span className={styles.labelFull}>Создать ремонт</span>
            <span className={styles.labelShort}>Создать</span>
          </Button>
        </div>
      </div>

      <ModalRepair open={openModal} setOpen={setOpenModal} />
    </>
  );
};
