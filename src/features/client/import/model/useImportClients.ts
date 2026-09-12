import { useState } from 'react';
import { Bounce, toast } from 'react-toastify';

import { useImportClientsMutation } from '@/entities/client';
import { getErrorMessage } from '@/shared/lib/api';

import { downloadClientsImportTemplate } from './downloadTemplate';
import { parseClientsWorkbook } from './parseWorkbook';
import type { ImportClientPreviewRow, ImportClientsResult } from './types';

export function useImportClients() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportClientPreviewRow[]>([]);
  const [result, setResult] = useState<ImportClientsResult | null>(null);
  const [importClients, { isLoading }] = useImportClientsMutation();

  const readyRows = rows.filter((row) => !row.issue);
  const issueCount = rows.length - readyRows.length;

  const reset = () => {
    setFileName(null);
    setRows([]);
    setResult(null);
  };

  const handleFile = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseClientsWorkbook(buffer, file.name);
      setFileName(parsed.fileName);
      setRows(parsed.rows);
      setResult(null);
    } catch (error) {
      reset();
      toast.error(getErrorMessage(error, 'Не удалось прочитать файл'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  const submit = async () => {
    if (readyRows.length === 0) {
      toast.warning('Нет строк, которые можно загрузить', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    try {
      const imported = await importClients(
        readyRows.map(({ issue: _issue, ...row }) => row),
      ).unwrap();
      setResult(imported);
      toast.success(
        `Готово: клиентов ${imported.created_clients}, авто ${imported.created_vehicles}`,
        {
          position: 'top-right',
          transition: Bounce,
        },
      );
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось загрузить клиентов'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  return {
    fileName,
    rows,
    readyCount: readyRows.length,
    issueCount,
    result,
    isLoading,
    reset,
    handleFile,
    submit,
    downloadTemplate: downloadClientsImportTemplate,
  };
}
