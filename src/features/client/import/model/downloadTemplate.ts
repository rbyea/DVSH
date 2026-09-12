import * as XLSX from 'xlsx';

import { TEMPLATE_HEADERS } from './columns';

export function downloadClientsImportTemplate(): void {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([[...TEMPLATE_HEADERS]]);

  sheet['!cols'] = TEMPLATE_HEADERS.map((header) => ({
    wch: Math.max(header.length + 4, 16),
  }));

  XLSX.utils.book_append_sheet(workbook, sheet, 'Клиенты');
  XLSX.writeFile(workbook, 'avtovidno-klienty.xlsx');
}
