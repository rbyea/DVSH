import { Button, DatePicker, InputNumber, Segmented, Spin } from 'antd';
import dayjs from 'dayjs';
import clsx from 'clsx';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { useMemo, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Bounce, toast } from 'react-toastify';

import {
  normalizeMasterSharePercent,
  useGetStationQuery,
  useUpdateStationMutation,
  writeLocalMasterSharePercent,
} from '@/entities/master';
import {
  useStationCompletedWorks,
  type CompletedWorksPeriod,
} from '@/features/station/completed-works';

import styles from './StationCompletedWorksPanel.module.scss';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

type ViewMode = 'works' | 'masters';

const PERIOD_OPTIONS: Array<{ id: CompletedWorksPeriod; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'week', label: '7 дней' },
  { id: 'month', label: 'Месяц' },
  { id: 'quarter', label: 'Квартал' },
  { id: 'custom', label: 'Свой' },
];

const CHART_COLORS = ['#0f766e', '#2563eb', '#111827', '#64748b', '#b45309', '#7c3aed', '#be185d'];

function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMoneyTooltip(value: number, label: string): string {
  return `${label}: ${formatMoney(value)}`;
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

function formatHours(value: number): string | null {
  if (value <= 0) {
    return null;
  }

  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} ч`;
}

const doughnutOptions: ChartOptions<'doughnut'> = {
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { boxWidth: 12, font: { size: 12 } },
    },
    tooltip: {
      callbacks: {
        label: (item) => formatMoneyTooltip(Number(item.parsed), item.label),
      },
    },
  },
};

const barOptions: ChartOptions<'bar'> = {
  indexAxis: 'y',
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (item) => `${item.parsed.x} шт.`,
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: {
        stepSize: 1,
        font: { size: 11 },
      },
      grid: { color: '#e5e7eb' },
    },
    y: {
      ticks: { font: { size: 11 } },
      grid: { display: false },
    },
  },
};

const moneyBarOptions: ChartOptions<'bar'> = {
  ...barOptions,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (item) => formatMoneyTooltip(Number(item.parsed.x), item.label),
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: {
        callback: (value) => formatMoney(Number(value)),
        font: { size: 11 },
      },
      grid: { color: '#e5e7eb' },
    },
    y: {
      ticks: { font: { size: 11 } },
      grid: { display: false },
    },
  },
};

export function StationCompletedWorksPanel() {
  const [view, setView] = useState<ViewMode>('works');
  const [isEditingShare, setIsEditingShare] = useState(false);
  const [shareDraft, setShareDraft] = useState<number>(50);

  const { data: station } = useGetStationQuery();
  const [updateStation, { isLoading: isSavingShare }] = useUpdateStationMutation();
  const {
    stats,
    period,
    setPeriod,
    customRange,
    setCustomRange,
    sharePercent,
    refreshSharePercent,
    isLoading,
    isError,
    refetch,
  } = useStationCompletedWorks();

  const masterAmountData = useMemo<ChartData<'doughnut'>>(
    () => ({
      labels: stats.byMaster.map((item) => item.fullName),
      datasets: [
        {
          data: stats.byMaster.map((item) => item.amount),
          backgroundColor: stats.byMaster.map(
            (_, index) => CHART_COLORS[index % CHART_COLORS.length],
          ),
          borderWidth: 0,
        },
      ],
    }),
    [stats.byMaster],
  );

  const masterBarData = useMemo<ChartData<'bar'>>(
    () => ({
      labels: stats.byMaster.map((item) => item.fullName),
      datasets: [
        {
          label: 'Сумма работ',
          data: stats.byMaster.map((item) => item.amount),
          backgroundColor: '#0f766e',
          borderRadius: 6,
        },
      ],
    }),
    [stats.byMaster],
  );

  const titleBarData = useMemo<ChartData<'bar'>>(() => {
    const rows = stats.byTitle.slice(0, 10);
    return {
      labels: rows.map((item) =>
        item.title.length > 32 ? `${item.title.slice(0, 32)}…` : item.title,
      ),
      datasets: [
        {
          label: 'Количество',
          data: rows.map((item) => item.worksCount),
          backgroundColor: '#2563eb',
          borderRadius: 6,
        },
      ],
    };
  }, [stats.byTitle]);

  const handleStartEditShare = () => {
    setShareDraft(sharePercent);
    setIsEditingShare(true);
  };

  const handleSaveShare = async () => {
    const next = normalizeMasterSharePercent(shareDraft);
    writeLocalMasterSharePercent(next);

    try {
      await updateStation({
        name: station?.name,
        master_share_percent: next,
      }).unwrap();
      toast.success(`Доля мастера: ${next}%`, {
        position: 'top-right',
        transition: Bounce,
      });
    } catch {
      toast.success(`Доля мастера: ${next}% (сохранено на этом устройстве)`, {
        position: 'top-right',
        transition: Bounce,
      });
    } finally {
      refreshSharePercent();
      setIsEditingShare(false);
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Сводка</h2>
          <p className={styles.hint}>
            Заказ-наряды «Готово» и «Выдан». Одинаковые работы считаются вместе.
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

      <div className={styles.shareCard}>
        <span className={styles.shareLabel}>Доля мастерам</span>
        {isEditingShare ? (
          <div className={styles.shareEdit}>
            <InputNumber
              addonAfter="%"
              className={styles.shareInput}
              max={100}
              min={0}
              size="large"
              value={shareDraft}
              onChange={(value) => setShareDraft(typeof value === 'number' ? value : sharePercent)}
            />
            <Button disabled={isSavingShare} onClick={() => setIsEditingShare(false)}>
              Отмена
            </Button>
            <Button loading={isSavingShare} type="primary" onClick={() => void handleSaveShare()}>
              Сохранить
            </Button>
          </div>
        ) : (
          <div className={styles.shareValueRow}>
            <strong className={styles.shareValue}>{sharePercent}%</strong>
            <span className={styles.shareHint}>
              мастер {sharePercent}% · СТО {100 - sharePercent}%
            </span>
            <Button size="small" type="link" onClick={handleStartEditShare}>
              Изменить
            </Button>
          </div>
        )}
      </div>

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

          {view === 'works' ? (
            stats.byTitle.length === 0 ? (
              <div className={styles.emptyBox}>
                <p className={styles.emptyTitle}>Выполненных работ пока нет</p>
                <p className={styles.emptyText}>
                  Когда заказ-наряд станет «Готово» или «Выдан», работы появятся здесь.
                </p>
              </div>
            ) : (
              <>
                {stats.byTitle.length > 1 ? (
                  <article className={styles.chartCard}>
                    <h3 className={styles.chartTitle}>Сколько раз делали</h3>
                    <div className={styles.barWrap}>
                      <Bar data={titleBarData} options={barOptions} />
                    </div>
                  </article>
                ) : null}

                <ul className={styles.rankList}>
                  {stats.byTitle.map((item, index) => (
                    <li className={styles.rankItem} key={`${item.title}-${index}`}>
                      <span className={styles.rankIndex}>{index + 1}</span>
                      <div className={styles.rankMain}>
                        <span className={styles.rankTitle}>{item.title}</span>
                        <span className={styles.rankMeta}>
                          {formatWorksCount(item.worksCount)}
                          {formatHours(item.hours) ? ` · ${formatHours(item.hours)}` : ''}
                        </span>
                      </div>
                      <div className={styles.rankAside}>
                        <span className={styles.rankCount}>{item.worksCount}</span>
                        <span className={styles.rankAmount}>{formatMoney(item.amount)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )
          ) : stats.byMaster.length === 0 ? (
            <div className={styles.emptyBox}>
              <p className={styles.emptyTitle}>Нет работ с мастером</p>
              <p className={styles.emptyText}>
                Назначьте мастера на работу в заказ-наряде — он появится в сводке.
              </p>
            </div>
          ) : (
            <>
              <div className={styles.charts}>
                <article className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>Сумма по мастерам</h3>
                  <div className={styles.doughnutWrap}>
                    <Doughnut data={masterAmountData} options={doughnutOptions} />
                  </div>
                </article>
                <article className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>Сравнение сумм</h3>
                  <div className={styles.barWrap}>
                    <Bar data={masterBarData} options={moneyBarOptions} />
                  </div>
                </article>
              </div>
              <ul className={styles.rankList}>
                {stats.byMaster.map((item, index) => (
                  <li className={styles.rankItem} key={item.masterId}>
                    <span className={styles.rankIndex}>{index + 1}</span>
                    <div className={styles.rankMain}>
                      <span className={styles.rankTitle}>{item.fullName}</span>
                      <span className={styles.rankMeta}>
                        {item.specialty ? `${item.specialty} · ` : ''}
                        {formatWorksCount(item.worksCount)}
                      </span>
                    </div>
                    <div className={styles.rankAside}>
                      <span className={styles.rankCount}>{item.worksCount}</span>
                      <span className={styles.rankAmount}>{formatMoney(item.amount)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
