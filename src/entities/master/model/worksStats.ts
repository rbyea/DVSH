import type { RepairDetail, RepairWorkItem } from '@/entities/repair-order';
import { parseMoney, toMoney } from '@/shared/lib/money';

import type { StationInfo } from './types';

import { parseISO } from 'date-fns';

export const DEFAULT_MASTER_SHARE_PERCENT = 0;

const LOCAL_SHARE_STORAGE_KEY = 'dvsh.station.master_share_percent';

export type CompletedWorkRow = {
  workItemId: string;
  repairId: string;
  orderNumber: string;
  title: string;
  price: number;
  hours: number | null;
  isExtra: boolean;
  masterId: string | null;
  masterName: string | null;
  masterSpecialty: string | null;
  completedAt: string;
  status: RepairDetail['status'];
  masterShare: number;
  stationShare: number;
};

export type MasterWorksStat = {
  masterId: string;
  fullName: string;
  specialty: string | null;
  worksCount: number;
  amount: number;
  masterShare: number;
  stationShare: number;
};

export type WorkTitleStat = {
  title: string;
  worksCount: number;
  amount: number;
  hours: number;
  masterShare: number;
  stationShare: number;
};

export type StationWorksStats = {
  worksCount: number;
  amount: number;
  masterShare: number;
  stationShare: number;
  byMaster: MasterWorksStat[];
  byTitle: WorkTitleStat[];
  works: CompletedWorkRow[];
};

function normalizeWorkTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toLowerCase();
}

function asMoney(value: unknown): number {
  return toMoney(value);
}

export function normalizeMasterSharePercent(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_MASTER_SHARE_PERCENT;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

export function readLocalMasterSharePercent(): number | null {
  try {
    const raw = window.localStorage.getItem(LOCAL_SHARE_STORAGE_KEY);

    if (raw == null) {
      return null;
    }

    return normalizeMasterSharePercent(Number(raw));
  } catch {
    return null;
  }
}

export function writeLocalMasterSharePercent(value: number): void {
  try {
    window.localStorage.setItem(
      LOCAL_SHARE_STORAGE_KEY,
      String(normalizeMasterSharePercent(value)),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function getStationMasterSharePercent(station: StationInfo | undefined): number {
  if (typeof station?.master_share_percent === 'number') {
    return normalizeMasterSharePercent(station.master_share_percent);
  }

  return readLocalMasterSharePercent() ?? DEFAULT_MASTER_SHARE_PERCENT;
}

function resolveMaster(item: RepairWorkItem): {
  masterId: string | null;
  masterName: string | null;
  masterSpecialty: string | null;
} {
  const masterId = item.master_id ?? item.master?.id ?? null;
  const masterName = item.master?.full_name?.trim() || null;
  const masterSpecialty = item.master?.specialty?.trim() || null;

  return { masterId, masterName, masterSpecialty };
}

function shouldIncludeWork(repair: RepairDetail, item: RepairWorkItem): boolean {
  if (repair.status === 'completed' || repair.status === 'done') {
    return Boolean(item.is_done) || repair.status === 'completed';
  }

  return Boolean(item.is_done);
}

export function buildStationWorksStats(
  repairs: RepairDetail[],
  masterSharePercent: number,
): StationWorksStats {
  const shareRatio = normalizeMasterSharePercent(masterSharePercent) / 100;
  const works: CompletedWorkRow[] = [];

  for (const repair of repairs) {
    if (repair.status !== 'completed' && repair.status !== 'done') {
      continue;
    }

    for (const item of repair.work_items ?? []) {
      if (!shouldIncludeWork(repair, item)) {
        continue;
      }

      const price = asMoney(item.price);
      const { masterId, masterName, masterSpecialty } = resolveMaster(item);
      const masterShare = Math.round(price * shareRatio);
      const stationShare = price - masterShare;

      works.push({
        workItemId: item.id,
        repairId: repair.id,
        orderNumber: repair.order_number,
        title: item.title,
        price,
        hours: parseMoney(item.hours),
        isExtra: Boolean(item.is_extra),
        masterId,
        masterName,
        masterSpecialty,
        completedAt: repair.updated_at,
        status: repair.status,
        masterShare,
        stationShare,
      });
    }
  }

  works.sort((a, b) => {
    const aTime = parseISO(a.completedAt).getTime();
    const bTime = parseISO(b.completedAt).getTime();

    if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
      return 0;
    }

    return bTime - aTime;
  });

  const byMasterMap = new Map<string, MasterWorksStat>();

  for (const work of works) {
    const key = work.masterId ?? work.masterName ?? '__unassigned__';
    const existing = byMasterMap.get(key);

    if (existing) {
      existing.worksCount += 1;
      existing.amount += work.price;
      existing.masterShare += work.masterShare;
      existing.stationShare += work.stationShare;
      continue;
    }

    byMasterMap.set(key, {
      masterId: key,
      fullName: work.masterName ?? 'Без мастера',
      specialty: work.masterSpecialty,
      worksCount: 1,
      amount: work.price,
      masterShare: work.masterShare,
      stationShare: work.stationShare,
    });
  }

  const byMaster = [...byMasterMap.values()].sort((a, b) => b.amount - a.amount);

  const byTitleMap = new Map<string, WorkTitleStat>();

  for (const work of works) {
    const key = normalizeWorkTitle(work.title) || '__empty__';
    const existing = byTitleMap.get(key);

    if (existing) {
      existing.worksCount += 1;
      existing.amount += work.price;
      existing.hours += work.hours ?? 0;
      existing.masterShare += work.masterShare;
      existing.stationShare += work.stationShare;
      continue;
    }

    byTitleMap.set(key, {
      title: work.title.trim() || 'Без названия',
      worksCount: 1,
      amount: work.price,
      hours: work.hours ?? 0,
      masterShare: work.masterShare,
      stationShare: work.stationShare,
    });
  }

  const byTitle = [...byTitleMap.values()].sort((a, b) => {
    if (b.worksCount !== a.worksCount) {
      return b.worksCount - a.worksCount;
    }

    return b.amount - a.amount;
  });

  const amount = works.reduce((sum, item) => sum + item.price, 0);
  const masterShare = works.reduce((sum, item) => sum + item.masterShare, 0);
  const stationShare = works.reduce((sum, item) => sum + item.stationShare, 0);

  return {
    worksCount: works.length,
    amount,
    masterShare,
    stationShare,
    byMaster,
    byTitle,
    works,
  };
}
