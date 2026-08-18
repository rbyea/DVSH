import { Button, Collapse, InputNumber, Tag } from 'antd';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { Bounce, toast } from 'react-toastify';

import {
  estimateStatusColors,
  estimateStatusLabels,
  useUpdateRepairMutation,
  type EstimateStatus,
  type RepairDetail,
} from '@/entities/repair-order';
import { getErrorMessage } from '@/shared/lib/api';
import { copyTextToClipboard } from '@/shared/lib/clipboard';
import { extractPublicToken, getPublicRepairAppUrl } from '@/shared/lib/public-repair';

import styles from './RepairEstimatePanel.module.scss';

type RepairEstimatePanelProps = {
  repair: RepairDetail;
  embedded?: boolean;
  readOnly?: boolean;
};

export function RepairEstimatePanel({
  repair,
  embedded = false,
  readOnly = false,
}: RepairEstimatePanelProps) {
  const [total, setTotal] = useState<number | undefined>(
    typeof repair.total === 'number' && repair.total > 0 ? repair.total : undefined,
  );
  const [updateRepair, { isLoading }] = useUpdateRepairMutation();

  useEffect(() => {
    setTotal(typeof repair.total === 'number' && repair.total > 0 ? repair.total : undefined);
  }, [repair.total]);

  const estimateStatus = repair.estimate_status ?? null;
  const hasTotal = typeof total === 'number' && total > 0;
  const publicToken = extractPublicToken(repair.public_token, repair.public_url);
  const publicUrl = publicToken ? getPublicRepairAppUrl(publicToken) : '';
  const defaultOpen =
    estimateStatus === 'pending' ||
    estimateStatus === 'declined' ||
    Boolean(repair.estimate_comment);

  const handleSaveTotal = async () => {
    if (!hasTotal) {
      toast.warning('Укажите сумму сметы больше 0', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    try {
      await updateRepair({
        repairId: repair.id,
        body: { total },
      }).unwrap();
      toast.success('Сумма сметы сохранена', {
        position: 'top-right',
        transition: Bounce,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось сохранить сумму'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  const handleSendForApproval = async () => {
    if (!hasTotal) {
      toast.warning('Сначала укажите сумму сметы', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    try {
      await updateRepair({
        repairId: repair.id,
        body: {
          total,
          estimate_status: 'pending' satisfies EstimateStatus,
          status: 'pending_approval',
        },
      }).unwrap();

      if (publicUrl) {
        await copyTextToClipboard(publicUrl);
      }

      toast.success(
        publicUrl
          ? 'Смета на согласовании. Ссылка для клиента скопирована'
          : 'Смета отправлена на согласование',
        {
          position: 'top-right',
          transition: Bounce,
        },
      );
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось отправить на согласование'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  return (
    <Collapse
      className={clsx(styles.collapse, embedded && styles.collapseEmbedded)}
      defaultActiveKey={defaultOpen ? ['estimate'] : []}
      ghost={embedded}
      items={[
        {
          key: 'estimate',
          label: (
            <div className={styles.header}>
              <div>
                <span className={styles.title}>Смета для клиента</span>
                <p className={styles.hint}>Необязательно · согласование цены по публичной ссылке</p>
              </div>
              {estimateStatus ? (
                <Tag color={estimateStatusColors[estimateStatus]}>
                  {estimateStatusLabels[estimateStatus]}
                </Tag>
              ) : (
                <Tag>Ещё не отправлена</Tag>
              )}
            </div>
          ),
          children: (
            <div className={styles.body}>
              <p className={styles.intro}>
                {readOnly
                  ? 'Смета зафиксирована в закрытом заказ-наряде'
                  : 'Укажите сумму и при необходимости отправьте клиенту на согласование'}
              </p>

              <div className={styles.totalField}>
                <span className={styles.label}>Сумма сметы</span>
                <InputNumber
                  addonAfter="₽"
                  className={styles.input}
                  disabled={readOnly}
                  min={0}
                  placeholder="Например, 18500"
                  size="large"
                  step={100}
                  value={total}
                  onChange={(value) => setTotal(typeof value === 'number' ? value : undefined)}
                />
              </div>

              {readOnly ? null : (
                <div className={styles.actions}>
                  <Button loading={isLoading} size="large" onClick={() => void handleSaveTotal()}>
                    Сохранить сумму
                  </Button>
                  <Button
                    loading={isLoading}
                    size="large"
                    type="primary"
                    onClick={() => void handleSendForApproval()}
                  >
                    {estimateStatus === 'pending' ? 'Отправить снова' : 'На согласование'}
                  </Button>
                </div>
              )}

              {readOnly ? null : (
                <p className={styles.note}>
                  {estimateStatus === 'pending'
                    ? 'Смета у клиента на согласовании. Пока нет ответа — выполнение работ недоступно.'
                    : hasTotal
                      ? 'Можно работать и без согласования — кнопка нужна только для подтверждения цены.'
                      : 'Можно оставить пустым и просто вести ремонт по статусам и работам.'}
                </p>
              )}

              {estimateStatus === 'declined' && repair.estimate_comment ? (
                <div className={styles.clientComment}>
                  <span className={styles.label}>Комментарий клиента</span>
                  <p className={styles.clientCommentText}>{repair.estimate_comment}</p>
                </div>
              ) : null}
            </div>
          ),
        },
      ]}
    />
  );
}
