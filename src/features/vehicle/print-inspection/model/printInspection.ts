import type { StationInfo } from '@/entities/master';
import {
  buildInspectionWorkTitle,
  inspectionStatusLabels,
  inspectionUrgencyLabels,
  type VehicleCard,
  type VehicleInspectionItem,
} from '@/entities/vehicle';
import { parseMoney } from '@/shared/lib/money';
import {
  escapeHtml,
  formatPrintDate,
  formatPrintMoney,
  printHtmlDocument,
  stationHeaderHtml,
  wrapPrintDocument,
} from '@/shared/lib/print';

function vehicleIdLabel(vehicle: VehicleCard): string {
  if (vehicle.vin?.trim()) {
    return `VIN ${vehicle.vin.trim()}`;
  }

  if (vehicle.chassis_number?.trim()) {
    return `Шасси ${vehicle.chassis_number.trim()}`;
  }

  return 'Не указан';
}

function itemPrice(item: VehicleInspectionItem): number | null {
  return parseMoney(item.price);
}

function workTitleHtml(item: VehicleInspectionItem): string {
  const title = escapeHtml(buildInspectionWorkTitle(item));

  if (item.status === 'open') {
    return title;
  }

  return `${title} <em>(${escapeHtml(inspectionStatusLabels[item.status])})</em>`;
}

/** HTML-документ диагностики для window.print() — тот же шаблон, что акт ремонта. */
export function buildInspectionPrintHtml(
  vehicle: VehicleCard,
  items: VehicleInspectionItem[],
  station?: StationInfo | null,
): string {
  const total = items.reduce((sum, item) => sum + (itemPrice(item) ?? 0), 0);

  const rows =
    items.length > 0
      ? items
          .map((item, index) => {
            const note = item.note?.trim();

            return `<tr>
              <td>${index + 1}</td>
              <td>${workTitleHtml(item)}${note ? `<br /><em>${escapeHtml(note)}</em>` : ''}</td>
              <td>${escapeHtml(inspectionUrgencyLabels[item.urgency])}</td>
              <td>${formatPrintMoney(itemPrice(item))}</td>
            </tr>`;
          })
          .join('')
      : `<tr><td colspan="4">Рекомендации не указаны</td></tr>`;

  return wrapPrintDocument(
    'Диагностика',
    `${stationHeaderHtml(station)}
  <h1>Диагностика</h1>
  <p class="doc-number">от ${formatPrintDate(new Date())}</p>

  <div class="meta">
    <div><span class="label">Клиент</span>${escapeHtml(vehicle.client?.name || 'Не указан')}</div>
    <div><span class="label">Телефон</span>${escapeHtml(vehicle.client?.phone || 'Не указан')}</div>
    <div><span class="label">Автомобиль</span>${escapeHtml(vehicle.car_model)} · ${escapeHtml(vehicle.license_plate)}</div>
    <div><span class="label">Идентификатор</span>${escapeHtml(vehicleIdLabel(vehicle))}</div>
    <div><span class="label">Пробег</span>${typeof vehicle.mileage === 'number' ? `${vehicle.mileage.toLocaleString('ru-RU')} км` : 'Не указан'}</div>
    <div><span class="label">Дата</span>${formatPrintDate(new Date())}</div>
  </div>

  <h2>Рекомендации</h2>
  <table>
    <thead>
      <tr>
        <th style="width:40px">№</th>
        <th>Работа</th>
        <th style="width:130px">Срочность</th>
        <th style="width:100px">Цена</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div>К оплате: <strong>${total > 0 ? formatPrintMoney(total) : '—'}</strong></div>
  </div>

  <div class="sign">
    <div class="sign-line">Исполнитель / мастер</div>
    <div class="sign-line">Клиент</div>
  </div>`,
  );
}

export function printInspection(
  vehicle: VehicleCard,
  items: VehicleInspectionItem[],
  station?: StationInfo | null,
): boolean {
  return printHtmlDocument('Диагностика', buildInspectionPrintHtml(vehicle, items, station));
}
