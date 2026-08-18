export type Master = {
  id: string;
  full_name: string;
  /** Профессия / специализация на СТО */
  specialty: string;
  is_active: boolean;
  created_at?: string | null;
};

export type StationInfo = {
  id: string;
  name: string;
  /**
   * Доля мастера от стоимости назначенной работы, %.
   * Например 50 → мастер 50%, СТО 50%.
   */
  master_share_percent?: number | null;
};

export type CreateMasterRequest = {
  full_name: string;
  specialty: string;
};

export type UpdateMasterRequest = {
  full_name?: string;
  specialty?: string;
  is_active?: boolean;
};

export type UpdateStationRequest = {
  name?: string;
  master_share_percent?: number | null;
};

/** Snapshot on a work item (may stay after master is deactivated). */
export type WorkItemMaster = {
  id: string;
  full_name: string;
  specialty: string;
};
