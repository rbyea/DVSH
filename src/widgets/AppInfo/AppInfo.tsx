import { Typography } from 'antd';
import styles from './AppInfo.module.scss';

type AppInfoProps = {
  title: string;
  subtitle: string;
};

export const AppInfo = ({ title, subtitle }: AppInfoProps) => {
  return (
    <div className={styles.header}>
      <Typography.Title className={styles.title} level={1}>
        {title}
      </Typography.Title>
      <p className={styles.subtitle}>{subtitle}</p>
    </div>
  );
};
