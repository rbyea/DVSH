import type { VehicleSuggestion } from '@/entities/vehicle';
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
  setVehicleSuggestions: (value: VehicleSuggestion[]) => void;
  isVehicleSearchLoading: boolean;
  applyVehicleSuggestion: (value: VehicleSuggestion) => void;
  setSelectedVehicle: (value: VehicleSuggestion | null) => void;
  selectedVehicle: VehicleSuggestion | null;
  setCurrentStep: (value: number) => void;
  getValues: UseFormGetValues<RepairCreateFormValues>;
  setValue: UseFormSetValue<RepairCreateFormValues>;
  reset: UseFormReset<RepairCreateFormValues>;
  vehicleSuggestions: VehicleSuggestion[];
  setIsManualMode: (value: boolean) => void;
  currentStep?: number;
  isDirty?: boolean;
  handleStepChange: (step: number) => void;
  handleSubmit: UseFormHandleSubmit<RepairCreateFormValues>;
  onSubmit: (values: RepairCreateFormValues) => void;
  setIsVehicleSearchLoading: (value: boolean) => void;
  isManualMode: boolean;
  errors: FieldErrors<RepairCreateFormValues>;
  control: Control<RepairCreateFormValues>;
  licensePlateSuggestions: VehicleSuggestion[];
  vinSuggestions: VehicleSuggestion[];
  availableQuickWorkTemplates: string[];
  isSubmitting: boolean;
}
