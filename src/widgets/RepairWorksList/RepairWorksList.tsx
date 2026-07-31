import { useRepairCreateContext } from '@/features/repair-order/create';
import { Collapse, Typography } from 'antd';
import type { CollapseProps } from 'antd/lib/collapse';

export const RepairWorksList = () => {
  const { selectedVehicle } = useRepairCreateContext();

  const items: CollapseProps['items'] =
    selectedVehicle?.previousRepairs?.map((repair) => ({
      key: repair.orderNumber,
      label: `${repair.orderNumber} · ${repair.title}`,
      children: (
        <>
          <p>
            <strong>Работа:</strong> {repair.title}
          </p>
          <p>
            <strong>Дата:</strong> {repair.completedAt}
          </p>
        </>
      ),
    })) ?? [];

  return (
    <>
      <Typography.Title level={5}>
        Список ремонтов для {selectedVehicle?.licensePlate} · {selectedVehicle?.vin}
      </Typography.Title>
      <Collapse items={items} defaultActiveKey={['1']} />
    </>
  );
};
