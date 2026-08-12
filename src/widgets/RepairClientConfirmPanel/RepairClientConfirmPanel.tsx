import { Button, Tag } from 'antd';
import { Bounce, toast } from 'react-toastify';

import {
  clientConfirmStatusColors,
  clientConfirmStatusLabels,
  useUpdateRepairMutation,
  type RepairDetail,
} from '@/entities/repair-order';
import { getErrorMessage } from '@/shared/lib/api';
import { copyTextToClipboard } from '@/shared/lib/clipboard';
import { extractPublicToken, getPublicRepairAppUrl } from '@/shared/lib/public-repair';

import styles from './RepairClientConfirmPanel.module.scss';

type RepairClientConfirmPanelProps = {
  repair: RepairDetail;
};

export function RepairClientConfirmPanel({ repair }: RepairClientConfirmPanelProps) {
  const confirmStatus = repair.client_confirm_status ?? null;
  const [updateRepair, { isLoading }] = useUpdateRepairMutation();

  if (repair.status !== 'completed' || !confirmStatus) {
    return null;
  }

  const publicToken = extractPublicToken(repair.public_token, repair.public_url);
  const publicUrl = publicToken ? getPublicRepairAppUrl(publicToken) : '';

  const handleResend = async () => {
    try {
      await updateRepair({
        repairId: repair.id,
        body: { client_confirm_status: 'pending' },
      }).unwrap();

      if (publicUrl) {
        await copyTextToClipboard(publicUrl);
      }

      toast.success(
        publicUrl
          ? 'Снова ждём подтверждения. Ссылка для клиента скопирована'
          : 'Запрос на подтверждение отправлен снова',
        {
          position: 'top-right',
          transition: Bounce,
        },
      );
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось отправить на подтверждение'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  return (
    <div className={styles.panel} data-status={confirmStatus}>
      <div className={styles.head}>
        <div>
          <p className={styles.title}>Подтверждение клиентом</p>
          <p className={styles.hint}>
            {confirmStatus === 'pending'
              ? 'Клиент проверяет работы, имя, VIN и пробег по публичной ссылке'
              : confirmStatus === 'disputed'
                ? 'Исправьте данные и отправьте на подтверждение снова'
                : 'Клиент подтвердил данные — менять заказ нельзя'}
          </p>
        </div>
        <Tag color={clientConfirmStatusColors[confirmStatus]}>
          {clientConfirmStatusLabels[confirmStatus]}
        </Tag>
      </div>

      {confirmStatus === 'disputed' && repair.client_confirm_comment ? (
        <div className={styles.comment}>
          <span className={styles.commentLabel}>Комментарий клиента</span>
          <p className={styles.commentText}>{repair.client_confirm_comment}</p>
        </div>
      ) : null}

      {confirmStatus === 'confirmed' && repair.client_confirmed_at ? (
        <p className={styles.meta}>Подтверждено · зафиксировано в карточке</p>
      ) : null}

      {confirmStatus === 'disputed' ? (
        <div className={styles.actions}>
          <Button
            loading={isLoading}
            size="large"
            type="primary"
            onClick={() => void handleResend()}
          >
            Отправить на подтверждение снова
          </Button>
        </div>
      ) : null}
    </div>
  );
}
