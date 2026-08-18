import { Button, Tag } from 'antd';
import type { ReactNode } from 'react';
import { Bounce, toast } from 'react-toastify';

import {
  useDeleteMasterMutation,
  useGetMastersQuery,
  useUpdateMasterMutation,
  type Master,
} from '@/entities/master';
import { getErrorMessage } from '@/shared/lib/api';

import styles from './StationMastersPanel.module.scss';

type StationMastersPanelProps = {
  canManage?: boolean;
  footer?: ReactNode;
};

export function StationMastersPanel({ canManage = true, footer }: StationMastersPanelProps) {
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

  const handleDelete = async (master: Master) => {
    const confirmed = window.confirm(
      `Удалить мастера «${master.full_name}»? В старых работах имя может остаться в истории.`,
    );

    if (!confirmed) {
      return;
    }

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
    }
  };

  const busy = isUpdating || isDeleting;

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Мастера</h2>
          <p className={styles.hint}>
            Справочник сотрудников СТО — их назначают на работы в заказ-наряде
          </p>
        </div>
      </div>

      {isError ? (
        <div className={styles.stateBox}>
          <p className={styles.stateText}>Не удалось загрузить список мастеров</p>
          <Button onClick={() => void refetch()}>Повторить</Button>
        </div>
      ) : null}

      {!isError && masters.length === 0 && !isLoading ? (
        <p className={styles.empty}>Пока нет мастеров — добавьте первого</p>
      ) : null}

      {masters.length > 0 ? (
        <ul className={styles.list}>
          {masters.map((master) => (
            <li className={styles.item} key={master.id}>
              <div className={styles.itemMain}>
                <span className={styles.itemName}>{master.full_name}</span>
                <span className={styles.itemEmail}>{master.specialty}</span>
              </div>
              <div className={styles.itemAside}>
                <Tag color={master.is_active ? 'green' : 'default'}>
                  {master.is_active ? 'В списке' : 'Скрыт'}
                </Tag>
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
                      onClick={() => void handleDelete(master)}
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

      {footer}
    </section>
  );
}
