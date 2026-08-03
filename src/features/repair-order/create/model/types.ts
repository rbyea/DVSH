import type { VehicleSearchResult } from '@/entities/vehicle';
import type { RepairCreateFormValues } from '@/pages/RepairCreatePage/types';
import type {
  Control,
  FieldErrors,
  UseFormGetValues,
  UseFormHandleSubmit,
  UseFormReset,
  UseFormSetValue,
} from 'react-hook-form';

export interface RepairCreateContextValue {
  vehicleSearch: string | undefined;
  setVehicleSuggestions: (value: VehicleSearchResult[]) => void;
  isVehicleSearchLoading: boolean;
  applyVehicleSuggestion: (value: VehicleSearchResult) => Promise<void>;
  setSelectedVehicle: (value: VehicleSearchResult | null) => void;
  selectedVehicle: VehicleSearchResult | null;
  setCurrentStep: (value: number) => void;
  getValues: UseFormGetValues<RepairCreateFormValues>;
  setValue: UseFormSetValue<RepairCreateFormValues>;
  reset: UseFormReset<RepairCreateFormValues>;
  vehicleSuggestions: VehicleSearchResult[];
  setIsManualMode: (value: boolean) => void;
  currentStep?: number;
  isDirty?: boolean;
  handleStepChange: (step: number) => void;
  handleSubmit: UseFormHandleSubmit<RepairCreateFormValues>;
  onSubmit: (values: RepairCreateFormValues) => Promise<void>;
  createClientAndContinue: () => Promise<void>;
  continueToRepairStep: () => Promise<void>;
  setIsVehicleSearchLoading: (value: boolean) => void;
  isManualMode: boolean;
  errors: FieldErrors<RepairCreateFormValues>;
  control: Control<RepairCreateFormValues>;
  licensePlateSuggestions: VehicleSearchResult[];
  vinSuggestions: VehicleSearchResult[];
  availableQuickWorkTemplates: string[];
  isSubmitting: boolean;
  isCreatingClient: boolean;
  isSavingClientStep: boolean;
}
