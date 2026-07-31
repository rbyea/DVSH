export type VehicleSuggestion = {
  id: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  vehicleSearch?: string;
  carModel: string;
  licensePlate: string;
  vin: string;
  mileage?: number;
  previousRepairs: Array<{
    orderNumber: string;
    title: string;
    status: 'new' | 'diagnostics' | 'inProgress' | 'waitingParts' | 'completed';
    completedAt: string;
  }>;
};
