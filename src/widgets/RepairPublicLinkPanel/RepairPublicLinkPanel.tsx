import { Button, Input } from 'antd';
import { Link } from 'react-router-dom';
import { Bounce, toast } from 'react-toastify';

import { useRegeneratePublicLinkMutation } from '@/entities/repair-order';
import { getErrorMessage } from '@/shared/lib/api';
import { copyTextToClipboard } from '@/shared/lib/clipboard';
import {
  extractPublicToken,
  getPublicRepairAppUrl,
  getPublicRepairPath,
} from '@/shared/lib/public-repair';

import styles from './RepairPublicLinkPanel.module.scss';

type RepairPublicLinkPanelProps = {
  repairId: string;
  publicToken?: string | null;
  publicUrl?: string | null;
  highlight?: boolean;
};

export function RepairPublicLinkPanel({
  repairId,
  publicToken,
  publicUrl,
  highlight = false,
}: RepairPublicLinkPanelProps) {
  const [regenerateLink, { isLoading }] = useRegeneratePublicLinkMutation();

  const token = extractPublicToken(publicToken, publicUrl);
  const appUrl = token ? getPublicRepairAppUrl(token) : '';
  const appPath = token ? getPublicRepairPath(token) : '';

  const handleCopy = async () => {
    if (!appUrl) {
      toast.warning('Сначала создайте публичную ссылку', {
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
      transition: Bounce,
    });
  };

  const handleRegenerate = async () => {
    try {
      const result = await regenerateLink(repairId).unwrap();
      const nextUrl = getPublicRepairAppUrl(result.public_token);
      await copyTextToClipboard(nextUrl);
      toast.success('Ссылка обновлена и скопирована', {
        position: 'top-right',
        transition: Bounce,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось обновить ссылку'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  return (
    <section className={highlight ? styles.highlight : styles.root}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Ссылка для клиента</h2>
          <p className={styles.hint}>
            {highlight
              ? 'Ремонт создан — отправьте клиенту ссылку на статус'
              : 'Клиент увидит статус и список работ без входа'}
          </p>
        </div>
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

      <div className={styles.actions}>
        <Button loading={isLoading} size="large" onClick={() => void handleRegenerate()}>
          {token ? 'Обновить ссылку' : 'Создать ссылку'}
        </Button>
      </div>
    </section>
  );
}
