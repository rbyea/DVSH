import { createContext, useContext } from 'react';

import type { ColorTheme } from './themeStorage';

export type ThemeContextValue = {
  theme: ColorTheme;
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return value;
}
