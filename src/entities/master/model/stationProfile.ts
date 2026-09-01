import type { StationInfo } from './types';

const LOCAL_CONTACTS_STORAGE_KEY = 'dvsh.station.contacts';

export type StationContacts = {
  phone: string | null;
  city: string | null;
  address: string | null;
  map_url: string | null;
  working_hours: string | null;
  legal_name: string | null;
  inn: string | null;
  ogrn: string | null;
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
        map_url: asOptionalText(contacts.map_url),
        working_hours: asOptionalText(contacts.working_hours),
        legal_name: asOptionalText(contacts.legal_name),
        inn: asOptionalText(contacts.inn),
        ogrn: asOptionalText(contacts.ogrn),
      },
    };

    window.localStorage.setItem(LOCAL_CONTACTS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
}

export function findLocalStationMapUrl(station: {
  phone?: string | null;
  city?: string | null;
  address?: string | null;
}): string | null {
  const phone = asOptionalText(station.phone);
  const city = asOptionalText(station.city);
  const address = asOptionalText(station.address);

  for (const contacts of Object.values(readAllLocalContacts())) {
    const mapUrl = asOptionalText(contacts.map_url);

    if (!mapUrl) {
      continue;
    }

    if (phone && contacts.phone === phone) {
      return mapUrl;
    }

    if (
      address &&
      contacts.address === address &&
      (!city || !contacts.city || contacts.city === city)
    ) {
      return mapUrl;
    }
  }

  return null;
}

export function mergeStationProfile(station: StationInfo): StationInfo {
  const local = readAllLocalContacts()[station.id];

  return {
    ...station,
    phone: asOptionalText(station.phone) ?? local?.phone ?? null,
    city: asOptionalText(station.city) ?? local?.city ?? null,
    address: asOptionalText(station.address) ?? local?.address ?? null,
    map_url: asOptionalText(station.map_url) ?? local?.map_url ?? null,
    working_hours: asOptionalText(station.working_hours) ?? local?.working_hours ?? null,
    legal_name: asOptionalText(station.legal_name) ?? local?.legal_name ?? null,
    inn: asOptionalText(station.inn) ?? local?.inn ?? null,
    ogrn: asOptionalText(station.ogrn) ?? local?.ogrn ?? null,
  };
}
