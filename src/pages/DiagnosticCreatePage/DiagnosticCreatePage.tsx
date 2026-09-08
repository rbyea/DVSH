import { Button, Card, Empty, Input, Result, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useGetVehiclesQuery } from '@/entities/vehicle';
import {
  getDiagnosticVehiclePath,
  NewVehicleDiagnosticForm,
} from '@/features/vehicle/start-diagnostic';
import { AppInfo } from '@/widgets/AppInfo';
import { StationVehiclesList } from '@/widgets/StationVehiclesList';

import styles from './DiagnosticCreatePage.module.scss';

const PAGE_SIZE = 8;

export function DiagnosticCreatePage() {
  const [mode, setMode] = useState<'pick' | 'new'>('pick');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isFetching, isError, refetch } = useGetVehiclesQuery({
    search: debouncedSearch || undefined,
    page,
    per_page: PAGE_SIZE,
  });

  const vehicles = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const isEmpty = !isFetching && !isError && vehicles.length === 0;
  const hasSearch = Boolean(debouncedSearch);

  if (mode === 'new') {
    return (
      <main className={styles.page}>
        <div className={styles.toolbar}>
          <Button type="link" onClick={() => setMode('pick')}>
            ← К выбору авто
          </Button>
        </div>
        <AppInfo
          eyebrow="Диагностика"
          subtitle="Заведите клиента и машину — сразу откроется список работ. Заказ-наряд не создаётся."
          title="Этого авто ещё нет"
        />
        <NewVehicleDiagnosticForm />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.toolbar}>
        <Link className={styles.back} to="/dashboard">
          ← К ремонтам
        </Link>
      </div>

      <AppInfo
        eyebrow="Диагностика"
        subtitle="Выберите машину из гаража по госномеру или клиенту. VIN нужен только если авто ещё нет в базе."
        title="Какая машина?"
      />

      <section className={styles.controls} aria-label="Поиск автомобиля">
        <Input
          allowClear
          placeholder="Госномер или клиент"
          size="large"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button
          size="large"
          onClick={() => {
            setSearch('');
          }}
        >
          Сбросить
        </Button>
      </section>

      {isError ? (
        <Card className={styles.block} variant="borderless">
          <Result
            extra={
              <Button type="primary" onClick={() => void refetch()}>
                Повторить
              </Button>
            }
            status="error"
            subTitle="Проверьте соединение и попробуйте ещё раз."
            title="Не удалось загрузить автомобили"
          />
        </Card>
      ) : isFetching && vehicles.length === 0 ? (
        <div className={styles.loading}>
          <Spin />
        </div>
      ) : isEmpty ? (
        <Card className={styles.block} variant="borderless">
          <Empty
            description={
              hasSearch ? 'По запросу ничего не найдено' : 'В гараже пока нет автомобилей'
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => setMode('new')}>
              Этого авто ещё нет
            </Button>
          </Empty>
        </Card>
      ) : (
        <StationVehiclesList
          getTo={getDiagnosticVehiclePath}
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          vehicles={vehicles}
          onPageChange={setPage}
        />
      )}

      {isEmpty ? null : (
        <div className={styles.footer}>
          <Button size="large" type="link" onClick={() => setMode('new')}>
            Этого авто ещё нет
          </Button>
        </div>
      )}
    </main>
  );
}
