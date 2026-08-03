import { Button, Input, InputNumber, Modal } from 'antd';
import { useState } from 'react';
import { Bounce, toast } from 'react-toastify';

import {
  useAddPartMutation,
  useDeletePartMutation,
  useUpdatePartMutation,
  type RepairPart,
} from '@/entities/repair-order';
import { getErrorMessage } from '@/shared/lib/api';

import styles from './RepairPartsChecklist.module.scss';

type RepairPartsChecklistProps = {
  repairId: string;
  parts: RepairPart[];
};

export function RepairPartsChecklist({ repairId, parts }: RepairPartsChecklistProps) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const [addPart, { isLoading: isAdding }] = useAddPartMutation();
  const [updatePart] = useUpdatePartMutation();
  const [deletePart] = useDeletePartMutation();

  const handleChangeQuantity = async (part: RepairPart, nextQuantity: number) => {
    if (nextQuantity < 1 || nextQuantity === part.quantity) {
      return;
    }

    setPendingId(part.id);

    try {
      await updatePart({
        repairId,
        partId: part.id,
        body: { quantity: nextQuantity },
      }).unwrap();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось обновить количество'), {
        position: 'top-right',
        transition: Bounce,
      });
    } finally {
      setPendingId(null);
    }
  };

  const handleStartEdit = (part: RepairPart) => {
    setEditingId(part.id);
    setEditingName(part.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveName = async (part: RepairPart) => {
    const nextName = editingName.trim();

    if (!nextName) {
      toast.warning('Введите название запчасти', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    if (nextName === part.name) {
      handleCancelEdit();
      return;
    }

    setPendingId(part.id);

    try {
      await updatePart({
        repairId,
        partId: part.id,
        body: { name: nextName },
      }).unwrap();
      handleCancelEdit();
      toast.success('Запчасть обновлена', {
        position: 'top-right',
        transition: Bounce,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось переименовать запчасть'), {
        position: 'top-right',
        transition: Bounce,
      });
    } finally {
      setPendingId(null);
    }
  };

  const handleDelete = (part: RepairPart) => {
    Modal.confirm({
      title: 'Удалить запчасть?',
      content: `«${part.name}» будет удалена из заказ-наряда.`,
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        setPendingId(part.id);

        try {
          await deletePart({
            repairId,
            partId: part.id,
          }).unwrap();
        } catch (error) {
          toast.error(getErrorMessage(error, 'Не удалось удалить запчасть'), {
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
    const nextName = name.trim();

    if (!nextName) {
      toast.warning('Введите название запчасти', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    try {
      await addPart({
        repairId,
        body: {
          name: nextName,
          quantity: quantity > 0 ? quantity : 1,
        },
      }).unwrap();
      setName('');
      setQuantity(1);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось добавить запчасть'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h2 className={styles.title}>Запчасти</h2>
        <span className={styles.count}>{parts.length}</span>
      </div>

      {parts.length > 0 ? (
        <ul className={styles.list}>
          {parts.map((part) => {
            const isPending = pendingId === part.id;
            const isEditing = editingId === part.id;

            return (
              <li className={styles.item} key={part.id}>
                {isEditing ? (
                  <Input
                    autoFocus
                    disabled={isPending}
                    size="middle"
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    onPressEnter={() => {
                      void handleSaveName(part);
                    }}
                  />
                ) : (
                  <span className={styles.itemTitle}>{part.name}</span>
                )}

                <div className={styles.qtyControl}>
                  <Button
                    disabled={isPending || isEditing || part.quantity <= 1}
                    size="small"
                    onClick={() => {
                      void handleChangeQuantity(part, part.quantity - 1);
                    }}
                  >
                    −
                  </Button>
                  <span className={styles.qtyValue}>× {part.quantity}</span>
                  <Button
                    disabled={isPending || isEditing}
                    size="small"
                    onClick={() => {
                      void handleChangeQuantity(part, part.quantity + 1);
                    }}
                  >
                    +
                  </Button>
                </div>

                <div className={styles.itemActions}>
                  {isEditing ? (
                    <>
                      <Button
                        disabled={isPending}
                        size="small"
                        type="primary"
                        onClick={() => {
                          void handleSaveName(part);
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
                      <Button
                        disabled={isPending}
                        size="small"
                        type="text"
                        onClick={() => handleStartEdit(part)}
                      >
                        Изменить
                      </Button>
                      <Button
                        danger
                        disabled={isPending}
                        loading={isPending}
                        size="small"
                        type="text"
                        onClick={() => handleDelete(part)}
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
        <p className={styles.empty}>Запчасти пока не добавлены</p>
      )}

      <div className={styles.addRow}>
        <Input
          placeholder="Например: масляный фильтр"
          size="large"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onPressEnter={() => {
            void handleAdd();
          }}
        />
        <InputNumber
          className={styles.qtyInput}
          min={1}
          size="large"
          value={quantity}
          onChange={(value) => setQuantity(typeof value === 'number' ? value : 1)}
        />
        <Button loading={isAdding} size="large" type="primary" onClick={() => void handleAdd()}>
          Добавить
        </Button>
      </div>
    </div>
  );
}
