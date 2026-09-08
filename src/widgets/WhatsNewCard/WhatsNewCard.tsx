import clsx from 'clsx';
import { Button } from 'antd';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useState } from 'react';
import { Bounce, toast } from 'react-toastify';

import { useAcknowledgeWhatsNewMutation, useMeQuery } from '@/entities/session';
import { currentWhatsNew, splitWhatsNewItems, type WhatsNewItem } from '@/shared/config';
import { getErrorMessage } from '@/shared/lib/api';

import styles from './WhatsNewCard.module.scss';

function formatItemDate(value: string): string {
  return format(parseISO(value), 'd MMMM', { locale: ru });
}

function WhatsNewItemRow({ isNew, item }: { isNew?: boolean; item: WhatsNewItem }) {
  return (
    <li className={styles.item}>
      <time className={styles.date} dateTime={item.date}>
        {formatItemDate(item.date)}
      </time>
      <div>
        <p className={styles.itemTitle}>
          {item.title}
          {isNew ? <span className={styles.badge}>новое</span> : null}
        </p>
        <ul className={styles.points}>
          {item.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
    </li>
  );
}

export function WhatsNewCard() {
  const { data: user } = useMeQuery();
  const [acknowledgeWhatsNew, { isLoading }] = useAcknowledgeWhatsNewMutation();
  const [isHiding, setIsHiding] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const { fresh, archive } = splitWhatsNewItems(currentWhatsNew);

  const hasSeenCurrent =
    user?.whats_new_seen_id === undefined || user.whats_new_seen_id === currentWhatsNew.id;

  if (!user || hasSeenCurrent || isHiding) {
    return null;
  }

  const dismiss = async () => {
    setIsHiding(true);

    try {
      await acknowledgeWhatsNew({ id: currentWhatsNew.id }).unwrap();
    } catch (error) {
      setIsHiding(false);
      toast.error(getErrorMessage(error, 'Не удалось сохранить. Попробуйте ещё раз'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  return (
    <div
      aria-labelledby="whats-new-title"
      aria-modal="true"
      className={styles.overlay}
      role="dialog"
    >
      <div className={styles.card}>
        <div className={styles.scroll}>
          <p className={styles.eyebrow}>{currentWhatsNew.eyebrow}</p>
          <h2 className={styles.title} id="whats-new-title">
            {currentWhatsNew.title}
          </h2>

          <ul className={styles.list}>
            {fresh.map((item) => (
              <WhatsNewItemRow isNew item={item} key={`${item.date}-${item.title}`} />
            ))}

            {isArchiveOpen
              ? archive.map((item) => (
                  <WhatsNewItemRow item={item} key={`${item.date}-${item.title}`} />
                ))
              : null}
          </ul>

          {archive.length > 0 ? (
            <button
              aria-expanded={isArchiveOpen}
              className={styles.more}
              type="button"
              onClick={() => setIsArchiveOpen((open) => !open)}
            >
              {isArchiveOpen ? 'Свернуть' : 'Какие ещё были'}
              <svg
                aria-hidden
                className={clsx(styles.chevron, isArchiveOpen && styles.chevronOpen)}
                fill="none"
                viewBox="0 0 20 20"
              >
                <path
                  d="M5 7.5 10 12.5 15 7.5"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
            </button>
          ) : null}
        </div>

        <Button
          block
          className={styles.action}
          loading={isLoading}
          size="large"
          type="primary"
          onClick={() => void dismiss()}
        >
          Понятно
        </Button>
      </div>
    </div>
  );
}
