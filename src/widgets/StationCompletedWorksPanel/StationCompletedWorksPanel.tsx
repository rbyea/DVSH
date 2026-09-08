import { Button, DatePicker, Segmented, Spin } from 'antd';
import dayjs from 'dayjs';
import clsx from 'clsx';
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
  type Plugin,
} from 'chart.js';
import { useMemo, useState } from 'react';
import { Bar, Chart } from 'react-chartjs-2';
import {
  useStationCompletedWorks,
  type CompletedWorksPeriod,
} from '@/features/station/completed-works';
import { useTheme } from '@/shared/lib/theme';

import { buildWorksTrend } from './buildWorksTrend';
import styles from './StationCompletedWorksPanel.module.scss';

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

type ViewMode = 'works' | 'masters';

const PERIOD_OPTIONS: Array<{ id: CompletedWorksPeriod; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'week', label: '7 дней' },
  { id: 'month', label: 'Месяц' },
  { id: 'quarter', label: 'Квартал' },
  { id: 'custom', label: 'Свой' },
];

const CHART_TOP = 12;
const BAR_ROW_PX = 44;

function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
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

function wrapTick(label: string, max = 24): string | string[] {
  if (label.length <= max) {
    return label;
  }

  const cut = label.lastIndexOf(' ', max);
  const at = cut > 10 ? cut : max;
  const first = label.slice(0, at).trim();
  let second = label.slice(at).trim();

  if (second.length > max) {
    second = `${second.slice(0, max - 1)}…`;
  }

  return [first, second];
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

function barLabelPlugin(formatValue: (value: number) => string, ink: string): Plugin<'bar'> {
  return {
    id: 'barEndLabels',
    afterDatasetsDraw(chart) {
      const meta = chart.getDatasetMeta(0);
      const dataset = chart.data.datasets[0];
      const { ctx } = chart;

      ctx.save();
      ctx.font = '600 12px Manrope, system-ui, sans-serif';
      ctx.fillStyle = ink;
      ctx.textBaseline = 'middle';

      meta.data.forEach((element, index) => {
        const raw = Number(dataset.data[index] ?? 0);
        const label = formatValue(raw);
        const { x, y } = element;
        const area = chart.chartArea;
        const fitsInside = x + ctx.measureText(label).width + 16 < area.right;
        ctx.textAlign = fitsInside ? 'left' : 'right';
        ctx.fillText(label, fitsInside ? x + 8 : x - 8, y);
      });

      ctx.restore();
    },
  };
}

export function StationCompletedWorksPanel() {
  const { theme } = useTheme();
  const [view, setView] = useState<ViewMode>('works');
  const { stats, period, setPeriod, customRange, setCustomRange, isLoading, isError, refetch } =
    useStationCompletedWorks();

  const palette = useMemo(() => readChartPalette(theme), [theme]);

  const masterRows = stats.byMaster.slice(0, CHART_TOP);
  const trend = useMemo(
    () => buildWorksTrend(stats.works, period, customRange),
    [customRange, period, stats.works],
  );
  const moneyColor = '#14b8a6';

  const masterBarData = useMemo<ChartData<'bar'>>(
    () => ({
      labels: masterRows.map((item) => item.fullName),
      datasets: [
        {
          label: 'Сумма работ',
          data: masterRows.map((item) => item.amount),
          backgroundColor: palette.accent,
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: 28,
        },
      ],
    }),
    [masterRows, palette.accent],
  );

  const moneyBarOptions = useMemo<ChartOptions<'bar'>>(
    () => ({
      indexAxis: 'y',
      maintainAspectRatio: false,
      layout: { padding: { right: 12 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => String(items[0]?.label ?? ''),
            label: (item) => {
              const row = masterRows[item.dataIndex];

              if (!row) {
                return formatMoney(Number(item.parsed.x));
              }

              return [
                formatMoney(row.amount),
                formatWorksCount(row.worksCount),
                `мастер ${formatMoney(row.masterShare)}`,
                `СТО ${formatMoney(row.stationShare)}`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: (value) => formatMoney(Number(value)),
            color: palette.muted,
            font: { size: 11 },
            maxTicksLimit: 5,
          },
          grid: { color: palette.line },
          border: { display: false },
        },
        y: {
          ticks: {
            color: palette.ink,
            font: { size: 12, weight: 600 },
            autoSkip: false,
            callback(_value, index) {
              return wrapTick(String(masterRows[index]?.fullName ?? ''), 20);
            },
          },
          grid: { display: false },
          border: { display: false },
        },
      },
    }),
    [masterRows, palette.ink, palette.line, palette.muted],
  );

  const moneyPlugins = useMemo(
    () => [barLabelPlugin((value) => formatMoney(value), palette.ink)],
    [palette.ink],
  );

  const worksTrendData = useMemo<ChartData<'bar' | 'line', number[], string>>(
    () => ({
      labels: trend.map((point) => point.label),
      datasets: [
        {
          type: 'bar',
          label: 'Работы',
          data: trend.map((point) => point.count),
          yAxisID: 'yCount',
          borderRadius: 8,
          maxBarThickness: 28,
          backgroundColor: withAlpha(palette.accent, 0.28),
          hoverBackgroundColor: withAlpha(palette.accent, 0.42),
        },
        {
          type: 'line',
          label: 'Сумма',
          data: trend.map((point) => point.amount),
          yAxisID: 'yMoney',
          borderColor: moneyColor,
          backgroundColor: withAlpha(moneyColor, 0.12),
          fill: true,
          tension: 0.35,
          pointRadius: trend.length > 20 ? 0 : 4,
          pointHoverRadius: 6,
          pointBackgroundColor: moneyColor,
          borderWidth: 2,
        },
      ],
    }),
    [palette.accent, trend],
  );

  const mastersTrendData = useMemo<ChartData<'line', number[], string>>(
    () => ({
      labels: trend.map((point) => point.label),
      datasets: [
        {
          label: 'СТО',
          data: trend.map((point) => point.stationShare),
          borderColor: moneyColor,
          backgroundColor: withAlpha(moneyColor, 0.14),
          fill: true,
          tension: 0.35,
          pointRadius: trend.length > 20 ? 0 : 3,
          borderWidth: 2,
        },
        {
          label: 'Мастерам',
          data: trend.map((point) => point.masterShare),
          borderColor: palette.accent,
          backgroundColor: withAlpha(palette.accent, 0.1),
          fill: true,
          tension: 0.35,
          pointRadius: trend.length > 20 ? 0 : 3,
          borderWidth: 2,
        },
      ],
    }),
    [palette.accent, trend],
  );

  const worksTrendOptions = useMemo<ChartOptions<'bar' | 'line'>>(
    () => ({
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, color: palette.ink, font: { size: 14 } },
        },
        tooltip: {
          titleFont: { size: 14 },
          bodyFont: { size: 14 },
          callbacks: {
            label: (item) => {
              if (item.dataset.yAxisID === 'yMoney') {
                return `Сумма ${formatMoney(Number(item.parsed.y ?? 0))}`;
              }

              return formatWorksCount(Number(item.parsed.y ?? 0));
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: palette.muted, font: { size: 13 }, maxRotation: 0, autoSkip: true },
          border: { display: false },
        },
        yCount: {
          position: 'left',
          beginAtZero: true,
          ticks: { stepSize: 1, color: palette.muted, font: { size: 13 } },
          grid: { color: palette.line },
          border: { display: false },
        },
        yMoney: {
          position: 'right',
          beginAtZero: true,
          ticks: {
            color: palette.muted,
            font: { size: 13 },
            callback: (value) => formatMoney(Number(value)),
            maxTicksLimit: 5,
          },
          grid: { display: false },
          border: { display: false },
        },
      },
    }),
    [palette.ink, palette.line, palette.muted],
  );

  const mastersTrendOptions = useMemo<ChartOptions<'line'>>(
    () => ({
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, color: palette.ink, font: { size: 14 } },
        },
        tooltip: {
          titleFont: { size: 14 },
          bodyFont: { size: 14 },
          callbacks: {
            label: (item) => `${item.dataset.label}: ${formatMoney(Number(item.parsed.y ?? 0))}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: palette.muted, font: { size: 13 }, maxRotation: 0, autoSkip: true },
          border: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: palette.muted,
            font: { size: 13 },
            callback: (value) => formatMoney(Number(value)),
            maxTicksLimit: 5,
          },
          grid: { color: palette.line },
          border: { display: false },
        },
      },
    }),
    [palette.ink, palette.line, palette.muted],
  );

  const mastersHidden = stats.byMaster.length - masterRows.length;

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Сводка</h2>
          <p className={styles.hint}>
            Заказ-наряды «Готово» и «Выдан». Доля считается по всем работам, даже без мастера.
          </p>
        </div>
        <div className={styles.headControls}>
          <div className={styles.periodChips} role="tablist" aria-label="Период">
            {PERIOD_OPTIONS.map((option) => (
              <button
                className={clsx(styles.periodChip, period === option.id && styles.periodChipActive)}
                key={option.id}
                type="button"
                onClick={() => setPeriod(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Segmented<ViewMode>
            options={[
              { label: 'По работам', value: 'works' },
              { label: 'По мастерам', value: 'masters' },
            ]}
            value={view}
            onChange={setView}
          />
        </div>
      </div>

      {period === 'custom' ? (
        <DatePicker.RangePicker
          allowClear
          className={styles.customRange}
          format="DD.MM.YYYY"
          size="large"
          value={
            customRange
              ? [dayjs(customRange[0], 'YYYY-MM-DD'), dayjs(customRange[1], 'YYYY-MM-DD')]
              : null
          }
          onChange={(dates) => {
            if (!dates || !dates[0] || !dates[1]) {
              setCustomRange(null);
              return;
            }

            setCustomRange([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]);
          }}
        />
      ) : null}

      {isError ? (
        <div className={styles.emptyBox}>
          <p className={styles.emptyTitle}>Не удалось загрузить работы</p>
          <Button onClick={() => refetch()}>Повторить</Button>
        </div>
      ) : isLoading ? (
        <div className={styles.loading}>
          <Spin />
        </div>
      ) : (
        <>
          <div className={styles.summary}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Работ</span>
              <span className={styles.summaryValue}>{stats.worksCount}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Сумма</span>
              <span className={styles.summaryValue}>{formatMoney(stats.amount)}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Мастерам</span>
              <span className={styles.summaryValue}>{formatMoney(stats.masterShare)}</span>
            </div>
            <div className={clsx(styles.summaryItem, styles.summaryAccent)}>
              <span className={styles.summaryLabel}>СТО</span>
              <span className={styles.summaryValue}>{formatMoney(stats.stationShare)}</span>
            </div>
          </div>

          {stats.worksCount === 0 ? null : view === 'works' ? (
            <article className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Динамика</h3>
              <p className={styles.chartHint}>Сумма и число работ за период</p>
              <div className={styles.trendWrap}>
                <Chart data={worksTrendData} options={worksTrendOptions} type="bar" />
              </div>
            </article>
          ) : (
            <article className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Динамика долей</h3>
              <p className={styles.chartHint}>Как делилась сумма между СТО и мастерами</p>
              <div className={styles.trendWrap}>
                <Chart data={mastersTrendData} options={mastersTrendOptions} type="line" />
              </div>
            </article>
          )}

          {view === 'works' ? (
            stats.worksCount === 0 ? (
              <div className={styles.emptyBox}>
                <p className={styles.emptyTitle}>Выполненных работ пока нет</p>
                <p className={styles.emptyText}>
                  Когда заказ-наряд станет «Готово» или «Выдан», работы появятся здесь.
                </p>
              </div>
            ) : null
          ) : masterRows.length === 0 ? (
            <div className={styles.emptyBox}>
              <p className={styles.emptyTitle}>Выполненных работ пока нет</p>
              <p className={styles.emptyText}>
                Когда заказ-наряд станет «Готово» или «Выдан», работы появятся здесь. Доля мастерам
                считается и без карточки мастера.
              </p>
            </div>
          ) : (
            <article className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Сумма по мастерам</h3>
              {mastersHidden > 0 ? (
                <p className={styles.chartHint}>Показаны топ-{CHART_TOP} мастеров</p>
              ) : null}
              <div
                className={styles.barWrap}
                style={{ height: Math.max(160, masterRows.length * BAR_ROW_PX) }}
              >
                <Bar data={masterBarData} options={moneyBarOptions} plugins={moneyPlugins} />
              </div>
            </article>
          )}
        </>
      )}
    </section>
  );
}
