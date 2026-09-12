import { Button, Input, InputNumber, Modal, Tag } from 'antd';
import { useMemo, useState } from 'react';
import { Bounce, toast } from 'react-toastify';

import {
  buildMaintenancePlan,
  MaintenanceScheduleChart,
  maintenanceTitleSuggestions,
  nextDueFromCurrent,
  useCreateVehicleMaintenanceItemMutation,
  useDeleteVehicleMaintenanceItemMutation,
  useGetVehicleMaintenanceQuery,
  useUpdateVehicleMaintenanceItemMutation,
  type MaintenanceRow,
  type MaintenanceStatus,
} from '@/entities/vehicle';
import { getErrorMessage } from '@/shared/lib/api';
import { formatMileageKm } from '@/shared/lib/vehicle';

import styles from './VehicleMaintenancePanel.module.scss';

type VehicleMaintenancePanelProps = {
  vehicleId: string;
  mileage?: number | null;
};

type DraftForm = {
  title: string;
  everyKm?: number;
};

const emptyDraft: DraftForm = {
  title: '',
  everyKm: undefined,
};

const statusLabels: Record<MaintenanceStatus, string> = {
  overdue: 'Пора менять',
  due: 'Сейчас',
  soon: 'Скоро',
  later: 'Ждём',
};

const statusColors: Record<MaintenanceStatus, string> = {
  overdue: 'error',
  due: 'warning',
  soon: 'processing',
  later: 'default',
};

export function VehicleMaintenancePanel({ vehicleId, mileage }: VehicleMaintenancePanelProps) {
  const {
    data: items = [],
    isError,
    isFetching,
    refetch,
  } = useGetVehicleMaintenanceQuery(vehicleId);
  const [createItem, { isLoading: isCreating }] = useCreateVehicleMaintenanceItemMutation();
  const [updateItem, { isLoading: isUpdating }] = useUpdateVehicleMaintenanceItemMutation();
  const [deleteItem] = useDeleteVehicleMaintenanceItemMutation();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [draft, setDraft] = useState<DraftForm>(emptyDraft);

  const plan = useMemo(() => buildMaintenancePlan({ mileage, items }), [items, mileage]);
  const previewNextDue =
    plan.currentKm != null && typeof draft.everyKm === 'number'
      ? nextDueFromCurrent(plan.currentKm, draft.everyKm)
      : null;

  const handleCreate = async () => {
    const title = draft.title.trim();
    const everyKm = draft.everyKm;

    if (!title) {
      toast.warning('Укажите, что менять', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    if (typeof everyKm !== 'number' || everyKm < 100) {
      toast.warning('Укажите интервал от текущего пробега, минимум 100 км', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    try {
      await createItem({
        vehicleId,
        body: {
          title,
          every_km: everyKm,
          next_due_km: previewNextDue,
        },
      }).unwrap();
      setDraft(emptyDraft);
      setIsFormOpen(false);
      toast.success('Позиция добавлена в регламент', {
        position: 'top-right',
        transition: Bounce,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось сохранить позицию'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  const handleMarkDone = async (row: MaintenanceRow) => {
    if (plan.currentKm == null) {
      toast.warning('Сначала укажите текущий пробег в карточке авто', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    try {
      await updateItem({
        vehicleId,
        itemId: row.id,
        body: {
          last_done_km: plan.currentKm,
          next_due_km: nextDueFromCurrent(plan.currentKm, row.every_km),
        },
      }).unwrap();
      toast.success(
        `Следующая замена «${row.title}» на ${formatMileageKm(nextDueFromCurrent(plan.currentKm, row.every_km))}`,
        {
          position: 'top-right',
          transition: Bounce,
        },
      );
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось отметить замену'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  const handleDelete = (row: MaintenanceRow) => {
    Modal.confirm({
      title: 'Убрать из регламента?',
      content: row.title,
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          await deleteItem({ vehicleId, itemId: row.id }).unwrap();
        } catch (error) {
          toast.error(getErrorMessage(error, 'Не удалось удалить'), {
            position: 'top-right',
            transition: Bounce,
          });
          throw error;
        }
      },
    });
  };

  return (
    <section className={styles.root} id="maintenance">
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Регламент ТО</h2>
          <p className={styles.hint}>
            Сами задаёте, что менять и через сколько километров от текущего пробега. На графике одна
            шкала км: линия «сейчас» и точки следующих замен. Когда сделали — сдвигаем отметку на
            тот же интервал.
          </p>
        </div>
        <div className={styles.headerActions}>
          <p className={styles.mileage}>
            {plan.currentKm != null ? formatMileageKm(plan.currentKm) : 'Пробег не указан'}
          </p>
          <Button type="default" onClick={() => setIsFormOpen((open) => !open)}>
            {isFormOpen ? 'Скрыть форму' : 'Добавить позицию'}
          </Button>
        </div>
      </div>

      {isFormOpen ? (
        <div className={styles.form}>
          <div className={styles.chips}>
            {maintenanceTitleSuggestions.map((title) => (
              <button
                className={styles.chip}
                key={title}
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, title }))}
              >
                {title}
              </button>
            ))}
          </div>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Что менять</span>
            <Input
              placeholder="Например: масло двигателя"
              size="large"
              value={draft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              onPressEnter={() => void handleCreate()}
            />
          </label>
          <div className={styles.formRow}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Через сколько км</span>
              <InputNumber
                className={styles.numberInput}
                min={100}
                placeholder="10000"
                size="large"
                step={1000}
                value={draft.everyKm}
                onChange={(value) =>
                  setDraft((prev) => ({
                    ...prev,
                    everyKm: typeof value === 'number' ? value : undefined,
                  }))
                }
              />
            </label>
            <p className={styles.preview}>
              {plan.currentKm == null
                ? 'Укажите пробег в карточке авто — тогда посчитаем следующую отметку'
                : previewNextDue != null
                  ? `Следующая замена на ${formatMileageKm(previewNextDue)}`
                  : 'От текущего пробега прибавим интервал'}
            </p>
          </div>
          <div className={styles.formActions}>
            <Button loading={isCreating} type="primary" onClick={() => void handleCreate()}>
              Сохранить
            </Button>
          </div>
        </div>
      ) : null}

      {isError ? (
        <p className={styles.empty}>
          Не удалось загрузить регламент.{' '}
          <Button size="small" type="link" onClick={() => void refetch()}>
            Повторить
          </Button>
        </p>
      ) : isFetching && items.length === 0 ? (
        <p className={styles.empty}>Загружаем регламент…</p>
      ) : plan.rows.length === 0 ? (
        <p className={styles.empty}>
          Позиций пока нет. Добавьте, например, масло — через 10 000 км от текущих{' '}
          {plan.currentKm != null ? formatMileageKm(plan.currentKm) : 'километров'}.
        </p>
      ) : (
        <>
          <MaintenanceScheduleChart plan={plan} />

          <ul className={styles.list}>
            {plan.rows.map((row) => (
              <li className={styles.item} data-status={row.status} key={row.id}>
                <div className={styles.itemTop}>
                  <div className={styles.itemMain}>
                    <p className={styles.itemTitle}>{row.title}</p>
                    <p className={styles.itemMeta}>
                      каждые {formatMileageKm(row.every_km)}
                      {row.last_done_km != null
                        ? ` · делали на ${formatMileageKm(row.last_done_km)}`
                        : ''}
                      {` · следующая ${formatMileageKm(row.next_due_km)}`}
                    </p>
                  </div>
                  <div className={styles.itemAside}>
                    <Tag color={statusColors[row.status]}>{statusLabels[row.status]}</Tag>
                    <Button
                      disabled={isUpdating || plan.currentKm == null}
                      size="small"
                      onClick={() => void handleMarkDone(row)}
                    >
                      Сделали
                    </Button>
                    <Button danger size="small" type="text" onClick={() => handleDelete(row)}>
                      Удалить
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
