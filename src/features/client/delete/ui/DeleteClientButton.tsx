import { Button } from 'antd';

import { useGetClientQuery, type Client } from '@/entities/client';

import { useDeleteClient } from '../model/useDeleteClient';
import styles from './DeleteClientButton.module.scss';

type DeleteClientButtonProps = {
  client: Client;
  knownRepairsCount?: number;
  onDeleted?: () => void;
};

export function DeleteClientButton({
  client,
  knownRepairsCount = 0,
  onDeleted,
}: DeleteClientButtonProps) {
  const { data: card } = useGetClientQuery(client.id, { skip: !client.id });
  const { confirmDelete, isDeleting } = useDeleteClient(onDeleted);

  const vehiclesCount = card?.vehicles.length ?? 0;
  const repairsCount = Math.max(card?.repairs_count ?? 0, knownRepairsCount);
  const blocked = repairsCount > 0;

  return (
    <div className={styles.wrap}>
      <Button
        danger
        disabled={blocked}
        loading={isDeleting}
        type="link"
        onClick={() => {
          confirmDelete({
            id: client.id,
            name: client.name,
            vehiclesCount,
          });
        }}
      >
        Удалить клиента
      </Button>
      {blocked ? <p className={styles.hint}>Нельзя удалить: есть история работ</p> : null}
    </div>
  );
}
