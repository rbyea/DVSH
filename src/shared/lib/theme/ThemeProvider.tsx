import { useMemo, useState, type ReactNode } from 'react';

import { ThemeContext, type ThemeContextValue } from './ThemeContext';
import { applyTheme, readStoredTheme, writeStoredTheme, type ColorTheme } from './themeStorage';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ColorTheme>(() => {
    const initial = readStoredTheme();
    applyTheme(initial);
    return initial;
  });

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme: () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        writeStoredTheme(next);
        applyTheme(next);
        setTheme(next);
      },
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
