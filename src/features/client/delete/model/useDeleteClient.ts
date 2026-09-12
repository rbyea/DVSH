import { Modal } from 'antd';
import { Bounce, toast } from 'react-toastify';

import { useDeleteClientMutation } from '@/entities/client';
import { getErrorMessage } from '@/shared/lib/api';

type ConfirmDeleteClientParams = {
  id: string;
  name: string;
  vehiclesCount: number;
};

export function useDeleteClient(onDeleted?: () => void) {
  const [deleteClient, { isLoading: isDeleting }] = useDeleteClientMutation();

  const confirmDelete = ({ id, name, vehiclesCount }: ConfirmDeleteClientParams) => {
    const titleName = name.trim() || 'клиента';

    Modal.confirm({
      title: `Удалить ${titleName}?`,
      content: `Машин: ${vehiclesCount}. Истории работ нет.`,
      okText: 'Удалить',
      okButtonProps: { danger: true },
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          await deleteClient(id).unwrap();
          toast.success('Клиент удалён', {
            position: 'top-right',
            transition: Bounce,
          });
          onDeleted?.();
        } catch (error) {
          toast.error(getErrorMessage(error, 'Не удалось удалить клиента'), {
            position: 'top-right',
            transition: Bounce,
          });
          return Promise.reject(error);
        }
      },
    });
  };

  return { confirmDelete, isDeleting };
}
