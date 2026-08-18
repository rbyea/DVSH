import { Button, Input, InputNumber, Modal } from 'antd';
import { useState } from 'react';
import { Bounce, toast } from 'react-toastify';

import {
  getPartLineTotal,
  getRepairCostBreakdown,
  useAddPartMutation,
  useDeletePartMutation,
  useUpdatePartMutation,
  type RepairPart,
} from '@/entities/repair-order';
import { getErrorMessage } from '@/shared/lib/api';
import { DeferredInputNumber } from '@/shared/ui/DeferredInputNumber';

import styles from './RepairPartsChecklist.module.scss';

type RepairPartsChecklistProps = {
  repairId: string;
  parts: RepairPart[];
  readOnly?: boolean;
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

export function RepairPartsChecklist({
  repairId,
  parts,
  readOnly = false,
}: RepairPartsChecklistProps) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const [addPart, { isLoading: isAdding }] = useAddPartMutation();
  const [updatePart] = useUpdatePartMutation();
  const [deletePart] = useDeletePartMutation();

  const { partsTotal } = getRepairCostBreakdown({ orderedParts: parts });

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

  const handleChangePrice = async (part: RepairPart, nextPrice: number | null) => {
    const normalized = typeof nextPrice === 'number' ? nextPrice : null;
    const current = typeof part.price === 'number' ? part.price : null;

    if (normalized === current) {
      return;
    }

    setPendingId(part.id);

    try {
      await updatePart({
        repairId,
        partId: part.id,
        body: { price: normalized },
      }).unwrap();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось обновить цену'), {
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
          price: typeof price === 'number' ? price : null,
        },
      }).unwrap();
      setName('');
      setQuantity(1);
      setPrice(null);
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
        <span className={styles.count}>
          {parts.length}
          {partsTotal > 0 ? ` · ${formatMoney(partsTotal)}` : ''}
        </span>
      </div>

      {parts.length > 0 ? (
        <ul className={styles.list}>
          {parts.map((part) => {
            const isPending = pendingId === part.id;
            const isEditing = editingId === part.id;
            const lineTotal = getPartLineTotal(part);

            return (
              <li className={styles.item} key={part.id}>
                {isEditing && !readOnly ? (
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
                  {readOnly ? (
                    <span className={styles.qtyValue}>× {part.quantity}</span>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>

                <div className={styles.priceControl}>
                  {readOnly ? (
                    <span className={styles.priceValue}>
                      {typeof part.price === 'number'
                        ? `${formatMoney(part.price)}${part.quantity > 1 ? ` · ${formatMoney(lineTotal)}` : ''}`
                        : 'Цена не указана'}
                    </span>
                  ) : (
                    <DeferredInputNumber
                      className={styles.priceInput}
                      disabled={isPending || isEditing}
                      min={0}
                      placeholder="Цена, ₽"
                      size="middle"
                      step={100}
                      value={part.price}
                      onCommit={(next) => {
                        void handleChangePrice(part, next);
                      }}
                    />
                  )}
                </div>

                {readOnly ? null : (
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
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.empty}>
          {readOnly ? 'Запчасти не указаны' : 'Запчасти пока не добавлены'}
        </p>
      )}

      {readOnly ? null : (
        <div className={styles.addBlock}>
          <Input
            className={styles.nameInput}
            placeholder="Например: масляный фильтр"
            size="large"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onPressEnter={() => {
              void handleAdd();
            }}
          />
          <div className={styles.addMeta}>
            <InputNumber
              className={styles.qtyInput}
              min={1}
              placeholder="Кол-во"
              size="large"
              value={quantity}
              onChange={(value) => setQuantity(typeof value === 'number' ? value : 1)}
            />
            <InputNumber
              className={styles.priceInput}
              min={0}
              placeholder="Цена, ₽"
              size="large"
              step={100}
              value={price ?? undefined}
              onChange={(value) => setPrice(typeof value === 'number' ? value : null)}
            />
            <Button
              className={styles.addButton}
              loading={isAdding}
              size="large"
              type="primary"
              onClick={() => void handleAdd()}
            >
              Добавить
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
