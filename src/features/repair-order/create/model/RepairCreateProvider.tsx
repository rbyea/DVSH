import { useState } from 'react';
import type { ReactNode } from 'react';

import type { RepairCreateContextValue } from './types';
import { RepairCreateContext } from './RepairCreateContent';

type RepairCreateProviderProps = {
  children: ReactNode;
};

export function RepairCreateProvider({ children }: RepairCreateProviderProps) {
  const [vehicleSearch, setVehicleSearch] = useState('');

  const value = {
    vehicleSearch,
    setVehicleSearch,
  } satisfies RepairCreateContextValue;

  return <RepairCreateContext.Provider value={value}>{children}</RepairCreateContext.Provider>;
}
