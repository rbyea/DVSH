import { Button, Checkbox, Input, Modal, Tag } from 'antd';
import clsx from 'clsx';
import { useState } from 'react';
import { Bounce, toast } from 'react-toastify';

import {
  useAddWorkItemMutation,
  useDeleteWorkItemMutation,
  useUpdateWorkItemMutation,
  type RepairWorkItem,
} from '@/entities/repair-order';
import { getErrorMessage } from '@/shared/lib/api';

import styles from './RepairWorksChecklist.module.scss';

type RepairWorksChecklistProps = {
  repairId: string;
  workItems: RepairWorkItem[];
  readOnly?: boolean;
  /** True while estimate awaits client approval — cannot mark works done. */
  executionLocked?: boolean;
};

function isWorkDone(item: RepairWorkItem): boolean {
  return Boolean(item.is_done);
}

export function RepairWorksChecklist({
  repairId,
  workItems,
  readOnly = false,
  executionLocked = false,
}: RepairWorksChecklistProps) {
  const [title, setTitle] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const [addWorkItem, { isLoading: isAdding }] = useAddWorkItemMutation();
  const [updateWorkItem] = useUpdateWorkItemMutation();
  const [deleteWorkItem] = useDeleteWorkItemMutation();

  const doneCount = workItems.filter(isWorkDone).length;
  const canToggleDone = !readOnly && !executionLocked;

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
        body: { title: nextTitle },
      }).unwrap();
      setTitle('');
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
        <h2 className={styles.title}>Работы</h2>
        <span className={styles.count}>
          {workItems.length > 0 ? `${doneCount} из ${workItems.length}` : '0'}
        </span>
      </div>

      {executionLocked && !readOnly ? (
        <p className={styles.lockNote}>
          Смета на согласовании у клиента. Отмечать выполнение работ можно после подтверждения.
        </p>
      ) : null}

      {workItems.length > 0 ? (
        <ul className={styles.list}>
          {workItems.map((item) => {
            const done = isWorkDone(item);
            const isPending = pendingId === item.id;
            const isEditing = editingId === item.id;

            return (
              <li className={clsx(styles.item, done && styles.itemDone)} key={item.id}>
                <Checkbox
                  checked={done}
                  disabled={!canToggleDone || isPending || isEditing}
                  onChange={() => {
                    void handleToggle(item);
                  }}
                />

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
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.empty}>
          {readOnly ? 'Работы не указаны' : 'Список работ пока пуст — добавьте первую ниже'}
        </p>
      )}

      {readOnly ? null : (
        <div className={styles.addRow}>
          <Input
            placeholder="Новая работа, например: замена масла"
            size="large"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onPressEnter={() => {
              void handleAdd();
            }}
          />
          <Button loading={isAdding} size="large" type="primary" onClick={() => void handleAdd()}>
            Добавить
          </Button>
        </div>
      )}
    </div>
  );
}
