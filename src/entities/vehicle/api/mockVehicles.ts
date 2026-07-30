import type { VehicleSuggestion } from '../model/types';

const REQUEST_DELAY_MS = 250;

const mockVehicles: VehicleSuggestion[] = [
  {
    id: '1',
    clientName: 'Иван Петров',
    clientPhone: '+7 999 111-22-33',
    clientEmail: 'petrov@example.com',
    carModel: 'Toyota Camry',
    licensePlate: 'А123ВС 777',
    vin: 'JTNB11HK703456789',
    mileage: 85400,
    previousRepairs: [
      {
        orderNumber: 'Р-1012',
        title: 'Замена масла и фильтров',
        completedAt: '12.06.2026',
      },
      {
        orderNumber: 'Р-0988',
        title: 'Диагностика подвески',
        completedAt: '04.04.2026',
      },
    ],
  },
  {
    id: '2',
    clientName: 'Анна Смирнова',
    clientPhone: '+7 999 222-33-44',
    carModel: 'Kia Rio',
    licensePlate: 'М456ОР 777',
    vin: 'Z94CB41AAGR123456',
    mileage: 42100,
    previousRepairs: [
      {
        orderNumber: 'Р-1041',
        title: 'Заказ запчастей',
        completedAt: 'В работе',
      },
    ],
  },
  {
    id: '3',
    clientName: 'ООО Вектор',
    clientEmail: 'service@vector.example',
    carModel: 'Ford Transit',
    licensePlate: 'Т900КМ 777',
    vin: 'WF0XXXTTGXGR12345',
    mileage: 132800,
    previousRepairs: [
      {
        orderNumber: 'Р-1040',
        title: 'Первичная диагностика',
        completedAt: 'В работе',
      },
    ],
  },
];

function normalizeSearch(value: string) {
  return value.replace(/\s/g, '').toLowerCase();
}

export async function searchMockVehicles(query: string) {
  await new Promise((resolve) => {
    window.setTimeout(resolve, REQUEST_DELAY_MS);
  });

  const normalizedQuery = normalizeSearch(query);

  if (normalizedQuery.length < 2) {
    return [];
  }

  return mockVehicles.filter((vehicle) => {
    const licensePlate = normalizeSearch(vehicle.licensePlate);
    const vin = normalizeSearch(vehicle.vin);

    return licensePlate.includes(normalizedQuery) || vin.includes(normalizedQuery);
  });
}
