import { Button, Card, Empty, Input, Result, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useGetVehiclesQuery } from '@/entities/vehicle';
import {
  DiagnosticVehicleResults,
  getDiagnosticVehiclePath,
  NewVehicleDiagnosticForm,
  usePickDiagnosticVehicle,
} from '@/features/vehicle/start-diagnostic';
import { StationVehiclesList } from '@/widgets/StationVehiclesList';

import styles from './DiagnosticCreatePage.module.scss';

const PAGE_SIZE = 8;

export function DiagnosticCreatePage() {
  const [mode, setMode] = useState<'pick' | 'new'>('pick');
  const [page, setPage] = useState(1);
  const {
    search,
    setSearch,
    hasQuery,
    isShortQuery,
    shortQueryLeft,
    results,
    isSearching,
    isError: isSearchError,
    refetch: refetchSearch,
    adoptingId,
    pickVehicle,
  } = usePickDiagnosticVehicle();

  const { data, isFetching, isError, refetch } = useGetVehiclesQuery(
    {
      page,
      per_page: PAGE_SIZE,
    },
    { skip: mode !== 'pick' || hasQuery },
  );

  useEffect(() => {
    setPage(1);
  }, [hasQuery]);

  const vehicles = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const isGarageEmpty = !isFetching && !isError && vehicles.length === 0;

  if (mode === 'new') {
    return (
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Приёмка</p>
            <h1 className={styles.title}>
              Создание диагностики <span className={styles.titleHint}>(Ручная диагностика)</span>
            </h1>
            <p className={styles.subtitle}>
              Заведите клиента и машину — сразу откроется список работ. Заказ-наряд не создаётся.
            </p>
          </div>
          <div className={styles.heroActions}>
            <Button size="large" onClick={() => setMode('pick')}>
              ← К выбору авто
            </Button>
          </div>
        </section>
        <NewVehicleDiagnosticForm />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Приёмка</p>
          <h1 className={styles.title}>
            Создание диагностики <span className={styles.titleHint}>(Ручная диагностика)</span>
          </h1>
          <p className={styles.subtitle}>
            Найдите авто по госномеру или VIN — ищем по всем СТО. Затем список работ, без
            заказ-наряда.
          </p>
        </div>
        <div className={styles.heroActions}>
          <Link to="/dashboard">
            <Button size="large">← К ремонтам</Button>
          </Link>
        </div>
      </section>

      <section className={styles.controls} aria-label="Поиск автомобиля">
        <Input
          allowClear
          placeholder="Госномер, VIN или клиент — по всем СТО"
          prefix={isSearching ? <Spin size="small" /> : undefined}
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

      {isShortQuery ? (
        <p className={styles.hint}>
          {shortQueryLeft === 1
            ? 'Введите ещё 1 символ — ищем по всей базе'
            : `Введите ещё ${shortQueryLeft} символа — ищем по всей базе`}
        </p>
      ) : null}

      {hasQuery ? (
        isSearchError && !isSearching ? (
          <Card className={styles.block} variant="borderless">
            <Result
              extra={
                <Button type="primary" onClick={() => void refetchSearch()}>
                  Повторить
                </Button>
              }
              status="error"
              subTitle="Проверьте соединение и попробуйте ещё раз."
              title="Не удалось найти автомобиль"
            />
          </Card>
        ) : (
          <DiagnosticVehicleResults
            adoptingId={adoptingId}
            isSearching={isSearching}
            results={results}
            onPick={(vehicle) => void pickVehicle(vehicle)}
          />
        )
      ) : isError ? (
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
      ) : isGarageEmpty ? (
        <Card className={styles.block} variant="borderless">
          <Empty
            description="В гараже пока нет автомобилей — найдите в общей базе или заведите новое"
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

      {hasQuery ? (
        results.length === 0 && !isSearching ? (
          <div className={styles.footer}>
            <Button size="large" type="primary" onClick={() => setMode('new')}>
              Этого авто ещё нет
            </Button>
          </div>
        ) : null
      ) : isGarageEmpty ? null : (
        <div className={styles.footer}>
          <Button size="large" type="link" onClick={() => setMode('new')}>
            Этого авто ещё нет
          </Button>
        </div>
      )}
    </main>
  );
}
