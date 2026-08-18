import { Button, InputNumber, Segmented, Spin } from 'antd';
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
import { useStationCompletedWorks } from '@/features/station/completed-works';

import styles from './StationCompletedWorksPanel.module.scss';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

type ViewMode = 'masters' | 'overview';

const CHART_COLORS = ['#111827', '#0f766e', '#2563eb', '#64748b', '#b45309', '#7c3aed', '#be185d'];

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
  const [view, setView] = useState<ViewMode>('masters');
  const [isEditingShare, setIsEditingShare] = useState(false);
  const [shareDraft, setShareDraft] = useState<number>(50);

  const { data: station } = useGetStationQuery();
  const [updateStation, { isLoading: isSavingShare }] = useUpdateStationMutation();
  const { stats, sharePercent, refreshSharePercent, isLoading, isError, refetch } =
    useStationCompletedWorks();

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
          backgroundColor: '#111827',
          borderRadius: 6,
        },
      ],
    }),
    [stats.byMaster],
  );

  const shareSplitData = useMemo<ChartData<'doughnut'>>(
    () => ({
      labels: ['Мастерам', 'СТО'],
      datasets: [
        {
          data: [stats.masterShare, stats.stationShare],
          backgroundColor: ['#111827', '#0f766e'],
          borderWidth: 0,
        },
      ],
    }),
    [stats.masterShare, stats.stationShare],
  );

  const worksBarData = useMemo<ChartData<'bar'>>(() => {
    const rows = stats.works.slice(0, 12);
    return {
      labels: rows.map((item) =>
        item.title.length > 28 ? `${item.title.slice(0, 28)}…` : item.title,
      ),
      datasets: [
        {
          label: 'Цена',
          data: rows.map((item) => item.price),
          backgroundColor: '#2563eb',
          borderRadius: 6,
        },
      ],
    };
  }, [stats.works]);

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
          <h2 className={styles.title}>Выполненные работы</h2>
          <p className={styles.hint}>
            Сводка по заказ-нарядам «Готово» и «Выдан» · доля мастера считается от цены работы
          </p>
        </div>
        <Segmented<ViewMode>
          options={[
            { label: 'По мастерам', value: 'masters' },
            { label: 'Общее', value: 'overview' },
          ]}
          value={view}
          onChange={setView}
        />
      </div>

      <div className={styles.shareCard}>
        <div className={styles.shareMain}>
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
                onChange={(value) =>
                  setShareDraft(typeof value === 'number' ? value : sharePercent)
                }
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
                мастер получает {sharePercent}% · СТО {100 - sharePercent}%
              </span>
              <Button size="small" type="link" onClick={handleStartEditShare}>
                Изменить
              </Button>
            </div>
          )}
        </div>
      </div>

      {isError ? (
        <div className={styles.stateBox}>
          <p>Не удалось загрузить работы</p>
          <Button onClick={() => refetch()}>Повторить</Button>
        </div>
      ) : isLoading ? (
        <div className={styles.stateBox}>
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
              <span className={styles.summaryLabel}>Сумма работ</span>
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

          {view === 'masters' ? (
            stats.byMaster.length === 0 ? (
              <p className={styles.empty}>Пока нет выполненных работ с назначенным мастером</p>
            ) : (
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
                    <Bar data={masterBarData} options={barOptions} />
                  </div>
                </article>
              </div>
            )
          ) : stats.works.length === 0 ? (
            <p className={styles.empty}>Выполненных работ пока нет</p>
          ) : (
            <div className={styles.charts}>
              <article className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Мастерам и СТО</h3>
                <div className={styles.doughnutWrap}>
                  <Doughnut data={shareSplitData} options={doughnutOptions} />
                </div>
              </article>
              <article className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Последние работы</h3>
                <div className={styles.barWrap}>
                  <Bar data={worksBarData} options={barOptions} />
                </div>
              </article>
            </div>
          )}
        </>
      )}
    </section>
  );
}
