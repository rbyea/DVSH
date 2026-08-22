import { Button } from 'antd';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { acceptCookieConsent, hasAcceptedCookieConsent } from '@/shared/lib/legal';

import styles from './CookieConsentBanner.module.scss';

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(() => !hasAcceptedCookieConsent());

  if (!isVisible) {
    return null;
  }

  const handleAccept = () => {
    acceptCookieConsent();
    setIsVisible(false);
  };

  return (
    <div className={styles.banner} role="dialog" aria-label="Согласие на cookie и Яндекс Метрику">
      <p className={styles.text}>
        Мы используем cookie, локальное хранилище и Яндекс Метрику: чтобы вы оставались в аккаунте,
        сервис работал, а мы видели, как им пользуются. Рекламных cookie нет.{' '}
        <Link className={styles.link} to="/legal/privacy">
          Политика ПДн
        </Link>
      </p>
      <Button className={styles.action} type="primary" onClick={handleAccept}>
        Согласен
      </Button>
    </div>
  );
}
