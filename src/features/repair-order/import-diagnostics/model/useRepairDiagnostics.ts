import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  clearRepairDiagnostic,
  matchDiagnosticVin,
  parseScannerCsv,
  readRepairDiagnostic,
  writeRepairDiagnostic,
  type DiagnosticScan,
  type DiagnosticVinMatch,
} from '@/shared/lib/diagnostics';

export type ImportDiagnosticResult = {
  ok: boolean;
  match: DiagnosticVinMatch;
  scan: DiagnosticScan;
};

export function useRepairDiagnostics(repairId: string, vehicleVin?: string | null) {
  const [scan, setScan] = useState<DiagnosticScan | null>(() =>
    repairId ? readRepairDiagnostic(repairId) : null,
  );
  const [preview, setPreview] = useState<DiagnosticScan | null>(null);

  useEffect(() => {
    setScan(repairId ? readRepairDiagnostic(repairId) : null);
    setPreview(null);
  }, [repairId]);

  const attachedMatch = useMemo(
    () => (scan ? matchDiagnosticVin(scan.vin, vehicleVin) : null),
    [scan, vehicleVin],
  );

  const importFile = useCallback(
    async (file: File): Promise<ImportDiagnosticResult> => {
      const text = await file.text();
      const parsed = parseScannerCsv(text, file.name);
      const match = matchDiagnosticVin(parsed.vin, vehicleVin);

      if (match === 'match') {
        writeRepairDiagnostic(repairId, parsed);
        setScan(parsed);
        setPreview(null);
        return { ok: true, match, scan: parsed };
      }

      setPreview(parsed);
      return { ok: false, match, scan: parsed };
    },
    [repairId, vehicleVin],
  );

  const remove = useCallback(() => {
    clearRepairDiagnostic(repairId);
    setScan(null);
    setPreview(null);
  }, [repairId]);

  const dismissPreview = useCallback(() => {
    setPreview(null);
  }, []);

  return {
    scan,
    preview,
    attachedMatch,
    importFile,
    remove,
    dismissPreview,
  };
}
