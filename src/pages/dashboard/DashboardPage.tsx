import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Input, Select, Space, Table, Tag, Typography } from 'antd';
import type { TableProps } from 'antd';

import { getMockRepairOrders } from '@/entities/repair-order';
import type { RepairRow, RepairStatus } from './DashboardPageTypes';
import { statusColors, statusLabels } from './DashbordPageConstants';

import styles from './DashboardPage.module.scss';

const columns: TableProps<RepairRow>['columns'] = [
  {
    title: 'Ремонт',
    dataIndex: 'orderNumber',
    key: 'orderNumber',
    render: (_, repair) => (
      <Space direction="vertical" size={0}>
        <span className={styles.orderNumber}>{repair.orderNumber}</span>
        <span className={styles.muted}>{repair.car}</span>
      </Space>
    ),
  },
  {
    title: 'Клиент',
    dataIndex: 'clientName',
    key: 'clientName',
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
    dataIndex: 'updatedAt',
    key: 'updatedAt',
  },
  {
    title: 'Сумма',
    dataIndex: 'total',
    key: 'total',
    align: 'right',
  },
  {
    title: '',
    key: 'action',
    align: 'right',
    render: () => <Button type="link">Открыть</Button>,
  },
];

export function DashboardPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<RepairStatus | 'all'>('all');
  const [repairs, setRepairs] = useState<RepairRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getMockRepairOrders()
      .then((repairOrders) => {
        if (isMounted) {
          setRepairs(repairOrders);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredRepairs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return repairs.filter((repair) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        repair.orderNumber.toLowerCase().includes(normalizedSearch) ||
        repair.clientName.toLowerCase().includes(normalizedSearch) ||
        repair.car.toLowerCase().includes(normalizedSearch);

      const matchesStatus = status === 'all' || repair.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [repairs, search, status]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <Typography.Title className={styles.title} level={1}>
            Ремонты
          </Typography.Title>
          <p className={styles.subtitle}>Все текущие машины и статусы работ в одном месте.</p>
        </div>

        <Link to="/repairs/new">
          <Button size="large" type="primary">
            Новый ремонт
          </Button>
        </Link>
      </header>

      <section className={styles.controls} aria-label="Фильтры ремонтов">
        <Input.Search
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
            { label: statusLabels.diagnostics, value: 'diagnostics' },
            { label: statusLabels.inProgress, value: 'inProgress' },
            { label: statusLabels.waitingParts, value: 'waitingParts' },
            { label: statusLabels.done, value: 'done' },
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

      <Card className={styles.tableCard}>
        <Table<RepairRow>
          columns={columns}
          dataSource={filteredRepairs}
          loading={isLoading}
          locale={{ emptyText: 'Ремонты не найдены' }}
          pagination={{ pageSize: 5, showSizeChanger: false }}
          rowKey="id"
          scroll={{ x: 900 }}
        />
      </Card>
    </main>
  );
}
