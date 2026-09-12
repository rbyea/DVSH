import type { StationInfo } from '@/entities/master';
import {
  getRepairCostBreakdown,
  isExtraWorkItem,
  type RepairDetail,
  type RepairWorkItem,
} from '@/entities/repair-order';
import {
  escapeHtml,
  formatPrintDate,
  formatPrintHours,
  formatPrintMoney,
  printHtmlDocument,
  stationHeaderHtml,
  wrapPrintDocument,
} from '@/shared/lib/print';

function vehicleIdLabel(repair: RepairDetail): string {
  if (repair.vehicle.vin?.trim()) {
    return `VIN ${repair.vehicle.vin.trim()}`;
  }

  if (repair.vehicle.chassis_number?.trim()) {
    return `Шасси ${repair.vehicle.chassis_number.trim()}`;
  }

  return 'Не указан';
}

/** HTML-документ акта выполненных работ для window.print(). */
export function buildRepairWorkPrintHtml(
  repair: RepairDetail,
  station?: StationInfo | null,
): string {
  const works = repair.work_items ?? [];
  const regularWorks = works.filter((item) => !isExtraWorkItem(item));
  const extraWorks = works.filter((item) => isExtraWorkItem(item));
  const parts = repair.ordered_parts ?? [];
  const { worksTotal, extraWorksTotal, partsTotal, calculatedTotal } = getRepairCostBreakdown({
    workItems: works,
    orderedParts: parts,
  });

  const renderWorkRows = (items: RepairWorkItem[], emptyLabel: string) =>
    items.length > 0
      ? items
          .map((item, index) => {
            const master = item.master
              ? `${item.master.full_name}${item.master.specialty ? ` (${item.master.specialty})` : ''}`
              : '—';

            return `<tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(item.title)}${item.is_done ? '' : ' <em>(не отмечена)</em>'}</td>
              <td>${escapeHtml(master)}</td>
              <td>${formatPrintHours(item.hours)}</td>
              <td>${formatPrintMoney(item.price)}</td>
            </tr>`;
          })
          .join('')
      : `<tr><td colspan="5">${emptyLabel}</td></tr>`;

  const hoursOf = (items: RepairWorkItem[]) =>
    items.reduce((sum, item) => sum + (typeof item.hours === 'number' ? item.hours : 0), 0);

  const partRows =
    parts.length > 0
      ? parts
          .map(
            (item, index) => `<tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(item.name)}</td>
              <td>${item.quantity}</td>
              <td>${formatPrintMoney(item.price)}</td>
              <td>${formatPrintMoney(
                typeof item.price === 'number' ? item.price * item.quantity : null,
              )}</td>
            </tr>`,
          )
          .join('')
      : `<tr><td colspan="5">Запчасти не указаны</td></tr>`;

  const workTable = (title: string, items: RepairWorkItem[], emptyLabel: string, total: number) => `
  <h2>${title}</h2>
  <table>
    <thead>
      <tr>
        <th style="width:40px">№</th>
        <th>Работа</th>
        <th>Мастер</th>
        <th style="width:70px">Часы</th>
        <th style="width:100px">Цена</th>
      </tr>
    </thead>
    <tbody>${renderWorkRows(items, emptyLabel)}</tbody>
  </table>
  <div class="totals">
    <div>Часы: <strong>${hoursOf(items) > 0 ? formatPrintHours(hoursOf(items)) : '—'}</strong></div>
    <div>Сумма: <strong>${total > 0 ? formatPrintMoney(total) : '—'}</strong></div>
  </div>`;

  const partsSection =
    parts.length === 0
      ? ''
      : `
  <h2>Запчасти</h2>
  <table>
    <thead>
      <tr>
        <th style="width:40px">№</th>
        <th>Наименование</th>
        <th style="width:80px">Кол-во</th>
        <th style="width:100px">Цена</th>
        <th style="width:110px">Сумма</th>
      </tr>
    </thead>
    <tbody>${partRows}</tbody>
  </table>`;

  const payTotal =
    calculatedTotal > 0 ? formatPrintMoney(calculatedTotal) : formatPrintMoney(repair.total);

  return wrapPrintDocument(
    'Акт выполненных работ',
    `${stationHeaderHtml(station)}
  <h1>Акт выполненных работ</h1>
  <p class="doc-number">№ ${escapeHtml(repair.order_number)}</p>

  <div class="meta">
    <div><span class="label">Клиент</span>${escapeHtml(repair.client.name)}</div>
    <div><span class="label">Телефон</span>${escapeHtml(repair.client.phone || 'Не указан')}</div>
    <div><span class="label">Автомобиль</span>${escapeHtml(repair.vehicle.car_model)} · ${escapeHtml(repair.vehicle.license_plate)}</div>
    <div><span class="label">Идентификатор</span>${escapeHtml(vehicleIdLabel(repair))}</div>
    <div><span class="label">Пробег</span>${typeof repair.mileage === 'number' ? `${repair.mileage.toLocaleString('ru-RU')} км` : 'Не указан'}</div>
    <div><span class="label">Плановая выдача</span>${formatPrintDate(repair.planned_ready_at)}</div>
  </div>

  ${workTable('Работы', regularWorks, 'Работы не указаны', worksTotal)}
  ${extraWorks.length > 0 ? workTable('Доп. работы', extraWorks, 'Доп. работы не указаны', extraWorksTotal) : ''}
  ${partsSection}

  <div class="totals">
    ${parts.length > 0 ? `<div>Запчасти: <strong>${partsTotal > 0 ? formatPrintMoney(partsTotal) : '—'}</strong></div>` : ''}
    <div>К оплате: <strong>${payTotal}</strong></div>
  </div>

  ${repair.comment?.trim() ? `<h2>Комментарий</h2><p>${escapeHtml(repair.comment.trim())}</p>` : ''}

  <div class="sign">
    <div class="sign-line">Исполнитель / мастер</div>
    <div class="sign-line">Клиент</div>
  </div>`,
  );
}

export function printRepairWork(repair: RepairDetail, station?: StationInfo | null): boolean {
  return printHtmlDocument('Акт выполненных работ', buildRepairWorkPrintHtml(repair, station));
}
