export type VehicleSuggestion = {
  id: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  carModel: string;
  licensePlate: string;
  vin: string;
  mileage?: number;
  previousRepairs: Array<{
    orderNumber: string;
    title: string;
    completedAt: string;
  }>;
};
