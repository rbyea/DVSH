import type { StationInfo } from './types';

const LOCAL_CONTACTS_STORAGE_KEY = 'dvsh.station.contacts';

export type StationContacts = {
  phone: string | null;
  city: string | null;
  address: string | null;
  working_hours: string | null;
};

function asOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readAllLocalContacts(): Record<string, StationContacts> {
  try {
    const raw = window.localStorage.getItem(LOCAL_CONTACTS_STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    return parsed as Record<string, StationContacts>;
  } catch {
    return {};
  }
}

export function writeLocalStationContacts(stationId: string, contacts: StationContacts): void {
  try {
    const next = {
      ...readAllLocalContacts(),
      [stationId]: {
        phone: asOptionalText(contacts.phone),
        city: asOptionalText(contacts.city),
        address: asOptionalText(contacts.address),
        working_hours: asOptionalText(contacts.working_hours),
      },
    };

    window.localStorage.setItem(LOCAL_CONTACTS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
}

export function mergeStationProfile(station: StationInfo): StationInfo {
  const local = readAllLocalContacts()[station.id];

  return {
    ...station,
    phone: asOptionalText(station.phone) ?? local?.phone ?? null,
    city: asOptionalText(station.city) ?? local?.city ?? null,
    address: asOptionalText(station.address) ?? local?.address ?? null,
    working_hours: asOptionalText(station.working_hours) ?? local?.working_hours ?? null,
  };
}
