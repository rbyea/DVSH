import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, DatePicker, Input, InputNumber, Select, Spin } from 'antd';
import clsx from 'clsx';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { useMemo, useState } from 'react';
import { Bounce, toast } from 'react-toastify';

import {
  getStationMasterSharePercent,
  normalizeMasterSharePercent,
  useCreatePayoutExtraMutation,
  useDeletePayoutExtraMutation,
  useGetMastersQuery,
  useGetStationPayoutsQuery,
  useGetStationQuery,
  useTogglePayoutExtraSettleMutation,
  useTogglePayoutSettlementMutation,
  useUpdateStationMutation,
  writeLocalMasterSharePercent,
  type PayoutBucket,
  type PayoutDay,
} from '@/entities/master';
import { getErrorMessage } from '@/shared/lib/api';

import styles from './StationPayoutsPanel.module.scss';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const MONTH_OPTIONS = [
  { value: 0, label: 'Январь' },
  { value: 1, label: 'Февраль' },
  { value: 2, label: 'Март' },
  { value: 3, label: 'Апрель' },
  { value: 4, label: 'Май' },
  { value: 5, label: 'Июнь' },
  { value: 6, label: 'Июль' },
  { value: 7, label: 'Август' },
  { value: 8, label: 'Сентябрь' },
  { value: 9, label: 'Октябрь' },
  { value: 10, label: 'Ноябрь' },
  { value: 11, label: 'Декабрь' },
];

const currentYear = dayjs().year();
const YEAR_OPTIONS = Array.from({ length: 8 }, (_, index) => {
  const year = currentYear - 5 + index;
  return { value: year, label: String(year) };
});

function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

function compactMoney(value: number): string {
  if (value >= 100_000) {
    return `${Math.round(value / 1000)} тыс`;
  }

  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
}

function formatDayTitle(value: Dayjs): string {
  return value.locale('ru').format('D MMMM YYYY');
}

function buildMonthGrid(month: Dayjs): Dayjs[] {
  const start = month.startOf('month');
  const mondayOffset = (start.day() + 6) % 7;

  return Array.from({ length: 42 }, (_, index) =>
    start.subtract(mondayOffset, 'day').add(index, 'day'),
  );
}

function BucketList({
  buckets,
  onSettle,
}: {
  buckets: PayoutBucket[];
  onSettle: (masterId: string | null) => void;
}) {
  if (buckets.length === 0) {
    return <p className={styles.empty}>Пока нечего отдавать</p>;
  }

  return (
    <ul className={styles.list}>
      {buckets.map((bucket) => (
        <li
          className={clsx(styles.item, bucket.settled && styles.itemSettled)}
          key={bucket.master_id ?? bucket.full_name}
        >
          <div className={styles.itemBody}>
            <div className={styles.itemMain}>
              <p className={styles.itemName}>{bucket.full_name}</p>
              <p className={styles.itemMeta}>
                работы {formatMoney(bucket.works_amount)}
                {bucket.extras > 0 ? ` · доплаты ${formatMoney(bucket.extras)}` : ''}
              </p>
            </div>
            <div className={styles.itemPay}>
              <strong>{formatMoney(bucket.to_pay)}</strong>
              <span className={styles.itemSplit}>
                мастер {formatMoney(bucket.master_share)} · СТО {formatMoney(bucket.station_share)}
              </span>
            </div>
          </div>
          <div className={styles.itemActions}>
            <Button
              className={clsx(styles.giveButton, bucket.settled && styles.giveButtonDone)}
              size="small"
              onClick={() => onSettle(bucket.master_id)}
            >
              {bucket.settled ? 'Выдать' : 'Отдать'}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function StationPayoutsPanel() {
  const [month, setMonth] = useState(() => dayjs());
  const [selected, setSelected] = useState(() => dayjs());
  const [masterId, setMasterId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [extraDate, setExtraDate] = useState<Dayjs>(() => dayjs());
  const [comment, setComment] = useState('');
  const [isEditingShare, setIsEditingShare] = useState(false);
  const [shareDraft, setShareDraft] = useState(50);

  const from = month.startOf('month').format('YYYY-MM-DD');
  const to = month.endOf('month').format('YYYY-MM-DD');
  const selectedKey = selected.format('YYYY-MM-DD');
  const todayKey = dayjs().format('YYYY-MM-DD');

  const { data, isLoading, isError, refetch } = useGetStationPayoutsQuery({ from, to });
  const { data: station } = useGetStationQuery();
  const { data: masters = [] } = useGetMastersQuery();
  const [updateStation, { isLoading: isSavingShare }] = useUpdateStationMutation();
  const [createExtra, { isLoading: isCreating }] = useCreatePayoutExtraMutation();
  const [deleteExtra] = useDeletePayoutExtraMutation();
  const [toggleSettlement] = useTogglePayoutSettlementMutation();
  const [toggleExtraSettle] = useTogglePayoutExtraSettleMutation();
  const sharePercent = getStationMasterSharePercent(station);

  const daysByDate = useMemo(() => {
    const map = new Map<string, PayoutDay>();

    for (const day of data?.days ?? []) {
      map.set(day.date, day);
    }

    return map;
  }, [data]);

  const yearOptions = useMemo(() => {
    const years = new Set(YEAR_OPTIONS.map((option) => option.value));
    years.add(month.year());

    return [...years]
      .sort((left, right) => left - right)
      .map((year) => ({ value: year, label: String(year) }));
  }, [month]);

  const grid = useMemo(() => buildMonthGrid(month), [month]);
  const selectedDay = daysByDate.get(selectedKey);
  const selectedExtras = (data?.extras ?? []).filter((item) => item.occurred_on === selectedKey);

  const jumpToMonth = (nextMonth: Dayjs) => {
    const aligned = nextMonth.startOf('month');
    const nextSelected = aligned.date(Math.min(selected.date(), aligned.daysInMonth()));

    setMonth(aligned);
    setSelected(nextSelected);
    setExtraDate(nextSelected);
  };

  const handleSelect = (value: Dayjs) => {
    setSelected(value);
    setExtraDate(value);

    if (!value.isSame(month, 'month')) {
      setMonth(value);
    }
  };

  const handleAdd = async () => {
    if (!masterId || amount == null || amount < 1 || !extraDate) {
      toast.error('Укажите мастера, сумму и дату', {
        position: 'top-right',
        transition: Bounce,
      });
      return;
    }

    try {
      await createExtra({
        master_id: masterId,
        amount: Math.round(amount),
        occurred_on: extraDate.format('YYYY-MM-DD'),
        comment: comment.trim() || null,
      }).unwrap();
      setAmount(null);
      setComment('');
      toast.success('Сумма добавлена', {
        position: 'top-right',
        transition: Bounce,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось добавить сумму'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  const handleSettleDay = async (masterId: string | null) => {
    try {
      const result = await toggleSettlement({
        occurred_on: selectedKey,
        master_id: masterId,
      }).unwrap();
      toast.success(result.settled ? 'Отмечено: выдано' : 'Отметку сняли', {
        position: 'top-right',
        transition: Bounce,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось отметить выплату'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  const handleSettleExtra = async (id: string) => {
    try {
      const result = await toggleExtraSettle(id).unwrap();
      toast.success(result.settled ? 'Отмечено: выдано' : 'Отметку сняли', {
        position: 'top-right',
        transition: Bounce,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось отметить выплату'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

  const handleDeleteExtra = async (id: string) => {
    try {
      await deleteExtra(id).unwrap();
      toast.success('Сумма удалена', {
        position: 'top-right',
        transition: Bounce,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Не удалось удалить сумму'), {
        position: 'top-right',
        transition: Bounce,
      });
    }
  };

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
      setIsEditingShare(false);
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Выплаты мастерам</h2>
          <p className={styles.hint}>
            Сколько отдать по доле от готовых работ и отдельные суммы без заказ-наряда. Дата работы
            — день, когда заказ стал «Готово» или «Выдан».
          </p>
        </div>
        {data ? (
          <div className={styles.totals}>
            <span>
              отдать {formatMoney(data.totals.to_pay)}
              <small> за {month.locale('ru').format('MMMM YYYY')}</small>
            </span>
            <span className={styles.totalsMuted}>
              доля {data.share_percent}% · работы {formatMoney(data.totals.works_amount)} · доплаты{' '}
              {formatMoney(data.totals.extras)}
            </span>
          </div>
        ) : null}
      </div>

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

      {isLoading ? (
        <div className={styles.loading}>
          <Spin />
        </div>
      ) : null}

      {isError ? (
        <div className={styles.error}>
          <p>Не удалось загрузить выплаты</p>
          <Button onClick={() => void refetch()}>Повторить</Button>
        </div>
      ) : null}

      {data && !isLoading ? (
        <>
          <div className={styles.board}>
            <div className={styles.calendar}>
              <div className={styles.calHead}>
                <Button
                  type="text"
                  icon={<LeftOutlined />}
                  aria-label="Предыдущий месяц"
                  onClick={() => jumpToMonth(month.subtract(1, 'month'))}
                />
                <div className={styles.calPickers}>
                  <Select
                    className={styles.calMonth}
                    variant="borderless"
                    value={month.month()}
                    options={MONTH_OPTIONS}
                    popupMatchSelectWidth={false}
                    onChange={(value) => jumpToMonth(month.month(value))}
                    aria-label="Месяц"
                  />
                  <Select
                    className={styles.calYear}
                    variant="borderless"
                    value={month.year()}
                    options={yearOptions}
                    popupMatchSelectWidth={false}
                    onChange={(value) => jumpToMonth(month.year(value))}
                    aria-label="Год"
                  />
                </div>
                <Button
                  type="text"
                  icon={<RightOutlined />}
                  aria-label="Следующий месяц"
                  onClick={() => jumpToMonth(month.add(1, 'month'))}
                />
              </div>

              <div className={styles.weekdays}>
                {WEEKDAYS.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>

              <div className={styles.grid}>
                {grid.map((day) => {
                  const key = day.format('YYYY-MM-DD');
                  const payout = daysByDate.get(key);
                  const inMonth = day.isSame(month, 'month');
                  const toPay = payout?.to_pay ?? 0;

                  return (
                    <button
                      className={clsx(
                        styles.day,
                        !inMonth && styles.dayOutside,
                        key === todayKey && styles.dayToday,
                        key === selectedKey && styles.daySelected,
                        toPay > 0 && styles.dayHasPay,
                      )}
                      key={key}
                      type="button"
                      onClick={() => handleSelect(day)}
                    >
                      <span className={styles.dayNum}>{day.date()}</span>
                      {toPay > 0 ? (
                        <span className={styles.dayPay}>{compactMoney(toPay)}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.dayPanel}>
              <h3 className={styles.subTitle}>{formatDayTitle(selected)}</h3>
              <div className={styles.dayScroll}>
                <BucketList
                  buckets={selectedDay?.by_master ?? []}
                  onSettle={(masterId) => void handleSettleDay(masterId)}
                />
                {selectedExtras.length > 0 ? (
                  <ul className={styles.list}>
                    {selectedExtras.map((item) => {
                      const extraMasterShare =
                        item.master_share ?? Math.round(item.amount * (sharePercent / 100));
                      const extraStationShare =
                        item.station_share ?? item.amount - extraMasterShare;

                      return (
                        <li
                          className={clsx(styles.item, item.settled && styles.itemSettled)}
                          key={item.id}
                        >
                          <div className={styles.itemBody}>
                            <div className={styles.itemMain}>
                              <p className={styles.itemName}>{item.full_name}</p>
                              <p className={styles.itemMeta}>
                                без работы · внесли {formatMoney(item.amount)}
                                {item.comment ? ` · ${item.comment}` : ''}
                              </p>
                            </div>
                            <div className={styles.itemPay}>
                              <strong>{formatMoney(extraMasterShare)}</strong>
                              <span className={styles.itemSplit}>
                                мастер {formatMoney(extraMasterShare)} · СТО{' '}
                                {formatMoney(extraStationShare)}
                              </span>
                            </div>
                          </div>
                          <div className={styles.itemActions}>
                            <Button
                              className={clsx(
                                styles.giveButton,
                                item.settled && styles.giveButtonDone,
                              )}
                              size="small"
                              onClick={() => void handleSettleExtra(item.id)}
                            >
                              {item.settled ? 'Выдать' : 'Отдать'}
                            </Button>
                            <Button size="small" onClick={() => void handleDeleteExtra(item.id)}>
                              Удалить
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            </div>
          </div>

          <div className={styles.form}>
            <h3 className={styles.subTitle}>Сумма без работы</h3>
            <p className={styles.hint}>
              Вносите всю сумму, которую дали. Доля мастера и СТО считается как у работ (
              {sharePercent}%).
            </p>
            <div className={styles.formRow}>
              <Select
                className={styles.formMaster}
                placeholder="Мастер"
                value={masterId}
                onChange={setMasterId}
                options={masters.map((master) => ({
                  value: master.id,
                  label: master.is_active ? master.full_name : `${master.full_name} (скрыт)`,
                }))}
                showSearch
                optionFilterProp="label"
              />
              <DatePicker value={extraDate} onChange={(value) => value && setExtraDate(value)} />
              <InputNumber
                className={styles.formAmount}
                min={1}
                step={100}
                placeholder="Вся сумма, ₽"
                value={amount}
                onChange={(value) => setAmount(typeof value === 'number' ? value : null)}
              />
              <Input
                className={styles.formComment}
                placeholder="Комментарий"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
              <Button type="primary" loading={isCreating} onClick={() => void handleAdd()}>
                Добавить
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
