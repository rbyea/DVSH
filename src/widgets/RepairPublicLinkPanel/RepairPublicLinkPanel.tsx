import { Button, Input, Tag } from 'antd';
import { useEffect, useRef } from 'react';
import { Bounce, toast } from 'react-toastify';

import {
  estimateStatusColors,
  estimateStatusLabels,
  useGetRepairNotificationLinkQuery,
  useGetRepairNotificationsQuery,
  useUpdateRepairMutation,
  type EstimateStatus,
  type RepairStatus,
} from '@/entities/repair-order';
import { useSendQuoteForApproval } from '@/features/repair-order';
import { MAX_BOT_URL } from '@/shared/config';
import { getErrorMessage } from '@/shared/lib/api';
import { copyTextToClipboard } from '@/shared/lib/clipboard';
import { extractPublicToken, getPublicRepairAppUrl } from '@/shared/lib/public-repair';

import styles from './RepairPublicLinkPanel.module.scss';

type RepairPublicLinkPanelProps = {
  publicToken?: string | null;
  publicUrl?: string | null;
  repairId?: string;
  repairStatus?: RepairStatus;
  estimateStatus?: EstimateStatus | null;
  highlight?: boolean;
  readOnly?: boolean;
};

export function RepairPublicLinkPanel({
  publicToken,
  publicUrl,
  repairId,
  repairStatus,
  estimateStatus,
  highlight = false,
  readOnly = false,
}: RepairPublicLinkPanelProps) {
  const token = extractPublicToken(publicToken, publicUrl);
  const appUrl = token ? getPublicRepairAppUrl(token) : '';
  const [updateRepair, { isLoading: isSending }] = useUpdateRepairMutation();
  const { sendQuoteForApproval } = useSendQuoteForApproval(repairId, repairStatus);
  const autoSentRef = useRef(false);
  const { data: notifications } = useGetRepairNotificationsQuery(repairId ?? '', {
    skip: !repairId,
  });
  const { data: notificationLink } = useGetRepairNotificationLinkQuery(repairId ?? '', {
    skip: !repairId,
  });
  const maxSubscription = notifications?.find((item) => item.channel === 'max' && item.is_active);
  const maxBotUrl = notificationLink?.url || notificationLink?.link || MAX_BOT_URL;

  const canApprove = Boolean(
    repairId && repairStatus && !['done', 'completed'].includes(repairStatus) && !readOnly,
  );
  const estimate = estimateStatus ?? null;

  const handleSendForApproval = async () => {
    if (!repairId) {
      return;
    }

    try {
      await updateRepair({
        repairId,
        body: {
          estimate_status: 'pending' satisfies EstimateStatus,
          status: 'pending_approval',
        },
      }).unwrap();
      toast.success('Работы отправлены клиенту на согласование', {
        position: 'top-right',
        transition: Bounce,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось отправить на согласование'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  useEffect(() => {
    if (
      !highlight ||
      autoSentRef.current ||
      !canApprove ||
      estimate === 'pending' ||
      estimate === 'approved'
    ) {
      return;
    }

    autoSentRef.current = true;
    void handleSendForApproval();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlight, autoSentRef, canApprove, estimate]);

  const shareWithClient = async () => {
    if (!canApprove) {
      return false;
    }

    try {
      return await sendQuoteForApproval();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось отправить на согласование'), {
        position: 'top-right',
        transition: Bounce,
      });
      return false;
    }
  };

  const handleCopy = async () => {
    if (!appUrl) {
      toast.warning('Публичная ссылка ещё не создана', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    const sent = await shareWithClient();
    const copied = await copyTextToClipboard(appUrl);

    if (copied) {
      toast.success(
        sent ? 'Ссылка скопирована · работы ушли клиенту на согласование' : 'Ссылка скопирована',
        {
          position: 'top-right',
          transition: Bounce,
        },
      );
      return;
    }

    toast.error('Не удалось скопировать ссылку', {
      position: 'top-right',
    });
  };

  const handleOpen = async () => {
    if (!appUrl) {
      return;
    }

    const sent = await shareWithClient();

    if (sent) {
      toast.success('Работы ушли клиенту на согласование', {
        position: 'top-right',
        transition: Bounce,
      });
    }

    window.open(appUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className={highlight ? styles.highlight : styles.root}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Ссылка для клиента</h2>
          <p className={styles.hint}>
            {highlight
              ? 'Ремонт создан — работы отправлены клиенту на согласование'
              : estimate === 'pending'
                ? 'Клиент подтверждает список работ по ссылке'
                : estimate === 'declined' || repairStatus === 'revision'
                  ? 'Клиент вернул список. Поправьте работы — снова уйдёт на согласование'
                  : 'Скопируйте или откройте ссылку — заказ станет «На согласовании»'}
          </p>
        </div>
        {estimate ? (
          <Tag color={estimateStatusColors[estimate]}>{estimateStatusLabels[estimate]}</Tag>
        ) : null}
      </div>

      {token ? (
        <div className={styles.row}>
          <Input readOnly size="large" value={appUrl} />
          <Button size="large" type="primary" onClick={() => void handleCopy()}>
            Копировать
          </Button>
          <Button size="large" onClick={() => void handleOpen()}>
            Открыть
          </Button>
        </div>
      ) : (
        <p className={styles.empty}>Публичная ссылка ещё не создана</p>
      )}

      <p className={styles.maxStatus}>
        {maxSubscription
          ? 'Клиент подключил уведомления в MAX'
          : 'Клиент ещё не подписал MAX — пусть нажмёт Start в боте и отправит номер'}
        {!maxSubscription ? (
          <>
            {' · '}
            <a href={maxBotUrl} rel="noreferrer" target="_blank">
              Открыть бота
            </a>
          </>
        ) : null}
      </p>

      {canApprove && estimate !== 'pending' && estimate !== 'approved' ? (
        <div className={styles.actions}>
          <Button
            disabled={isSending}
            loading={isSending}
            size="large"
            type="primary"
            onClick={() => void handleSendForApproval()}
          >
            {estimate === 'declined' ? 'Отправить снова' : 'Отправить работы на согласование'}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
