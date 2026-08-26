import { extractRuLicensePlateParts } from '@/shared/lib/vehicle';

import { RuLicensePlateFlag } from './RuLicensePlateFlag';
import styles from './RuLicensePlate.module.scss';

type RuLicensePlateProps = {
  value?: string | null;
};

export function RuLicensePlate({ value }: RuLicensePlateProps) {
  const raw = value?.trim() ?? '';
  const parts = extractRuLicensePlateParts(raw);
  const body = [parts.seriesLetter, parts.number, parts.series].filter(Boolean).join(' ');
  const label = raw || 'Номер не указан';

  return (
    <div aria-label={`Гос номер ${label}`} className={styles.plate} role="img">
      <span className={styles.body}>{body || raw || '—'}</span>
      <span className={styles.region}>
        <RuLicensePlateFlag className={styles.flag} />
        <span className={styles.rus}>RUS</span>
        {parts.region ? <span className={styles.regionCode}>{parts.region}</span> : null}
      </span>
    </div>
  );
}
