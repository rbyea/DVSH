import { Button, Card, Empty, Input, Result, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useGetVehiclesQuery } from '@/entities/vehicle';
import { StationVehiclesList } from '@/widgets/StationVehiclesList';

import styles from './VehiclesPage.module.scss';

const PAGE_SIZE = 8;

export function VehiclesPage() {
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

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Ваша СТО</p>
          <h1 className={styles.title}>Гараж</h1>
          <p className={styles.subtitle}>
            Машины, которые завели в Вашем СТО. Откройте карточку — клиент, история заказов и
            диагностика.
          </p>
        </div>
        <Link to="/repairs/new">
          <Button size="large" type="primary">
            Новый ремонт
          </Button>
        </Link>
      </section>

      <section className={styles.controls} aria-label="Поиск автомобилей">
        <Input
          allowClear
          placeholder="Госномер, VIN, модель или клиент"
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
            status="error"
            title="Не удалось загрузить автомобили"
            subTitle="Проверьте соединение и попробуйте ещё раз."
            extra={
              <Button type="primary" onClick={() => void refetch()}>
                Повторить
              </Button>
            }
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
              hasSearch ? 'По запросу ничего не найдено' : 'В Вашем СТО пока нет автомобилей'
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            {hasSearch ? (
              <Button onClick={() => setSearch('')}>Сбросить поиск</Button>
            ) : (
              <Link to="/repairs/new">
                <Button type="primary">Создать первый ремонт</Button>
              </Link>
            )}
          </Empty>
        </Card>
      ) : (
        <StationVehiclesList
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          vehicles={vehicles}
          onPageChange={setPage}
        />
      )}
    </main>
  );
}
