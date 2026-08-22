import { Button, Modal, Spin } from 'antd';
import clsx from 'clsx';
import { useState } from 'react';
import { Bounce, toast } from 'react-toastify';

import {
  useDeleteMasterMutation,
  useGetMastersQuery,
  useUpdateMasterMutation,
  type Master,
} from '@/entities/master';
import { CreateMasterForm } from '@/features/master/create';
import { getErrorMessage } from '@/shared/lib/api';

import styles from './StationMastersPanel.module.scss';

type StationMastersPanelProps = {
  canManage?: boolean;
};

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

export function StationMastersPanel({ canManage = true }: StationMastersPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const { data: masters = [], isLoading, isError, refetch } = useGetMastersQuery();
  const [updateMaster, { isLoading: isUpdating }] = useUpdateMasterMutation();
  const [deleteMaster, { isLoading: isDeleting }] = useDeleteMasterMutation();

  const handleToggleActive = async (master: Master) => {
    try {
      await updateMaster({
        id: master.id,
        body: { is_active: !master.is_active },
      }).unwrap();
      toast.success(master.is_active ? 'Мастер скрыт из выбора' : 'Мастер снова в списке', {
        position: 'top-right',
        transition: Bounce,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось изменить статус мастера'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  const handleDelete = (master: Master) => {
    Modal.confirm({
      title: `Удалить мастера «${master.full_name}»?`,
      content: 'В старых работах имя может остаться в истории.',
      okText: 'Удалить',
      okButtonProps: { danger: true },
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          await deleteMaster(master.id).unwrap();
          toast.success('Мастер удалён', {
            position: 'top-right',
            transition: Bounce,
          });
        } catch (error) {
          toast.error(getErrorMessage(error, 'Не удалось удалить мастера'), {
            position: 'top-right',
            transition: Bounce,
          });
          return Promise.reject(error);
        }
      },
    });
  };

  const busy = isUpdating || isDeleting;
  const activeCount = masters.filter((master) => master.is_active).length;
  const hiddenCount = masters.length - activeCount;

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Справочник</h2>
          <p className={styles.hint}>
            Их назначают на работы в заказ-наряде. Скрытый не попадает в выбор.
          </p>
          {masters.length > 0 ? (
            <p className={styles.meta}>
              {activeCount} в списке
              {hiddenCount > 0 ? ` · скрытых ${hiddenCount}` : ''}
            </p>
          ) : null}
        </div>
        {canManage && !isAdding ? (
          <Button type="primary" onClick={() => setIsAdding(true)}>
            Добавить
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <Spin />
        </div>
      ) : null}

      {isError ? (
        <div className={styles.stateBox}>
          <p className={styles.stateText}>Не удалось загрузить список мастеров</p>
          <Button onClick={() => void refetch()}>Повторить</Button>
        </div>
      ) : null}

      {!isError && !isLoading && masters.length === 0 && !isAdding ? (
        <div className={styles.emptyBox}>
          <p className={styles.emptyTitle}>Пока никого нет</p>
          <p className={styles.emptyText}>
            Добавьте первого мастера — его можно будет выбрать в работах.
          </p>
        </div>
      ) : null}

      {masters.length > 0 ? (
        <ul className={styles.list}>
          {masters.map((master) => (
            <li
              className={clsx(styles.item, !master.is_active && styles.itemHidden)}
              key={master.id}
            >
              <span className={styles.avatar} aria-hidden>
                {getInitials(master.full_name)}
              </span>
              <div className={styles.itemMain}>
                <span className={styles.itemName}>{master.full_name}</span>
                <span className={styles.itemSpecialty}>{master.specialty}</span>
              </div>
              <div className={styles.itemAside}>
                <span
                  className={clsx(
                    styles.status,
                    master.is_active ? styles.statusActive : styles.statusHidden,
                  )}
                >
                  {master.is_active ? 'В списке' : 'Скрыт'}
                </span>
                {canManage ? (
                  <div className={styles.itemActions}>
                    <Button
                      disabled={busy}
                      size="small"
                      type="link"
                      onClick={() => void handleToggleActive(master)}
                    >
                      {master.is_active ? 'Скрыть' : 'Показать'}
                    </Button>
                    <Button
                      danger
                      disabled={busy}
                      size="small"
                      type="link"
                      onClick={() => handleDelete(master)}
                    >
                      Удалить
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {canManage && isAdding ? (
        <div className={styles.addCard}>
          <h3 className={styles.addTitle}>Новый мастер</h3>
          <CreateMasterForm
            onCancel={() => setIsAdding(false)}
            onSuccess={() => setIsAdding(false)}
          />
        </div>
      ) : null}
    </section>
  );
}
