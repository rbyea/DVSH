import { Button, Modal, Tag, Upload } from 'antd';
import clsx from 'clsx';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useEffect, useRef, useState } from 'react';
import { Bounce, toast } from 'react-toastify';

import { useRepairDiagnostics } from '@/features/repair-order';
import { getErrorMessage } from '@/shared/lib/api';
import {
  matchDiagnosticVin,
  normalizeDiagnosticVin,
  type DiagnosticScan,
  type DiagnosticVinMatch,
  type VehicleDiagnostic,
} from '@/shared/lib/diagnostics';

import styles from './RepairDiagnosticsPanel.module.scss';

type RepairDiagnosticsPanelProps = {
  repairId: string;
  vehicleId?: string | null;
  vehicleVin?: string | null;
  latestDiagnostic?: VehicleDiagnostic | null;
  readOnly?: boolean;
};

const matchLabels: Record<DiagnosticVinMatch, string> = {
  match: 'VIN совпал',
  mismatch: 'VIN не совпал',
  'vehicle-empty': 'В карточке нет VIN',
  'scan-empty': 'В файле нет VIN',
};

function formatScannedAt(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const iso = value.includes('T') ? value : value.replace(' ', 'T');
  const date = parseISO(iso);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, 'd MMM yyyy, HH:mm', { locale: ru });
}

function vehicleTitle(scan: DiagnosticScan): string {
  return [scan.make, scan.model, scan.year].filter(Boolean).join(' ') || 'Авто из скана';
}

function MatchBanner({
  match,
  scanVin,
  vehicleVin,
}: {
  match: DiagnosticVinMatch;
  scanVin: string | null;
  vehicleVin?: string | null;
}) {
  const scan = scanVin || '—';
  const vehicle = normalizeDiagnosticVin(vehicleVin) || 'не указан';

  return (
    <p className={clsx(styles.match, match === 'match' ? styles.matchOk : styles.matchBad)}>
      <Tag className={styles.matchTag} color={match === 'match' ? 'success' : 'error'}>
        {matchLabels[match]}
      </Tag>
      <span className={styles.matchText}>
        Скан {scan}
        <span className={styles.matchSep}>·</span>
        карточка {vehicle}
      </span>
    </p>
  );
}

function FaultList({ scan }: { scan: DiagnosticScan }) {
  const faults = scan.faults.filter((item) => item.hasFault);
  const okCount = scan.faults.length - faults.length;

  if (scan.faults.length === 0) {
    return <p className={styles.empty}>В файле нет секции кодов ошибок.</p>;
  }

  return (
    <>
      <p className={styles.meta}>
        {faults.length} с неисправностью
        {okCount > 0 ? ` · ${okCount} модулей без ошибок` : ''}
      </p>
      {faults.length === 0 ? (
        <p className={styles.empty}>Активных кодов нет — все модули без ошибок.</p>
      ) : (
        <ul className={styles.list}>
          {faults.map((item) => (
            <li className={styles.item} key={`${item.system}-${item.code}`}>
              <div className={styles.itemTop}>
                <span className={styles.code}>{item.code}</span>
                {item.status ? <span className={styles.status}>{item.status}</span> : null}
              </div>
              <p className={styles.description}>{item.description || 'Без описания'}</p>
              <p className={styles.system}>{item.system}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function RepairDiagnosticsPanel({
  repairId,
  vehicleId,
  vehicleVin,
  latestDiagnostic,
  readOnly = false,
}: RepairDiagnosticsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isFaultsOpen, setIsFaultsOpen] = useState(false);
  const { scan, preview, importFile, remove, dismissPreview, vinMatchMessages } =
    useRepairDiagnostics(repairId, vehicleVin, vehicleId, latestDiagnostic);

  useEffect(() => {
    if (preview) {
      setIsOpen(true);
    }
  }, [preview]);

  const handleFiles = async (file: File) => {
    try {
      const result = await importFile(file);

      if (result.ok) {
        setIsOpen(true);

        if (result.match === 'match') {
          toast.success('Диагностика прикреплена — VIN совпал', {
            position: 'top-right',
            transition: Bounce,
          });
        } else {
          toast.warning(`Диагностика прикреплена. ${vinMatchMessages[result.match]}`, {
            position: 'top-right',
            transition: Bounce,
          });
        }

        return;
      }

      toast.error(vinMatchMessages[result.match], {
        position: 'top-right',
        transition: Bounce,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось прочитать CSV'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  const shown = preview ?? scan;
  const activeMatch = shown ? matchDiagnosticVin(shown.vin, vehicleVin) : null;
  const faultCount = shown?.faults.filter((item) => item.hasFault).length ?? 0;
  const collapsedHint = shown
    ? [
        vehicleTitle(shown),
        faultCount > 0 ? `${faultCount} кодов` : 'Без активных кодов',
        matchLabels[activeMatch ?? 'scan-empty'],
      ]
        .filter(Boolean)
        .join(' · ')
    : readOnly
      ? 'Скан появится после диагностики на СТО'
      : 'CSV со сканера, сверка VIN с авто';

  return (
    <section className={clsx(styles.root, isOpen && styles.rootOpen)}>
      <button
        aria-expanded={isOpen}
        className={styles.toggle}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={styles.toggleMain}>
          <span className={styles.title}>Диагностика</span>
          <span className={styles.hint}>{collapsedHint}</span>
        </span>
        <span className={styles.toggleMeta}>
          {shown ? <span className={styles.count}>{faultCount}</span> : null}
          <span aria-hidden className={clsx(styles.chevron, isOpen && styles.chevronOpen)}>
            ▾
          </span>
        </span>
      </button>

      {isOpen ? (
        <div className={styles.body}>
          {readOnly ? null : (
            <div className={styles.actions}>
              {scan && latestDiagnostic?.vehicle_id === vehicleId ? (
                <Button
                  onClick={() => {
                    void remove()
                      .then(() => {
                        toast.success('Диагностику сняли с карточки', {
                          position: 'top-right',
                          transition: Bounce,
                        });
                      })
                      .catch((error: unknown) => {
                        toast.error(getErrorMessage(error, 'Не удалось удалить диагностику'), {
                          position: 'top-right',
                          transition: Bounce,
                        });
                      });
                  }}
                >
                  Удалить
                </Button>
              ) : null}
              <Button type="primary" onClick={() => fileInputRef.current?.click()}>
                {scan ? 'Заменить CSV' : 'Загрузить CSV'}
              </Button>
              <input
                ref={fileInputRef}
                accept=".csv,text/csv"
                className={styles.fileInput}
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';

                  if (file) {
                    void handleFiles(file);
                  }
                }}
              />
            </div>
          )}

          {!shown ? (
            readOnly ? (
              <p className={styles.empty}>Скан появится после диагностики на СТО</p>
            ) : (
              <Upload.Dragger
                accept=".csv,text/csv"
                disabled={readOnly}
                maxCount={1}
                showUploadList={false}
                beforeUpload={(file) => {
                  void handleFiles(file);
                  return false;
                }}
              >
                <p className={styles.dropTitle}>Перетащите CSV сканера</p>
                <p className={styles.dropHint}>Или выберите файл — сверим VIN с карточкой авто</p>
              </Upload.Dragger>
            )
          ) : (
            <>
              {preview ? (
                <div className={styles.previewBar}>
                  <p className={styles.previewNote}>Скан не сохранён — в файле нет VIN.</p>
                  <Button size="small" onClick={dismissPreview}>
                    Закрыть
                  </Button>
                </div>
              ) : null}
              {activeMatch ? (
                <MatchBanner match={activeMatch} scanVin={shown.vin} vehicleVin={vehicleVin} />
              ) : null}
              <div className={styles.summary}>
                <p className={styles.vehicle}>{vehicleTitle(shown)}</p>
                <p className={styles.meta}>
                  {formatScannedAt(shown.scannedAt) ?? 'Дата скана неизвестна'}
                  {shown.repairType ? ` · ${shown.repairType}` : ''}
                  {shown.fileName ? ` · ${shown.fileName}` : ''}
                </p>
              </div>
              <Button
                className={styles.faultsButton}
                type={faultCount > 0 ? 'primary' : 'default'}
                onClick={() => setIsFaultsOpen(true)}
              >
                {faultCount > 0 ? `Коды ошибок · ${faultCount}` : 'Коды ошибок'}
              </Button>
            </>
          )}
        </div>
      ) : null}

      <Modal
        centered
        rootClassName={styles.faultsModal}
        classNames={{ body: styles.faultsScroll }}
        destroyOnHidden
        footer={null}
        open={isFaultsOpen}
        title="Коды диагностики"
        width="min(520px, calc(100vw - 16px))"
        styles={{
          body: {
            maxHeight: 'min(70dvh, 560px)',
            overflowY: 'auto',
          },
        }}
        onCancel={() => setIsFaultsOpen(false)}
      >
        {shown ? <FaultList scan={shown} /> : null}
      </Modal>
    </section>
  );
}
