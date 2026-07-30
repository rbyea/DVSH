import { useContext } from 'react';

import type { RepairCreateContextValue } from './types';
import { RepairCreateContext } from './RepairCreateContent';

export function useRepairCreateContext(): RepairCreateContextValue {
  const context = useContext(RepairCreateContext);

  if (!context) {
    throw new Error('useRepairCreateContext must be used within RepairCreateProvider');
  }

  return context;
}
