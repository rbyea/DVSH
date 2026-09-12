import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

export type PrintStationInfo = {
  name?: string | null;
  legal_name?: string | null;
  phone?: string | null;
  city?: string | null;
  address?: string | null;
  working_hours?: string | null;
};

const AVTOVIDNO_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="36" height="36" aria-hidden="true">
  <rect width="32" height="32" rx="8" fill="#111"/>
  <path fill="#fff" d="M16 6.5L6.8 25h4.1l1.7-3.7h7l1.7 3.7h4.1L16 6.5zm0 6.2l2.4 5.3h-4.8L16 12.7z"/>
  <path fill="#111" d="M12.8 20.2h6.4v2.2h-6.4z"/>
</svg>`;

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatPrintDate(value: string | Date | null | undefined): string {
  if (!value) {
    return '—';
  }

  const date = value instanceof Date ? value : parseISO(value);

  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '—';
  }

  return format(date, 'd MMMM yyyy', { locale: ru });
}

export function formatPrintMoney(value: number | null | undefined): string {
  if (typeof value !== 'number') {
    return '—';
  }

  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPrintHours(value: number | null | undefined): string {
  if (typeof value !== 'number') {
    return '—';
  }

  return `${value} ч`;
}

export function stationHeaderHtml(station?: PrintStationInfo | null): string {
  const legalName = station?.legal_name?.trim() || station?.name?.trim() || 'СТО';
  const phone = station?.phone?.trim();
  const address = [station?.city, station?.address].filter((part) => part?.trim()).join(', ');
  const hours = station?.working_hours?.trim();

  const lines = [
    escapeHtml(legalName),
    address ? escapeHtml(address) : null,
    hours ? escapeHtml(hours) : null,
    phone ? `тел. ${escapeHtml(phone)}` : null,
  ].filter((line): line is string => Boolean(line));

  return `
  <div class="brand">
    <div class="brand-mark">
      ${AVTOVIDNO_MARK_SVG}
      <div>
        <div class="brand-name">Автовидно</div>
        <div class="brand-sub">учёт ремонтов</div>
      </div>
    </div>
    <div class="station-block">${lines.join('<br />')}</div>
  </div>`;
}
