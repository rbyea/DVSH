import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

/** True for calendar days before today. */
export function isPastCalendarDate(date: Dayjs | null | undefined): boolean {
  return Boolean(date && date.isBefore(dayjs(), 'day'));
}

/** Ant Design DatePicker `disabledDate` — blocks yesterday and earlier. */
export function disablePastDates(current: Dayjs | null): boolean {
  return isPastCalendarDate(current);
}
