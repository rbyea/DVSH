import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

import {
  getRepairCostBreakdown,
  isExtraWorkItem,
  repairStatusLabels,
  type RepairDetail,
  type RepairWorkItem,
} from '@/entities/repair-order';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  const date = parseISO(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, 'd MMMM yyyy', { locale: ru });
}

function formatMoney(value: number | null | undefined): string {
  if (typeof value !== 'number') {
    return '—';
  }

  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatHours(value: number | null | undefined): string {
  if (typeof value !== 'number') {
    return '—';
  }

  return `${value} ч`;
}

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
export function buildRepairWorkPrintHtml(repair: RepairDetail): string {
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
              <td>${formatHours(item.hours)}</td>
              <td>${formatMoney(item.price)}</td>
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
              <td>${formatMoney(item.price)}</td>
              <td>${formatMoney(
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
    <div>Часы: <strong>${hoursOf(items) > 0 ? formatHours(hoursOf(items)) : '—'}</strong></div>
    <div>Сумма: <strong>${total > 0 ? formatMoney(total) : '—'}</strong></div>
  </div>`;

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Акт работ ${escapeHtml(repair.order_number)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      color: #111;
      font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    }
    h1 { margin: 0 0 4px; font-size: 20px; }
    h2 { margin: 20px 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.04em; }
    .muted { color: #555; margin: 0 0 16px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 16px; }
    .meta div { border-bottom: 1px solid #ddd; padding: 6px 0; }
    .label { display: block; color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; }
    .totals { margin-top: 12px; display: flex; justify-content: flex-end; gap: 24px; }
    .sign { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
    .sign-line { margin-top: 36px; border-top: 1px solid #333; padding-top: 6px; }
    @media print {
      body { padding: 0; }
      @page { margin: 14mm; }
    }
  </style>
</head>
<body>
  <h1>Акт выполненных работ</h1>
  <p class="muted">Заказ-наряд ${escapeHtml(repair.order_number)} · ${escapeHtml(repairStatusLabels[repair.status])}</p>

  <div class="meta">
    <div><span class="label">Клиент</span>${escapeHtml(repair.client.name)}</div>
    <div><span class="label">Телефон</span>${escapeHtml(repair.client.phone || 'Не указан')}</div>
    <div><span class="label">Автомобиль</span>${escapeHtml(repair.vehicle.car_model)} · ${escapeHtml(repair.vehicle.license_plate)}</div>
    <div><span class="label">Идентификатор</span>${escapeHtml(vehicleIdLabel(repair))}</div>
    <div><span class="label">Пробег</span>${typeof repair.mileage === 'number' ? `${repair.mileage.toLocaleString('ru-RU')} км` : 'Не указан'}</div>
    <div><span class="label">Плановая выдача</span>${formatDate(repair.planned_ready_at)}</div>
  </div>

  ${workTable('Работы', regularWorks, 'Работы не указаны', worksTotal)}
  ${workTable('Доп. работы', extraWorks, 'Доп. работы не указаны', extraWorksTotal)}

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
  </table>

  <div class="totals">
    <div>Запчасти: <strong>${partsTotal > 0 ? formatMoney(partsTotal) : '—'}</strong></div>
    <div>К оплате: <strong>${calculatedTotal > 0 ? formatMoney(calculatedTotal) : formatMoney(repair.total)}</strong></div>
  </div>

  ${repair.comment?.trim() ? `<h2>Комментарий</h2><p>${escapeHtml(repair.comment.trim())}</p>` : ''}

  <div class="sign">
    <div class="sign-line">Исполнитель / мастер</div>
    <div class="sign-line">Клиент</div>
  </div>
</body>
</html>`;
}

export function printRepairWork(repair: RepairDetail): boolean {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('title', 'Печать акта работ');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';

  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = iframe.contentDocument ?? frameWindow?.document;

  if (!frameWindow || !frameDocument) {
    iframe.remove();
    return false;
  }

  frameDocument.open();
  frameDocument.write(buildRepairWorkPrintHtml(repair));
  frameDocument.close();

  frameWindow.focus();
  frameWindow.print();

  // Remove after the print dialog has a chance to open.
  window.setTimeout(() => {
    iframe.remove();
  }, 1000);

  return true;
}
