import { Button, DatePicker, Form, Input, InputNumber } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import { Bounce, toast } from 'react-toastify';

import { useUpdateRepairMutation, type RepairDetail } from '@/entities/repair-order';
import { getErrorMessage } from '@/shared/lib/api';

import styles from './RepairDetailsEditor.module.scss';

type RepairDetailsEditorProps = {
  repair: RepairDetail;
};

type EditorState = {
  plannedReadyAt: Dayjs | null;
  mileage?: number;
  total?: number;
  comment: string;
};

function toEditorState(repair: RepairDetail): EditorState {
  return {
    plannedReadyAt: repair.planned_ready_at ? dayjs(repair.planned_ready_at) : null,
    mileage: repair.mileage ?? repair.vehicle.mileage ?? undefined,
    total: repair.total > 0 ? repair.total : undefined,
    comment: repair.comment ?? '',
  };
}

function formatMoney(total?: number): string {
  if (typeof total !== 'number') {
    return 'Не указана';
  }

  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(total);
}

function formatDate(value: Dayjs | null): string {
  if (!value) {
    return 'Не указана';
  }

  return value.format('D MMMM YYYY');
}

export function RepairDetailsEditor({ repair }: RepairDetailsEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState<EditorState>(() => toEditorState(repair));
  const [updateRepair, { isLoading }] = useUpdateRepairMutation();

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
    try {
      await updateRepair({
        repairId: repair.id,
        body: {
          planned_ready_at: formState.plannedReadyAt?.format('YYYY-MM-DD') ?? null,
          mileage: formState.mileage ?? null,
          total: formState.total ?? null,
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
    <section className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <h2 className={styles.title}>Параметры ремонта</h2>
          <p className={styles.hint}>Срок выдачи, сумма и заметка мастера</p>
        </div>

        {isEditing ? (
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

      {isEditing ? (
        <div className={styles.editBody}>
          <div className={styles.grid}>
            <Form.Item className={styles.field} label="Плановая дата выдачи">
              <DatePicker
                className={styles.fullWidth}
                format="DD.MM.YYYY"
                placeholder="Необязательно"
                size="large"
                value={formState.plannedReadyAt}
                onChange={(value) => {
                  setFormState((prev) => ({ ...prev, plannedReadyAt: value }));
                }}
              />
            </Form.Item>

            <Form.Item className={styles.field} label="Пробег, км">
              <InputNumber
                className={styles.fullWidth}
                min={0}
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

            <Form.Item className={styles.field} label="Сумма">
              <InputNumber
                addonAfter="₽"
                className={styles.fullWidth}
                min={0}
                placeholder="Необязательно"
                size="large"
                step={100}
                value={formState.total}
                onChange={(value) => {
                  setFormState((prev) => ({
                    ...prev,
                    total: typeof value === 'number' ? value : undefined,
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
        </div>
      ) : (
        <div className={styles.viewBody}>
          <div className={styles.meta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Выдача</span>
              <span className={styles.metaValue}>{formatDate(formState.plannedReadyAt)}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Сумма</span>
              <span className={styles.metaValue}>{formatMoney(formState.total)}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Пробег</span>
              <span className={styles.metaValue}>
                {typeof formState.mileage === 'number'
                  ? `${formState.mileage.toLocaleString('ru-RU')} км`
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
    </section>
  );
}
