import { Card } from 'antd';
import type { ReactNode } from 'react';

import { BrandMark } from '@/shared/ui/BrandMark';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';

import styles from './AuthCardLayout.module.scss';

type AuthCardLayoutProps = {
  eyebrow: string;
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthCardLayout({
  children,
  eyebrow,
  footer,
  subtitle,
  title,
}: AuthCardLayoutProps) {
  return (
    <main className={styles.page}>
      <Card className={styles.card} variant="borderless">
        <div className={styles.brand}>
          <BrandMark className={styles.brandMark} />
          <span className={styles.brandName}>Автовидно</span>
          <ThemeToggle className={styles.themeToggle} />
        </div>

        <div className={styles.header}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>

        <div className={styles.content}>{children}</div>

        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </Card>
    </main>
  );
}
