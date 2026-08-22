import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { useMemo } from 'react';
import { Chart } from 'react-chartjs-2';

import {
  getRepairCostBreakdown,
  type PublicCurrentRepair,
  type PublicRepairHistoryItem,
} from '@/entities/repair-order';
import { formatMileageKm } from '@/shared/lib/vehicle';

import styles from './PublicMileageChart.module.scss';

ChartJS.register(
  BarController,
  BarElement,
  CategoryScale,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

type PublicMileageChartProps = {
  currentRepair: PublicCurrentRepair | null;
  previousRepairs: PublicRepairHistoryItem[];
};

type VisitPoint = {
  orderNumber: string;
  mileage: number | null;
  worksCount: number;
  amount: number;
};

function countWorks(items: PublicRepairHistoryItem['work_items']): number {
  const raw = items ?? [];
  const done = raw.filter((item) => item.is_done === true);

  return (done.length > 0 ? done : raw).length;
}

function visitAmount(visit: {
  work_items?: PublicRepairHistoryItem['work_items'];
  ordered_parts?: PublicRepairHistoryItem['ordered_parts'];
  total?: number | null;
}): number {
  const calculated = getRepairCostBreakdown({
    workItems: visit.work_items,
    orderedParts: visit.ordered_parts,
  }).calculatedTotal;

  return calculated > 0 ? calculated : 0;
}

function formatWorksCount(value: number): string {
  const abs = Math.abs(value) % 100;
  const last = abs % 10;

  if (abs > 10 && abs < 20) {
    return `${value} работ`;
  }

  if (last === 1) {
    return `${value} работа`;
  }

  if (last >= 2 && last <= 4) {
    return `${value} работы`;
  }

  return `${value} работ`;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

function collectVisits(
  currentRepair: PublicCurrentRepair | null,
  previousRepairs: PublicRepairHistoryItem[],
): VisitPoint[] {
  const past = [...previousRepairs].reverse().map((visit) => ({
    orderNumber: visit.order_number,
    mileage: typeof visit.mileage === 'number' ? visit.mileage : null,
    worksCount: countWorks(visit.work_items),
    amount: visitAmount(visit),
  }));

  if (currentRepair && !past.some((visit) => visit.orderNumber === currentRepair.order_number)) {
    past.push({
      orderNumber: currentRepair.order_number,
      mileage: typeof currentRepair.mileage === 'number' ? currentRepair.mileage : null,
      worksCount: countWorks(currentRepair.work_items),
      amount: visitAmount(currentRepair),
    });
  }

  return past.filter((visit) => visit.mileage != null || visit.worksCount > 0);
}

export function PublicMileageChart({ currentRepair, previousRepairs }: PublicMileageChartProps) {
  const visits = useMemo(
    () => collectVisits(currentRepair, previousRepairs),
    [currentRepair, previousRepairs],
  );

  const latestMileage =
    [...visits].reverse().find((visit) => visit.mileage != null)?.mileage ?? null;
  const totalWorks = visits.reduce((sum, visit) => sum + visit.worksCount, 0);

  const data = useMemo<ChartData<'bar' | 'line', Array<number | null>, string>>(() => {
    return {
      labels: visits.map((visit) => visit.orderNumber),
      datasets: [
        {
          type: 'bar',
          label: 'Работы',
          data: visits.map((visit) => visit.worksCount),
          yAxisID: 'yWorks',
          borderRadius: 8,
          maxBarThickness: 28,
          backgroundColor: 'rgb(37 99 235 / 28%)',
          hoverBackgroundColor: 'rgb(37 99 235 / 42%)',
        },
        {
          type: 'line',
          label: 'Пробег',
          data: visits.map((visit) => visit.mileage),
          yAxisID: 'yKm',
          borderColor: '#0f766e',
          backgroundColor: 'rgb(15 118 110 / 10%)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#0f766e',
          borderWidth: 2,
        },
      ],
    };
  }, [visits]);

  const options = useMemo<ChartOptions<'bar' | 'line'>>(
    () => ({
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => items[0]?.label ?? '',
            label: (item) => {
              if (item.dataset.yAxisID === 'yKm') {
                const value = item.parsed.y;

                return typeof value === 'number' ? `Пробег ${formatMileageKm(value)}` : '';
              }

              const visit = visits[item.dataIndex];
              const works = formatWorksCount(Number(item.parsed.y ?? 0));

              if (visit && visit.amount > 0) {
                return `${works} · ${formatMoney(visit.amount)}`;
              }

              return works;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 }, color: '#64748b' },
          border: { display: false },
        },
        yKm: {
          position: 'left',
          grace: '8%',
          ticks: {
            font: { size: 10 },
            color: '#0f766e',
            callback: (value) => {
              const amount = Number(value);

              if (amount >= 1000) {
                return `${Math.round(amount / 1000)} тыс.`;
              }

              return String(amount);
            },
          },
          grid: { color: 'rgb(15 23 42 / 6%)' },
          border: { display: false },
        },
        yWorks: {
          position: 'right',
          beginAtZero: true,
          suggestedMax: Math.max(3, ...visits.map((visit) => visit.worksCount)),
          ticks: {
            stepSize: 1,
            font: { size: 10 },
            color: '#2563eb',
            precision: 0,
          },
          grid: { display: false },
          border: { display: false },
        },
      },
    }),
    [visits],
  );

  if (visits.length === 0) {
    return null;
  }

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <div>
          <p className={styles.title}>Пробег и работы</p>
          <p className={styles.hint}>Столбик — сколько сделали, линия — км на визите</p>
        </div>
        <div className={styles.totals}>
          {latestMileage != null ? (
            <span className={styles.totalKm}>{formatMileageKm(latestMileage)}</span>
          ) : null}
          {totalWorks > 0 ? (
            <span className={styles.totalWorks}>{formatWorksCount(totalWorks)}</span>
          ) : null}
        </div>
      </div>
      <div className={styles.chart}>
        <Chart data={data} options={options} type="bar" />
      </div>
    </div>
  );
}
