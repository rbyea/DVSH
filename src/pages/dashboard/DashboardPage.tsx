import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Empty, Input, Pagination, Result, Select, Space, Table, Tag } from 'antd';
import type { TableProps } from 'antd';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

import {
  useGetRepairsQuery,
  type RepairListItem,
  type RepairStatus,
} from '@/entities/repair-order';

import styles from './DashboardPage.module.scss';
import { PAGE_SIZE, statusColors, statusLabels } from './DashboardPageConstants';

function formatUpdatedAt(value: string): string {
  const date = parseISO(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, 'd MMM yyyy, HH:mm', { locale: ru });
}

const columns: TableProps<RepairListItem>['columns'] = [
  {
    title: 'Ремонт',
    dataIndex: 'order_number',
    key: 'order_number',
    render: (_, repair) => (
      <Space orientation="vertical" size={0}>
        <span className={styles.orderNumber}>{repair.order_number}</span>
        <span className={styles.muted}>{repair.car}</span>
      </Space>
    ),
  },
  {
    title: 'Клиент',
    dataIndex: 'client_name',
    key: 'client_name',
  },
  {
    title: 'Статус',
    dataIndex: 'status',
    key: 'status',
    render: (status: RepairStatus) => (
      <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
    ),
  },
  {
    title: 'Обновлено',
    dataIndex: 'updated_at',
    key: 'updated_at',
    render: (value: string) => formatUpdatedAt(value),
  },
  {
    title: 'Сумма',
    dataIndex: 'total_formatted',
    key: 'total_formatted',
    align: 'right',
  },
];

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<RepairStatus | 'all'>('all');
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
  }, [debouncedSearch, status]);

  const { data, isFetching, isError, refetch } = useGetRepairsQuery({
    search: debouncedSearch || undefined,
    status: status === 'all' ? undefined : status,
    page,
    per_page: PAGE_SIZE,
  });

  const repairs = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const showPagination = total > PAGE_SIZE;
  const isEmpty = !isFetching && !isError && repairs.length === 0;
  const hasFilters = Boolean(debouncedSearch) || status !== 'all';

  const emptyNode = isEmpty ? (
    <Empty
      description={
        hasFilters ? 'По выбранным фильтрам ничего не найдено' : 'Пока нет заказ-нарядов'
      }
      image={Empty.PRESENTED_IMAGE_SIMPLE}
    >
      {!hasFilters ? (
        <Link to="/repairs/new">
          <Button type="primary">Создать первый ремонт</Button>
        </Link>
      ) : (
        <Button
          onClick={() => {
            setSearch('');
            setStatus('all');
          }}
        >
          Сбросить фильтры
        </Button>
      )}
    </Empty>
  ) : null;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Рабочий стол</p>
          <h1 className={styles.title}>Ремонты</h1>
          <p className={styles.subtitle}>
            Все текущие машины и статусы работ в одном месте. Откройте карточку, чтобы увидеть
            детали.
          </p>
        </div>

        <Link to="/repairs/new">
          <Button size="large" type="primary">
            Новый ремонт
          </Button>
        </Link>
      </section>

      <section className={styles.controls} aria-label="Фильтры ремонтов">
        <Input
          allowClear
          placeholder="Найти по номеру, клиенту или машине"
          size="large"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <Select<RepairStatus | 'all'>
          size="large"
          value={status}
          options={[
            { label: 'Все статусы', value: 'all' },
            { label: statusLabels.new, value: 'new' },
            { label: statusLabels.pending_approval, value: 'pending_approval' },
            { label: statusLabels.in_progress, value: 'in_progress' },
            { label: statusLabels.waiting_parts, value: 'waiting_parts' },
            { label: statusLabels.done, value: 'done' },
            { label: statusLabels.completed, value: 'completed' },
          ]}
          onChange={setStatus}
        />

        <Button
          size="large"
          onClick={() => {
            setSearch('');
            setStatus('all');
          }}
        >
          Сбросить
        </Button>
      </section>

      {isError ? (
        <Card className={styles.tableCard} variant="borderless">
          <Result
            status="error"
            title="Не удалось загрузить ремонты"
            subTitle="Проверьте соединение и попробуйте ещё раз."
            extra={
              <Button type="primary" onClick={() => void refetch()}>
                Повторить
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <Card className={styles.tableCard} variant="borderless">
            <Table<RepairListItem>
              columns={columns}
              dataSource={repairs}
              loading={isFetching}
              locale={{
                emptyText: emptyNode ?? 'Ремонты не найдены',
              }}
              pagination={
                showPagination
                  ? {
                      current: page,
                      pageSize: PAGE_SIZE,
                      total,
                      showSizeChanger: false,
                      onChange: setPage,
                    }
                  : false
              }
              rowClassName={styles.clickableRow}
              rowKey="id"
              scroll={{ x: 900 }}
              onRow={(repair) => ({
                onClick: () => {
                  navigate(`/repairs/${repair.id}`);
                },
              })}
            />
          </Card>

          <div className={styles.mobileList} aria-busy={isFetching}>
            {isEmpty ? (
              <Card className={styles.mobileEmpty} variant="borderless">
                {emptyNode}
              </Card>
            ) : (
              <>
                <div className={styles.cards}>
                  {repairs.map((repair) => (
                    <button
                      className={styles.mobileCard}
                      key={repair.id}
                      type="button"
                      onClick={() => navigate(`/repairs/${repair.id}`)}
                    >
                      <div className={styles.mobileCardTop}>
                        <span className={styles.orderNumber}>{repair.order_number}</span>
                        <Tag color={statusColors[repair.status]}>{statusLabels[repair.status]}</Tag>
                      </div>
                      <span className={styles.mobileClient}>{repair.client_name}</span>
                      <span className={styles.muted}>{repair.car}</span>
                      <div className={styles.mobileCardBottom}>
                        <span>{formatUpdatedAt(repair.updated_at)}</span>
                        <span className={styles.mobileTotal}>{repair.total_formatted}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {showPagination ? (
                  <Pagination
                    className={styles.mobilePagination}
                    current={page}
                    pageSize={PAGE_SIZE}
                    total={total}
                    onChange={setPage}
                  />
                ) : null}
              </>
            )}
          </div>
        </>
      )}
    </main>
  );
};
