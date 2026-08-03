import styles from './AppInfo.module.scss';

type AppInfoProps = {
  title: string;
  subtitle: string;
  eyebrow?: string;
};

export const AppInfo = ({ title, subtitle, eyebrow = 'DVSH' }: AppInfoProps) => {
  return (
    <div className={styles.header}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>
    </div>
  );
};
