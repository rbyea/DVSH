import { Button, Input, Tag } from 'antd';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bounce, toast } from 'react-toastify';

import {
  estimateStatusColors,
  estimateStatusLabels,
  useUpdateRepairMutation,
  type EstimateStatus,
  type RepairStatus,
} from '@/entities/repair-order';
import { getErrorMessage } from '@/shared/lib/api';
import { copyTextToClipboard } from '@/shared/lib/clipboard';
import {
  extractPublicToken,
  getPublicRepairAppUrl,
  getPublicRepairPath,
} from '@/shared/lib/public-repair';

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
  const appPath = token ? getPublicRepairPath(token) : '';
  const [updateRepair, { isLoading: isSending }] = useUpdateRepairMutation();
  const autoSentRef = useRef(false);

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

  const handleCopy = async () => {
    if (!appUrl) {
      toast.warning('Публичная ссылка ещё не создана', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    const copied = await copyTextToClipboard(appUrl);

    if (copied) {
      toast.success('Ссылка скопирована', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    toast.error('Не удалось скопировать ссылку', {
      position: 'top-right',
    });
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
                : estimate === 'declined'
                  ? 'Клиент отклонил список — поправьте работы и отправьте снова'
                  : 'Клиент увидит статус и список работ без входа'}
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
          <Link to={appPath} target="_blank" rel="noreferrer">
            <Button size="large">Открыть</Button>
          </Link>
        </div>
      ) : (
        <p className={styles.empty}>Публичная ссылка ещё не создана</p>
      )}

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
