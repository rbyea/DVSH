import { Button, Checkbox, Input, InputNumber, Modal, Select, Tag } from 'antd';
import clsx from 'clsx';
import { useState } from 'react';
import { Bounce, toast } from 'react-toastify';

import { useGetMastersQuery } from '@/entities/master';
import {
  getRepairCostBreakdown,
  isExtraWorkItem,
  useAddWorkItemMutation,
  useDeleteWorkItemMutation,
  useUpdateWorkItemMutation,
  type RepairWorkItem,
} from '@/entities/repair-order';
import { getErrorMessage } from '@/shared/lib/api';
import { parseMoney } from '@/shared/lib/money';
import { DeferredInputNumber } from '@/shared/ui/DeferredInputNumber';

import styles from './RepairWorksChecklist.module.scss';

type RepairWorksChecklistProps = {
  repairId: string;
  workItems: RepairWorkItem[];
  readOnly?: boolean;
  /** True while estimate awaits client approval — cannot mark works done. */
  executionLocked?: boolean;
  /** Доп. работы — отдельный блок и отдельная сумма */
  isExtra?: boolean;
};

function isWorkDone(item: RepairWorkItem): boolean {
  return Boolean(item.is_done);
}

function masterLabel(item: RepairWorkItem): string | null {
  if (item.master?.full_name) {
    return item.master.specialty
      ? `${item.master.full_name} · ${item.master.specialty}`
      : item.master.full_name;
  }

  return null;
}

function formatWorkPrice(value: number | string | null | undefined): string | null {
  const amount = parseMoney(value);

  if (amount == null) {
    return null;
  }

  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatWorkHours(value: number | null | undefined): string | null {
  if (typeof value !== 'number') {
    return null;
  }

  return `${value} ч`;
}

export function RepairWorksChecklist({
  repairId,
  workItems,
  readOnly = false,
  executionLocked = false,
  isExtra = false,
}: RepairWorksChecklistProps) {
  const [title, setTitle] = useState('');
  const [newMasterId, setNewMasterId] = useState<string | undefined>();
  const [newPrice, setNewPrice] = useState<number | undefined>();
  const [newHours, setNewHours] = useState<number | undefined>();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const { data: masters = [] } = useGetMastersQuery();
  const masterOptions = masters
    .filter((master) => master.is_active)
    .map((master) => ({
      value: master.id,
      label: `${master.full_name} · ${master.specialty}`,
    }));

  const [addWorkItem, { isLoading: isAdding }] = useAddWorkItemMutation();
  const [updateWorkItem] = useUpdateWorkItemMutation();
  const [deleteWorkItem] = useDeleteWorkItemMutation();

  const visibleItems = workItems.filter((item) => isExtraWorkItem(item) === isExtra);
  const doneCount = visibleItems.filter(isWorkDone).length;
  const canToggleDone = !readOnly && !executionLocked;
  const costBreakdown = getRepairCostBreakdown({ workItems });
  const sectionTotal = isExtra ? costBreakdown.extraWorksTotal : costBreakdown.worksTotal;
  const sectionTitle = isExtra ? 'Доп. работы' : 'Работы';
  const emptyText = readOnly
    ? isExtra
      ? 'Доп. работы не указаны'
      : 'Работы не указаны'
    : isExtra
      ? 'Доп. работы пока не добавлены'
      : 'Список работ пока пуст — добавьте первую ниже';
  const addPlaceholder = isExtra
    ? 'Доп. работа, например: полировка'
    : 'Новая работа, например: замена масла';

  const handleToggle = async (item: RepairWorkItem) => {
    if (!canToggleDone) {
      toast.warning('Дождитесь согласования сметы клиентом', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    const nextDone = !isWorkDone(item);
    setPendingId(item.id);

    try {
      await updateWorkItem({
        repairId,
        workItemId: item.id,
        body: { is_done: nextDone },
      }).unwrap();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось обновить работу'), {
        position: 'top-right',
        transition: Bounce,
      });
    } finally {
      setPendingId(null);
    }
  };

  const handleStartEdit = (item: RepairWorkItem) => {
    setEditingId(item.id);
    setEditingTitle(item.title);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleSaveTitle = async (item: RepairWorkItem) => {
    const nextTitle = editingTitle.trim();

    if (!nextTitle) {
      toast.warning('Введите название работы', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    if (nextTitle === item.title) {
      handleCancelEdit();
      return;
    }

    setPendingId(item.id);

    try {
      await updateWorkItem({
        repairId,
        workItemId: item.id,
        body: { title: nextTitle },
      }).unwrap();
      handleCancelEdit();
      toast.success('Работа обновлена', {
        position: 'top-right',
        transition: Bounce,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось переименовать работу'), {
        position: 'top-right',
        transition: Bounce,
      });
    } finally {
      setPendingId(null);
    }
  };

  const handleMasterChange = async (item: RepairWorkItem, masterId: string | null) => {
    setPendingId(item.id);

    try {
      await updateWorkItem({
        repairId,
        workItemId: item.id,
        body: { master_id: masterId },
      }).unwrap();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось назначить мастера'), {
        position: 'top-right',
        transition: Bounce,
      });
    } finally {
      setPendingId(null);
    }
  };

  const handlePriceChange = async (item: RepairWorkItem, price: number | null) => {
    setPendingId(item.id);

    try {
      await updateWorkItem({
        repairId,
        workItemId: item.id,
        body: { price },
      }).unwrap();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось сохранить цену'), {
        position: 'top-right',
        transition: Bounce,
      });
    } finally {
      setPendingId(null);
    }
  };

  const handleHoursChange = async (item: RepairWorkItem, hours: number | null) => {
    setPendingId(item.id);

    try {
      await updateWorkItem({
        repairId,
        workItemId: item.id,
        body: { hours },
      }).unwrap();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось сохранить часы'), {
        position: 'top-right',
        transition: Bounce,
      });
    } finally {
      setPendingId(null);
    }
  };

  const handleDelete = (item: RepairWorkItem) => {
    Modal.confirm({
      title: 'Удалить работу?',
      content: `«${item.title}» будет удалена из заказ-наряда.`,
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        setPendingId(item.id);

        try {
          await deleteWorkItem({
            repairId,
            workItemId: item.id,
          }).unwrap();
        } catch (error) {
          toast.error(getErrorMessage(error, 'Не удалось удалить работу'), {
            position: 'top-right',
            transition: Bounce,
          });
          throw error;
        } finally {
          setPendingId(null);
        }
      },
    });
  };

  const handleAdd = async () => {
    const nextTitle = title.trim();

    if (!nextTitle) {
      toast.warning('Введите название работы', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    try {
      await addWorkItem({
        repairId,
        body: {
          title: nextTitle,
          master_id: newMasterId ?? null,
          price: typeof newPrice === 'number' ? newPrice : null,
          hours: typeof newHours === 'number' ? newHours : null,
          is_extra: isExtra,
        },
      }).unwrap();
      setTitle('');
      setNewMasterId(undefined);
      setNewPrice(undefined);
      setNewHours(undefined);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось добавить работу'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h2 className={styles.title}>{sectionTitle}</h2>
        <span className={styles.count}>
          {visibleItems.length > 0 ? `${doneCount} из ${visibleItems.length}` : '0'}
          {sectionTotal > 0
            ? ` · ${new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB',
                maximumFractionDigits: 0,
              }).format(sectionTotal)}`
            : ''}
        </span>
      </div>

      {executionLocked && !readOnly ? (
        <p className={styles.lockNote}>
          Смета на согласовании у клиента. Отмечать выполнение работ можно после подтверждения.
        </p>
      ) : null}

      {visibleItems.length > 0 ? (
        <ul className={styles.list}>
          {visibleItems.map((item) => {
            const done = isWorkDone(item);
            const isPending = pendingId === item.id;
            const isEditing = editingId === item.id;
            const assignedLabel = masterLabel(item);

            return (
              <li className={clsx(styles.item, done && styles.itemDone)} key={item.id}>
                <div className={styles.itemTop}>
                  <Checkbox
                    checked={done}
                    disabled={!canToggleDone || isPending || isEditing}
                    onChange={() => {
                      void handleToggle(item);
                    }}
                  />

                  <div className={styles.itemMain}>
                    {isEditing && !readOnly ? (
                      <Input
                        autoFocus
                        disabled={isPending}
                        size="middle"
                        value={editingTitle}
                        onChange={(event) => setEditingTitle(event.target.value)}
                        onPressEnter={() => {
                          void handleSaveTitle(item);
                        }}
                      />
                    ) : (
                      <span className={styles.itemTitle}>{item.title}</span>
                    )}
                  </div>

                  <div className={styles.itemActions}>
                    {readOnly ? (
                      <Tag color={done ? 'success' : 'default'}>{done ? 'Готово' : 'Ждёт'}</Tag>
                    ) : isEditing ? (
                      <>
                        <Button
                          disabled={isPending}
                          size="small"
                          type="primary"
                          onClick={() => {
                            void handleSaveTitle(item);
                          }}
                        >
                          ОК
                        </Button>
                        <Button disabled={isPending} size="small" onClick={handleCancelEdit}>
                          Отмена
                        </Button>
                      </>
                    ) : (
                      <>
                        <Tag color={done ? 'success' : 'default'}>{done ? 'Готово' : 'Ждёт'}</Tag>
                        <Button
                          disabled={isPending}
                          size="small"
                          type="text"
                          onClick={() => handleStartEdit(item)}
                        >
                          Изменить
                        </Button>
                        <Button
                          danger
                          disabled={isPending}
                          loading={isPending}
                          size="small"
                          type="text"
                          onClick={() => handleDelete(item)}
                        >
                          Удалить
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {readOnly ? (
                  <div className={styles.metaRead}>
                    <span>{assignedLabel ?? 'Мастер не назначен'}</span>
                    <span>{formatWorkHours(item.hours) ?? 'Часы не указаны'}</span>
                    <span>{formatWorkPrice(item.price) ?? 'Цена не указана'}</span>
                  </div>
                ) : (
                  <div className={styles.metaEdit}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Мастер</span>
                      <Select
                        allowClear
                        className={styles.masterSelect}
                        disabled={isPending}
                        options={masterOptions}
                        placeholder="Не назначен"
                        size="middle"
                        value={item.master_id ?? item.master?.id ?? undefined}
                        onChange={(value) => {
                          void handleMasterChange(item, value ?? null);
                        }}
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Часы</span>
                      <DeferredInputNumber
                        className={styles.metricInput}
                        disabled={isPending}
                        min={0}
                        placeholder="0"
                        size="middle"
                        step={0.5}
                        value={item.hours}
                        onCommit={(next) => {
                          void handleHoursChange(item, next);
                        }}
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Цена, ₽</span>
                      <DeferredInputNumber
                        className={styles.metricInput}
                        disabled={isPending}
                        min={0}
                        placeholder="0"
                        size="middle"
                        step={100}
                        value={item.price}
                        onCommit={(next) => {
                          void handlePriceChange(item, next);
                        }}
                      />
                    </label>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.empty}>{emptyText}</p>
      )}

      {readOnly ? null : (
        <div className={styles.addBlock}>
          <Input
            placeholder={addPlaceholder}
            size="large"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onPressEnter={() => {
              void handleAdd();
            }}
          />
          <div className={styles.addMeta}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Мастер</span>
              <Select
                allowClear
                className={styles.addMasterSelect}
                options={masterOptions}
                placeholder="Не назначен"
                size="large"
                value={newMasterId}
                onChange={(value) => setNewMasterId(value)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Часы</span>
              <InputNumber
                className={styles.addMetricInput}
                min={0}
                placeholder="0"
                size="large"
                step={0.5}
                value={newHours}
                onChange={(value) => setNewHours(typeof value === 'number' ? value : undefined)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Цена, ₽</span>
              <InputNumber
                className={styles.addMetricInput}
                min={0}
                placeholder="0"
                size="large"
                step={100}
                value={newPrice}
                onChange={(value) => setNewPrice(typeof value === 'number' ? value : undefined)}
              />
            </label>
            <div className={styles.addAction}>
              <Button
                loading={isAdding}
                size="large"
                type="primary"
                onClick={() => void handleAdd()}
              >
                Добавить
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
