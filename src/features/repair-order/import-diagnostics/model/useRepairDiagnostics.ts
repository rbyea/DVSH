import { useCallback, useMemo, useState } from 'react';

import {
  useCreateVehicleDiagnosticMutation,
  useDeleteVehicleDiagnosticMutation,
} from '@/entities/vehicle';
import {
  diagnosticScanFromApi,
  diagnosticScanToApiPayload,
  matchDiagnosticVin,
  parseScannerCsv,
  type DiagnosticScan,
  type DiagnosticVinMatch,
  type VehicleDiagnostic,
} from '@/shared/lib/diagnostics';

export type ImportDiagnosticResult = {
  ok: boolean;
  match: DiagnosticVinMatch;
  scan: DiagnosticScan;
};

const vinMatchMessages: Record<DiagnosticVinMatch, string> = {
  match: '',
  mismatch: 'VIN в файле не совпадает с авто в заказ-наряде',
  'vehicle-empty': 'В карточке авто нет VIN — скан сохранили, сверить не с чем',
  'scan-empty': 'В CSV не найден VIN — проверьте файл сканера',
};

export function useRepairDiagnostics(
  repairId: string,
  vehicleVin?: string | null,
  vehicleId?: string | null,
  latestDiagnostic?: VehicleDiagnostic | null,
) {
  const [preview, setPreview] = useState<DiagnosticScan | null>(null);
  const [createDiagnostic] = useCreateVehicleDiagnosticMutation();
  const [deleteDiagnostic] = useDeleteVehicleDiagnosticMutation();

  const scan = useMemo(
    () => (latestDiagnostic ? diagnosticScanFromApi(latestDiagnostic) : null),
    [latestDiagnostic],
  );

  const attachedMatch = useMemo(
    () => (scan ? matchDiagnosticVin(scan.vin, vehicleVin) : null),
    [scan, vehicleVin],
  );

  const importFile = useCallback(
    async (file: File): Promise<ImportDiagnosticResult> => {
      const text = await file.text();
      const parsed = parseScannerCsv(text, file.name);
      const match = matchDiagnosticVin(parsed.vin, vehicleVin);

      if (match === 'scan-empty') {
        setPreview(parsed);
        return { ok: false, match, scan: parsed };
      }

      if (!vehicleId) {
        setPreview(parsed);
        return { ok: false, match: 'vehicle-empty', scan: parsed };
      }

      try {
        await createDiagnostic({
          vehicleId,
          body: diagnosticScanToApiPayload(parsed, repairId),
        }).unwrap();
        setPreview(null);
        return { ok: true, match, scan: parsed };
      } catch (error) {
        setPreview(parsed);
        throw error;
      }
    },
    [createDiagnostic, repairId, vehicleId, vehicleVin],
  );

  const remove = useCallback(async () => {
    if (!vehicleId || !scan?.id) {
      setPreview(null);
      return;
    }

    await deleteDiagnostic({
      vehicleId,
      diagnosticId: scan.id,
      repairId,
    }).unwrap();
    setPreview(null);
  }, [deleteDiagnostic, repairId, scan, vehicleId]);

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
    vinMatchMessages,
  };
}
