import { Collapse, Typography } from 'antd';
import type { CollapseProps } from 'antd/lib/collapse';

import { useRepairCreateContext } from '@/features/repair-order/create';

import styles from './RepairWorksList.module.scss';

export const RepairWorksList = () => {
  const { selectedVehicle } = useRepairCreateContext();
  const previousRepairs = selectedVehicle?.previous_repairs ?? [];

  if (!selectedVehicle || previousRepairs.length === 0) {
    return null;
  }

  const items: CollapseProps['items'] = previousRepairs.map((repair) => ({
    key: repair.id,
    label: `${repair.order_number} · ${repair.title}`,
    children: (
      <div className={styles.itemBody}>
        <span>Работа: {repair.title}</span>
        <span>Дата: {repair.completed_at ?? '—'}</span>
      </div>
    ),
  }));

  return (
    <div className={styles.wrap}>
      <Typography.Text className={styles.label}>История по этому авто</Typography.Text>
      <Collapse ghost items={items} size="small" />
    </div>
  );
};
