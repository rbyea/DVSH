import { createContext } from 'react';
import type { RepairCreateContextValue } from './types';

export const RepairCreateContext = createContext<RepairCreateContextValue | null>(null);
