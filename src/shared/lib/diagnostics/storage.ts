import type { DiagnosticScan } from './types';

const STORAGE_KEY = 'dvsh.repair.diagnostics';

type DiagnosticsMap = Record<string, DiagnosticScan>;

function readAll(): DiagnosticsMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    return parsed as DiagnosticsMap;
  } catch {
    return {};
  }
}

export function readRepairDiagnostic(repairId: string): DiagnosticScan | null {
  return readAll()[repairId] ?? null;
}

export function writeRepairDiagnostic(repairId: string, scan: DiagnosticScan): void {
  try {
    const next = {
      ...readAll(),
      [repairId]: scan,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
}

export function clearRepairDiagnostic(repairId: string): void {
  try {
    const next = { ...readAll() };
    delete next[repairId];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
}
