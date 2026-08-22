import { formatVinInput, isValidVin } from '@/shared/lib/vehicle';

import type { DiagnosticFault, DiagnosticScan } from './types';

const DTC_PATTERN = /(?:^|,)([PCBU][0-9A-F]{4})(?:,|$)/i;
const DATE_PATTERN = /\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?/;
const REPAIR_TYPE_PATTERN = /^(PRE_REPAIR|POST_REPAIR)$/i;
const NO_FAULT_PATTERN = /,\s*No Fault\s*$/i;
const SECTION_MARKERS = new Set(['faultcode', 'datastream', 'shop_name']);

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, '');
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function isBlankLine(line: string): boolean {
  return line.trim() === '' || /^,+$/.test(line.trim());
}

function headerKey(line: string): string {
  return splitCsvLine(line)[0]?.replace(/"/g, '').trim().toLowerCase() ?? '';
}

function pickVin(cells: string[]): string | null {
  for (const cell of cells) {
    const vin = formatVinInput(cell);

    if (isValidVin(vin)) {
      return vin;
    }
  }

  return null;
}

function pickDate(cells: string[]): string | null {
  for (const cell of cells) {
    const match = cell.match(DATE_PATTERN);

    if (match) {
      return match[0].replace(' ', 'T');
    }
  }

  return null;
}

function pickRepairType(cells: string[]): string | null {
  for (const cell of cells) {
    if (REPAIR_TYPE_PATTERN.test(cell)) {
      return cell.toUpperCase();
    }
  }

  return null;
}

function zipByHeaders(headers: string[], cells: string[]): Record<string, string> {
  const result: Record<string, string> = {};

  headers.forEach((header, index) => {
    const key = header.trim().toLowerCase();

    if (key) {
      result[key] = cells[index]?.trim() || '';
    }
  });

  return result;
}

function parseVehicleLine(headerLine: string, dataLine: string): Partial<DiagnosticScan> {
  const headers = splitCsvLine(headerLine);
  const cells = splitCsvLine(dataLine).filter((cell) => cell !== '');
  const mapped = headers.length === cells.length ? zipByHeaders(headers, cells) : {};
  const vin = pickVin(cells) ?? (mapped.vin ? formatVinInput(mapped.vin) : null);
  const serialFromMap = mapped.sn || mapped.serial || '';
  const serial =
    serialFromMap ||
    cells.find((cell) => {
      if (REPAIR_TYPE_PATTERN.test(cell) || DATE_PATTERN.test(cell)) {
        return false;
      }

      const compact = cell.replace(/[^A-Z0-9]/gi, '');
      return compact.length >= 8 && compact.length <= 20 && !isValidVin(formatVinInput(cell));
    }) ||
    null;

  return {
    make: mapped.make || cells[0] || null,
    model: mapped.model || cells[1] || null,
    year: mapped.year || cells[2] || null,
    vin: vin && vin.length > 0 ? vin : null,
    serial: serial || null,
    repairType: pickRepairType(cells) ?? mapped.repairtype ?? null,
    scannedAt: pickDate(cells) ?? mapped.reporttime ?? null,
  };
}

function parseFaultLine(line: string): DiagnosticFault | null {
  const trimmed = line.trim();

  if (!trimmed || headerKey(trimmed) === 'showsystem') {
    return null;
  }

  if (NO_FAULT_PATTERN.test(trimmed)) {
    const system = trimmed.replace(NO_FAULT_PATTERN, '').trim();

    return {
      system,
      code: null,
      description: null,
      status: null,
      hasFault: false,
    };
  }

  const dtcMatch = trimmed.match(DTC_PATTERN);

  if (!dtcMatch || dtcMatch.index == null) {
    return null;
  }

  const code = dtcMatch[1].toUpperCase();
  const codeStart = dtcMatch.index + (dtcMatch[0].startsWith(',') ? 1 : 0);
  const system = trimmed.slice(0, codeStart).replace(/,$/, '').trim();
  const afterCode = trimmed.slice(codeStart + code.length).replace(/^,/, '');
  const lastComma = afterCode.lastIndexOf(',');
  const description = (lastComma >= 0 ? afterCode.slice(0, lastComma) : afterCode).trim() || null;
  const status = (lastComma >= 0 ? afterCode.slice(lastComma + 1) : '').trim() || null;

  return {
    system,
    code,
    description,
    status,
    hasFault: true,
  };
}

export function parseScannerCsv(raw: string, fileName = 'scan.csv'): DiagnosticScan {
  const lines = stripBom(raw)
    .split(/\r?\n/)
    .map((line) => line.trimEnd());

  const scan: DiagnosticScan = {
    make: null,
    model: null,
    year: null,
    vin: null,
    serial: null,
    repairType: null,
    scannedAt: null,
    shopName: null,
    faults: [],
    fileName,
  };

  let section: 'vehicle' | 'shop' | 'faults' | 'stream' | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const key = headerKey(line);

    if (key === 'make') {
      const dataLine = lines[index + 1];

      if (dataLine && !isBlankLine(dataLine) && !SECTION_MARKERS.has(headerKey(dataLine))) {
        Object.assign(scan, parseVehicleLine(line, dataLine));
        index += 1;
      }

      section = 'vehicle';
      continue;
    }

    if (key === 'shop_name') {
      section = 'shop';
      const dataLine = lines[index + 1];

      if (dataLine && !isBlankLine(dataLine) && !SECTION_MARKERS.has(headerKey(dataLine))) {
        scan.shopName = splitCsvLine(dataLine)[0] || null;
        index += 1;
      }

      continue;
    }

    if (key === 'faultcode') {
      section = 'faults';
      continue;
    }

    if (key === 'datastream') {
      section = 'stream';
      continue;
    }

    if (!line || isBlankLine(line) || section !== 'faults') {
      continue;
    }

    const fault = parseFaultLine(line);

    if (fault) {
      scan.faults.push(fault);
    }
  }

  if (!scan.vin) {
    scan.vin = pickVin(lines.flatMap((line) => splitCsvLine(line)));
  }

  return scan;
}
