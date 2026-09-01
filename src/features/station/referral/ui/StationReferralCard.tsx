import { Button, Input, Spin } from 'antd';
import { Bounce, toast } from 'react-toastify';

import { copyTextToClipboard } from '@/shared/lib/clipboard';

import { useStationReferralLink } from '../model/useStationReferralLink';
import styles from './StationReferralCard.module.scss';

export function StationReferralCard() {
  const { isLoading, link } = useStationReferralLink();

  const handleCopy = async () => {
    if (!link) {
      return;
    }

    const copied = await copyTextToClipboard(link);

    toast[copied ? 'success' : 'error'](
      copied ? 'Ссылка скопирована' : 'Не удалось скопировать ссылку',
      {
        position: 'top-right',
        transition: Bounce,
      },
    );
  };

  if (isLoading) {
    return (
      <section className={styles.card}>
        <div className={styles.head}>
          <h2 className={styles.title}>Пригласить СТО</h2>
        </div>
        <Spin />
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <h2 className={styles.title}>Пригласить СТО</h2>
        <p className={styles.hint}>
          {link
            ? 'Кто зарегистрируется по ссылке, получит 60 дней бесплатно: 30 обычных и ещё 30 за приглашение.'
            : 'Ссылка появится после обновления сервера. Обновите страницу чуть позже.'}
        </p>
      </div>
      {link ? (
        <div className={styles.row}>
          <Input readOnly size="large" value={link} />
          <Button size="large" type="primary" onClick={() => void handleCopy()}>
            Копировать
          </Button>
        </div>
      ) : null}
    </section>
  );
}
