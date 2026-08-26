import clsx from 'clsx';
import { useEffect, useState } from 'react';

import { resolveCarBrand, simpleIconsUrl } from '@/shared/lib/vehicle';

import styles from './CarBrandMark.module.scss';

type CarBrandMarkProps = {
  carModel: string;
  className?: string;
  /** Hide the letter placeholder when there is no logo */
  fallback?: 'letter' | 'none';
};

export function CarBrandMark({ carModel, className, fallback = 'letter' }: CarBrandMarkProps) {
  const brand = resolveCarBrand(carModel);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [brand?.slug]);

  if (brand?.slug && !imageFailed) {
    return (
      <img
        alt=""
        className={clsx(styles.mark, styles.logo, className)}
        src={simpleIconsUrl(brand.slug)}
        onError={() => setImageFailed(true)}
      />
    );
  }

  if (fallback === 'none') {
    return null;
  }

  const letter = (brand?.letter || carModel.trim().slice(0, 1) || '?').toUpperCase();

  return (
    <span aria-hidden className={clsx(styles.mark, styles.letter, className)}>
      {letter}
    </span>
  );
}
