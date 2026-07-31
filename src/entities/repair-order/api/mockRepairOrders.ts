import type { RepairCreatePayload, RepairRow } from '../model/types';

const STORAGE_KEY = 'dvsh.mock.repairs';
const REQUEST_DELAY_MS = 350;

const seedRepairs: RepairRow[] = [
  {
    id: '1',
    orderNumber: 'Р-1042',
    clientName: 'Иван Петров',
    car: 'Toyota Camry, A123BC',
    status: 'inProgress',
    updatedAt: 'Сегодня, 12:40',
    total: '18 500 ₽',
  },
  {
    id: '6',
    orderNumber: 'Р-123123',
    clientName: 'Егор Новиков',
    car: 'Opel Astra, Н705УА 193',
    status: 'new',
    updatedAt: 'Вчера, 09:20',
    total: '80000',
  },
  {
    id: '2',
    orderNumber: 'Р-1041',
    clientName: 'Анна Смирнова',
    car: 'Kia Rio, М456ОР',
    status: 'waitingParts',
    updatedAt: 'Сегодня, 10:15',
    total: '7 200 ₽',
  },
  {
    id: '3',
    orderNumber: 'Р-1040',
    clientName: 'ООО Вектор',
    car: 'Ford Transit, Т900КМ',
    status: 'diagnostics',
    updatedAt: 'Вчера, 18:05',
    total: 'Не рассчитано',
  },
  {
    id: '4',
    orderNumber: 'Р-1039',
    clientName: 'Сергей Орлов',
    car: 'Hyundai Solaris, Е777ХХ',
    status: 'done',
    updatedAt: 'Вчера, 15:30',
    total: '24 900 ₽',
  },
  {
    id: '5',
    orderNumber: 'Р-1038',
    clientName: 'Мария Кузнецова',
    car: 'Volkswagen Polo, Н321РА',
    status: 'new',
    updatedAt: 'Вчера, 09:20',
    total: 'Не рассчитано',
  },
  {
    id: '6',
    orderNumber: 'Р-1032138',
    clientName: 'Мария Кузнецова',
    car: 'Volkswagen Polo, Н321РА',
    status: 'new',
    updatedAt: 'Вчера, 09:20',
    total: 'Не рассчитано',
  },
];

function wait() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, REQUEST_DELAY_MS);
  });
}

function readRepairOrders() {
  const savedRepairs = window.localStorage.getItem(STORAGE_KEY);

  if (!savedRepairs) {
    return seedRepairs;
  }

  return JSON.parse(savedRepairs) as RepairRow[];
}

function writeRepairOrders(repairs: RepairRow[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(repairs));
}

function createOrderNumber(repairs: RepairRow[]) {
  const maxOrderNumber = repairs.reduce((maxNumber, repair) => {
    const numericPart = Number(repair.orderNumber.replace(/\D/g, ''));

    return Number.isNaN(numericPart) ? maxNumber : Math.max(maxNumber, numericPart);
  }, 1000);

  return `Р-${maxOrderNumber + 1}`;
}

export async function getMockRepairOrders() {
  await wait();

  return readRepairOrders();
}

export async function createMockRepairOrder(payload: RepairCreatePayload) {
  if (payload.vehicleId) {
    return createMockRepairForExistingVehicle(payload);
  }

  return createMockRepairWithNewVehicle(payload);
}

export async function createMockRepairForExistingVehicle(payload: RepairCreatePayload) {
  await wait();

  const repairs = readRepairOrders();
  const repair: RepairRow = {
    id: crypto.randomUUID(),
    orderNumber: createOrderNumber(repairs),
    clientName: payload.clientName,
    car: `${payload.carModel}, ${payload.licensePlate}`,
    status: payload.status,
    updatedAt: 'Только что',
    total: 'Не рассчитано',
  };

  writeRepairOrders([repair, ...repairs]);

  return repair;
}

export async function createMockRepairWithNewVehicle(payload: RepairCreatePayload) {
  await wait();

  const repairs = readRepairOrders();
  const repair: RepairRow = {
    id: crypto.randomUUID(),
    orderNumber: createOrderNumber(repairs),
    clientName: payload.clientName,
    car: `${payload.carModel}, ${payload.licensePlate}`,
    status: payload.status,
    updatedAt: 'Только что',
    total: 'Не рассчитано',
  };

  writeRepairOrders([repair, ...repairs]);

  return repair;
}
