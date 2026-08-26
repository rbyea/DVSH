export type PayoutBucket = {
  master_id: string | null;
  full_name: string;
  works_amount: number;
  master_share: number;
  station_share: number;
  extras: number;
  to_pay: number;
  settled?: boolean;
};

export type PayoutDay = {
  date: string;
  works_amount: number;
  master_share: number;
  station_share: number;
  extras: number;
  to_pay: number;
  by_master: PayoutBucket[];
};

export type PayoutExtra = {
  id: string;
  master_id: string;
  full_name: string;
  amount: number;
  master_share: number;
  station_share: number;
  occurred_on: string;
  comment: string | null;
  settled?: boolean;
};

export type StationPayouts = {
  share_percent: number;
  from: string;
  to: string;
  totals: {
    works_amount: number;
    master_share: number;
    station_share: number;
    extras: number;
    to_pay: number;
  };
  by_master: PayoutBucket[];
  days: PayoutDay[];
  extras: PayoutExtra[];
};

export type CreatePayoutExtraRequest = {
  master_id: number | string;
  amount: number;
  occurred_on: string;
  comment?: string | null;
};
