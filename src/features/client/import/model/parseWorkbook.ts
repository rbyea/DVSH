import * as XLSX from 'xlsx';

import { IMPORT_ROW_LIMIT, cellText, parseMileageCell, resolveHeaderField } from './columns';
import type { ImportClientPreviewRow, ParseClientsWorkbookResult } from './types';

function isEmptyRow(values: unknown[]): boolean {
  return values.every((value) => cellText(value) === '');
}

export function parseClientsWorkbook(
  data: ArrayBuffer,
  fileName: string,
): ParseClientsWorkbookResult {
  const workbook = XLSX.read(data, { type: 'array', raw: false });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('В файле нет листа');
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false,
  });

  if (matrix.length === 0) {
    throw new Error('Файл пустой');
  }

  const headerRow = matrix[0] ?? [];
  const fieldByIndex = headerRow.map((header) => resolveHeaderField(cellText(header)));

  if (!fieldByIndex.includes('client_name')) {
    throw new Error('В первой строке нужна колонка «Имя». Скачайте шаблон и заполните его.');
  }

  const rows: ImportClientPreviewRow[] = [];

  for (let index = 1; index < matrix.length; index += 1) {
    const values = matrix[index] ?? [];

    if (isEmptyRow(values)) {
      continue;
    }

    const row: ImportClientPreviewRow = {
      source_row: index + 1,
      client_name: '',
    };

    fieldByIndex.forEach((field, columnIndex) => {
      if (!field) {
        return;
      }

      const value = values[columnIndex];

      if (field === 'mileage') {
        row.mileage = parseMileageCell(value);
        return;
      }

      const text = cellText(value);

      if (!text) {
        return;
      }

      row[field] = text;
    });

    if (!row.client_name && !row.car_model && !row.license_plate) {
      continue;
    }

    if (!row.client_name) {
      row.issue = 'Нет имени клиента';
    } else if (Boolean(row.car_model) !== Boolean(row.license_plate)) {
      row.issue = row.car_model ? 'Нет госномера' : 'Нет автомобиля';
    }

    rows.push(row);
  }

  if (rows.length === 0) {
    throw new Error('Нет строк с данными. Заполните шаблон начиная со второй строки.');
  }

  if (rows.length > IMPORT_ROW_LIMIT) {
    throw new Error(`Слишком много строк: максимум ${IMPORT_ROW_LIMIT} за один раз.`);
  }

  return { rows, fileName };
}
