import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { useMemo, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';

import {
  getRepairCostBreakdown,
  type PublicCurrentRepair,
  type PublicRepairHistoryItem,
} from '@/entities/repair-order';
import { useTheme } from '@/shared/lib/theme';
import { formatMileageDelta, formatMileageKm } from '@/shared/lib/vehicle';

import styles from './PublicMileageChart.module.scss';

ChartJS.register(
  BarController,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
);

type PublicMileageChartProps = {
  currentRepair: PublicCurrentRepair | null;
  previousRepairs: PublicRepairHistoryItem[];
};

type VisitPoint = {
  label: string;
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

function formatVisitLabel(orderNumber: string, at: string | null | undefined): string {
  if (!at) {
    return orderNumber;
  }

  const date = parseISO(at);

  if (Number.isNaN(date.getTime())) {
    return orderNumber;
  }

  return format(date, 'd MMM', { locale: ru });
}

function collectVisits(
  currentRepair: PublicCurrentRepair | null,
  previousRepairs: PublicRepairHistoryItem[],
): VisitPoint[] {
  const past = [...previousRepairs].reverse().map((visit) => ({
    label: formatVisitLabel(visit.order_number, visit.completed_at ?? visit.updated_at),
    orderNumber: visit.order_number,
    mileage: typeof visit.mileage === 'number' ? visit.mileage : null,
    worksCount: countWorks(visit.work_items),
    amount: visitAmount(visit),
  }));

  if (currentRepair && !past.some((visit) => visit.orderNumber === currentRepair.order_number)) {
    past.push({
      label: formatVisitLabel(currentRepair.order_number, currentRepair.updated_at),
      orderNumber: currentRepair.order_number,
      mileage: typeof currentRepair.mileage === 'number' ? currentRepair.mileage : null,
      worksCount: countWorks(currentRepair.work_items),
      amount: visitAmount(currentRepair),
    });
  }

  return past.filter((visit) => visit.mileage != null || visit.worksCount > 0 || visit.amount > 0);
}

function readCssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  return value || fallback;
}

function readChartPalette(_theme: string) {
  return {
    ink: readCssVar('--dvsh-ink', '#111827'),
    muted: readCssVar('--dvsh-muted', '#6b7280'),
    line: readCssVar('--dvsh-line', '#e5e7eb'),
    accent: readCssVar('--dvsh-accent', '#2563eb'),
  };
}

function withAlpha(color: string, alpha: number): string {
  const hex = color.trim();

  if (!hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) {
    return color;
  }

  const raw =
    hex.length === 4 ? `${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex.slice(1);
  const value = Number.parseInt(raw, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;

  return `rgb(${r} ${g} ${b} / ${alpha})`;
}

export function PublicMileageChart({ currentRepair, previousRepairs }: PublicMileageChartProps) {
  const { theme } = useTheme();
  const visits = useMemo(
    () => collectVisits(currentRepair, previousRepairs),
    [currentRepair, previousRepairs],
  );

  const palette = useMemo(() => readChartPalette(theme), [theme]);

  const mileageVisits = visits.filter((visit) => visit.mileage != null);
  const showMileage = mileageVisits.length >= 1;
  const latestMileage = [...mileageVisits].at(-1)?.mileage ?? null;
  const firstMileage = mileageVisits[0]?.mileage ?? null;
  const mileageDelta =
    firstMileage != null && latestMileage != null && mileageVisits.length > 1
      ? formatMileageDelta(firstMileage, latestMileage)
      : null;

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectedVisit = selectedIndex != null ? (visits[selectedIndex] ?? null) : null;

  const pickVisit = (elements: Array<{ index: number }>) => {
    const index = elements[0]?.index;

    if (index == null) {
      setSelectedIndex(null);
      return;
    }

    setSelectedIndex((current) => (current === index ? null : index));
  };

  const mileageData = useMemo<ChartData<'line', Array<number | null>, string>>(
    () => ({
      labels: visits.map((visit) => visit.label),
      datasets: [
        {
          label: 'Пробег, км',
          data: visits.map((visit) => visit.mileage),
          borderColor: palette.accent,
          backgroundColor: withAlpha(palette.accent, 0.14),
          fill: true,
          spanGaps: true,
          tension: 0.3,
          pointRadius: visits.map((_, index) => (index === selectedIndex ? 8 : 6)),
          pointHoverRadius: 9,
          pointHitRadius: 18,
          pointBackgroundColor: visits.map((_, index) =>
            index === selectedIndex ? palette.ink : palette.accent,
          ),
          pointBorderColor: palette.accent,
          pointBorderWidth: 2,
          borderWidth: 3,
        },
      ],
    }),
    [palette.accent, palette.ink, selectedIndex, visits],
  );

  const mileageOptions = useMemo<ChartOptions<'line'>>(
    () => ({
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      onClick: (_event, elements) => pickVisit(elements),
      onHover: (event, elements) => {
        const target = event.native?.target;

        if (target instanceof HTMLElement) {
          target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: palette.muted,
            font: { size: 12, weight: 600 },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 5,
          },
          border: { display: false },
        },
        y: {
          grace: '8%',
          ticks: {
            color: palette.muted,
            font: { size: 12 },
            maxTicksLimit: 4,
            padding: 6,
            callback: (value) => {
              const amount = Number(value);

              if (amount >= 1000) {
                return `${Math.round(amount / 1000)}\u00a0тыс.`;
              }

              return String(amount);
            },
          },
          grid: { color: palette.line },
          border: { display: false },
        },
      },
    }),
    [palette.line, palette.muted],
  );

  const amountData = useMemo<ChartData<'bar', number[], string>>(
    () => ({
      labels: visits.map((visit) => visit.label),
      datasets: [
        {
          label: 'Сумма визита',
          data: visits.map((visit) => visit.amount),
          backgroundColor: visits.map((_, index) =>
            index === selectedIndex ? palette.ink : palette.accent,
          ),
          borderRadius: 8,
          maxBarThickness: 36,
        },
      ],
    }),
    [palette.accent, palette.ink, selectedIndex, visits],
  );

  const amountOptions = useMemo<ChartOptions<'bar'>>(
    () => ({
      maintainAspectRatio: false,
      onClick: (_event, elements) => pickVisit(elements),
      onHover: (event, elements) => {
        const target = event.native?.target;

        if (target instanceof HTMLElement) {
          target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: palette.muted,
            font: { size: 12, weight: 600 },
            autoSkip: true,
            maxTicksLimit: 5,
          },
          border: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: palette.muted,
            font: { size: 12 },
            padding: 6,
            callback: (value) => {
              const amount = Number(value);

              if (amount >= 1000) {
                return `${Math.round(amount / 1000)}\u00a0тыс.`;
              }

              return String(amount);
            },
            maxTicksLimit: 4,
          },
          grid: { color: palette.line },
          border: { display: false },
        },
      },
    }),
    [palette.line, palette.muted],
  );

  if (visits.length === 0) {
    return null;
  }

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <p className={styles.title}>{showMileage ? 'Пробег' : 'Сумма визитов'}</p>
        {showMileage && latestMileage != null ? (
          <p className={styles.totals}>
            <span className={styles.totalKm}>{formatMileageKm(latestMileage)}</span>
            {mileageDelta ? <span className={styles.totalDelta}>{mileageDelta}</span> : null}
          </p>
        ) : null}
      </div>
      <div className={styles.chartWrap}>
        <div className={styles.chart}>
          {showMileage ? (
            <Line data={mileageData} options={mileageOptions} />
          ) : (
            <Bar data={amountData} options={amountOptions} />
          )}
        </div>
        {selectedVisit ? (
          <div className={styles.popup} role="status">
            <div className={styles.popupHead}>
              <p className={styles.popupOrder}>
                {selectedVisit.orderNumber}
                <span className={styles.popupDate}> · {selectedVisit.label}</span>
              </p>
              <button
                className={styles.popupClose}
                type="button"
                onClick={() => setSelectedIndex(null)}
              >
                Закрыть
              </button>
            </div>
            <div className={styles.popupFacts}>
              {selectedVisit.mileage != null ? (
                <p className={styles.fact}>
                  <span>Пробег</span>
                  <strong>{formatMileageKm(selectedVisit.mileage)}</strong>
                </p>
              ) : null}
              {selectedVisit.worksCount > 0 ? (
                <p className={styles.fact}>
                  <span>Работы</span>
                  <strong>{formatWorksCount(selectedVisit.worksCount)}</strong>
                </p>
              ) : null}
              {selectedVisit.amount > 0 ? (
                <p className={styles.fact}>
                  <span>Сумма</span>
                  <strong>{formatMoney(selectedVisit.amount)}</strong>
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className={styles.tapHint}>Нажмите точку на графике</p>
        )}
      </div>
    </div>
  );
}
