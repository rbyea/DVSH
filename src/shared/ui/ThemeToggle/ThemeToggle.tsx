import clsx from 'clsx';

import { useTheme } from '@/shared/lib/theme';

import styles from './ThemeToggle.module.scss';

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      aria-pressed={isDark}
      className={clsx(styles.root, className)}
      type="button"
      onClick={toggleTheme}
    >
      {isDark ? (
        <svg aria-hidden className={styles.icon} fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 3v2.2M12 18.8V21M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M3 12h2.2M18.8 12H21M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      ) : (
        <svg aria-hidden className={styles.icon} fill="none" viewBox="0 0 24 24">
          <path
            d="M15.4 14.6A6.2 6.2 0 0 1 9.5 4.8 7.2 7.2 0 1 0 19.2 14.4a6.1 6.1 0 0 1-3.8.2Z"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      )}
      <span className={styles.label}>{isDark ? 'Светлая' : 'Тёмная'}</span>
    </button>
  );
}
