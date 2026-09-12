import { Alert, Button, Table, Tag, Upload } from 'antd';

import { useImportClients } from '../model/useImportClients';
import styles from './ImportClientsPanel.module.scss';

export function ImportClientsPanel() {
  const {
    fileName,
    rows,
    readyCount,
    issueCount,
    result,
    isLoading,
    reset,
    handleFile,
    submit,
    downloadTemplate,
  } = useImportClients();

  return (
    <section className={styles.card}>
      <div className={styles.actions}>
        <Button size="large" onClick={downloadTemplate}>
          Скачать шаблон Excel
        </Button>
        {fileName ? (
          <Button size="large" onClick={reset}>
            Выбрать другой файл
          </Button>
        ) : null}
      </div>

      <p className={styles.hint}>
        Колонки: имя, телефон, почта, автомобиль, госномер, VIN, шасси, пробег. Имя обязательно.
        Автомобиль и госномер — вместе. Телефон склеивает повторные строки с уже существующим
        клиентом.
      </p>

      {fileName ? (
        <p className={styles.fileName}>
          {fileName}
          <span>
            {' '}
            · {readyCount} к загрузке
            {issueCount > 0 ? ` · ${issueCount} с ошибкой` : ''}
          </span>
        </p>
      ) : (
        <Upload.Dragger
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          maxCount={1}
          showUploadList={false}
          beforeUpload={(file) => {
            void handleFile(file);
            return false;
          }}
        >
          <p className={styles.dropTitle}>Перетащите Excel или CSV</p>
          <p className={styles.dropHint}>Или нажмите, чтобы выбрать файл</p>
        </Upload.Dragger>
      )}

      {rows.length > 0 ? (
        <Table
          className={styles.table}
          columns={[
            { title: 'Строка', dataIndex: 'source_row', width: 80 },
            { title: 'Клиент', dataIndex: 'client_name' },
            { title: 'Телефон', dataIndex: 'client_phone', width: 160 },
            { title: 'Авто', dataIndex: 'car_model' },
            { title: 'Госномер', dataIndex: 'license_plate', width: 130 },
            {
              title: 'Статус',
              dataIndex: 'issue',
              width: 180,
              render: (issue: string | undefined) =>
                issue ? <Tag color="error">{issue}</Tag> : <Tag color="success">Ок</Tag>,
            },
          ]}
          dataSource={rows}
          pagination={rows.length > 12 ? { pageSize: 12 } : false}
          rowKey={(row) => String(row.source_row)}
          size="small"
        />
      ) : null}

      {rows.length > 0 ? (
        <div className={styles.actions}>
          <Button
            disabled={readyCount === 0}
            loading={isLoading}
            size="large"
            type="primary"
            onClick={() => void submit()}
          >
            Загрузить {readyCount > 0 ? `· ${readyCount}` : ''}
          </Button>
        </div>
      ) : null}

      {result ? (
        <Alert
          showIcon
          description={
            result.errors.length > 0
              ? result.errors
                  .slice(0, 8)
                  .map((item) => `Строка ${item.row}: ${item.message}`)
                  .join(' · ')
              : 'Повторные госномера и VIN пропущены, существующих клиентов не перезаписывали.'
          }
          message={`Клиентов: ${result.created_clients} · авто: ${result.created_vehicles} · пропущено: ${result.skipped} · ошибок: ${result.errors.length}`}
          type={result.errors.length > 0 ? 'warning' : 'success'}
        />
      ) : null}
    </section>
  );
}
