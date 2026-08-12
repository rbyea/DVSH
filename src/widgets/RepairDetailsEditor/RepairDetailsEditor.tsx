import { Button, DatePicker, Form, Input, InputNumber } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import { Bounce, toast } from 'react-toastify';

import { useUpdateRepairMutation, type RepairDetail } from '@/entities/repair-order';
import { getErrorMessage } from '@/shared/lib/api';
import { disablePastDates, isPastCalendarDate } from '@/shared/lib/date';
import { formatMileageKm, resolveMinAllowedMileage } from '@/shared/lib/vehicle';

import styles from './RepairDetailsEditor.module.scss';

type RepairDetailsEditorProps = {
  repair: RepairDetail;
  readOnly?: boolean;
};

type EditorState = {
  plannedReadyAt: Dayjs | null;
  mileage?: number;
  comment: string;
};

function toEditorState(repair: RepairDetail): EditorState {
  return {
    plannedReadyAt: repair.planned_ready_at ? dayjs(repair.planned_ready_at) : null,
    mileage: repair.mileage ?? repair.vehicle.mileage ?? undefined,
    comment: repair.comment ?? '',
  };
}

function formatDate(value: Dayjs | null): string {
  if (!value) {
    return 'Не указана';
  }

  return value.format('D MMMM YYYY');
}

export function RepairDetailsEditor({ repair, readOnly = false }: RepairDetailsEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState<EditorState>(() => toEditorState(repair));
  const [updateRepair, { isLoading }] = useUpdateRepairMutation();
  const minMileage = resolveMinAllowedMileage(repair.vehicle);

  useEffect(() => {
    if (!isEditing) {
      setFormState(toEditorState(repair));
    }
  }, [repair, isEditing]);

  const handleCancel = () => {
    setFormState(toEditorState(repair));
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (isPastCalendarDate(formState.plannedReadyAt)) {
      toast.warning('Дата выдачи не может быть в прошлом', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    if (
      typeof formState.mileage === 'number' &&
      minMileage != null &&
      formState.mileage < minMileage
    ) {
      toast.warning(
        `Пробег не может быть меньше ${formatMileageKm(minMileage)} после статуса «Выдан»`,
        {
          position: 'top-right',
          transition: Bounce,
        },
      );
      return;
    }

    try {
      await updateRepair({
        repairId: repair.id,
        body: {
          planned_ready_at: formState.plannedReadyAt?.format('YYYY-MM-DD') ?? null,
          mileage: formState.mileage ?? null,
          comment: formState.comment.trim() || null,
        },
      }).unwrap();

      setIsEditing(false);
      toast.success('Данные ремонта сохранены', {
        position: 'top-right',
        transition: Bounce,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось сохранить ремонт'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <h2 className={styles.title}>Параметры ремонта</h2>
          <p className={styles.hint}>Срок выдачи, пробег и заметка мастера</p>
        </div>

        {readOnly ? null : isEditing ? (
          <div className={styles.actions}>
            <Button disabled={isLoading} size="large" onClick={handleCancel}>
              Отмена
            </Button>
            <Button
              loading={isLoading}
              size="large"
              type="primary"
              onClick={() => void handleSave()}
            >
              Сохранить
            </Button>
          </div>
        ) : (
          <Button size="large" type="link" onClick={() => setIsEditing(true)}>
            Редактировать
          </Button>
        )}
      </div>

      {isEditing && !readOnly ? (
        <Form className={styles.editBody} layout="vertical" requiredMark={false}>
          <div className={styles.grid}>
            <Form.Item className={styles.field} label="Плановая дата выдачи">
              <DatePicker
                className={styles.fullWidth}
                disabledDate={disablePastDates}
                format="DD.MM.YYYY"
                placeholder="Необязательно"
                size="large"
                value={formState.plannedReadyAt}
                onChange={(value) => {
                  setFormState((prev) => ({ ...prev, plannedReadyAt: value }));
                }}
              />
            </Form.Item>

            <Form.Item
              className={styles.field}
              extra={
                minMileage != null
                  ? `Не ниже ${formatMileageKm(minMileage)}`
                  : 'Пробег на момент этих работ'
              }
              label="Пробег на работах, км"
            >
              <InputNumber
                className={styles.fullWidth}
                min={minMileage ?? 0}
                placeholder="Необязательно"
                size="large"
                value={formState.mileage}
                onChange={(value) => {
                  setFormState((prev) => ({
                    ...prev,
                    mileage: typeof value === 'number' ? value : undefined,
                  }));
                }}
              />
            </Form.Item>
          </div>

          <Form.Item className={styles.field} label="Комментарий мастера">
            <Input.TextArea
              placeholder="Что важно не забыть по этому ремонту"
              rows={3}
              size="large"
              value={formState.comment}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, comment: event.target.value }));
              }}
            />
          </Form.Item>
        </Form>
      ) : (
        <div className={styles.viewBody}>
          <div className={styles.meta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Выдача</span>
              <span className={styles.metaValue}>{formatDate(formState.plannedReadyAt)}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Пробег на работах</span>
              <span className={styles.metaValue}>
                {typeof formState.mileage === 'number'
                  ? formatMileageKm(formState.mileage)
                  : 'Не указан'}
              </span>
            </div>
          </div>

          <div className={styles.commentBlock}>
            <span className={styles.metaLabel}>Комментарий мастера</span>
            <p className={styles.commentText}>
              {formState.comment.trim() || 'Комментарий пока не добавлен'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
