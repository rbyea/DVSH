import { Button, InputNumber, Tag } from 'antd';
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
};

function formatMoney(total: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(total);
}

export function RepairEstimatePanel({ repair }: RepairEstimatePanelProps) {
  const [total, setTotal] = useState<number | undefined>(
    repair.total > 0 ? repair.total : undefined,
  );
  const [updateRepair, { isLoading }] = useUpdateRepairMutation();

  useEffect(() => {
    setTotal(repair.total > 0 ? repair.total : undefined);
  }, [repair.total]);

  const estimateStatus = repair.estimate_status ?? null;
  const hasTotal = typeof total === 'number' && total > 0;
  const publicToken = extractPublicToken(repair.public_token, repair.public_url);
  const publicUrl = publicToken ? getPublicRepairAppUrl(publicToken) : '';

  const saveTotal = async (nextTotal: number) => {
    await updateRepair({
      repairId: repair.id,
      body: { total: nextTotal },
    }).unwrap();
  };

  const handleSaveTotal = async () => {
    if (!hasTotal) {
      toast.warning('Укажите сумму сметы больше 0', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    try {
      await saveTotal(total);
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
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Смета для клиента</h2>
          <p className={styles.hint}>
            Необязательно. Если хотите согласовать цену до ремонта — укажите сумму и отправьте
            клиенту по публичной ссылке
          </p>
        </div>
        {estimateStatus ? (
          <Tag color={estimateStatusColors[estimateStatus]}>
            {estimateStatusLabels[estimateStatus]}
          </Tag>
        ) : (
          <Tag>Ещё не отправлена</Tag>
        )}
      </div>

      <div className={styles.row}>
        <div className={styles.totalField}>
          <span className={styles.label}>Сумма сметы</span>
          <InputNumber
            addonAfter="₽"
            className={styles.input}
            min={0}
            placeholder="Например, 18500"
            size="large"
            step={100}
            value={total}
            onChange={(value) => setTotal(typeof value === 'number' ? value : undefined)}
          />
        </div>

        <div className={styles.current}>
          <span className={styles.label}>Сейчас в заказе</span>
          <span className={styles.currentValue}>
            {repair.total > 0 ? formatMoney(repair.total) : '0 ₽'}
          </span>
        </div>
      </div>

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

      <p className={styles.note}>
        {estimateStatus === 'pending'
          ? 'Клиент уже может согласовать смету по публичной ссылке ниже.'
          : hasTotal
            ? 'Можно работать и без согласования. Кнопка нужна только если хотите подтверждение цены от клиента.'
            : 'Можно оставить пустым и просто вести ремонт по статусам и работам.'}
      </p>
    </section>
  );
}
