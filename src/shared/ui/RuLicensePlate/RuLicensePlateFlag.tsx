import styles from './RuLicensePlateFlag.module.scss';

type RuLicensePlateFlagProps = {
  className?: string;
};

export function RuLicensePlateFlag({ className }: RuLicensePlateFlagProps) {
  return (
    <span
      aria-hidden
      className={className ? `${styles.flag} ${className}` : styles.flag}
      title="Россия"
    >
      <span />
      <span />
      <span />
    </span>
  );
}
