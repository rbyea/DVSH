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
  /** Телефон СТО для клиента (публичная карточка, печать). */
  phone?: string | null;
  city?: string | null;
  address?: string | null;
  /** Свободная строка, например «пн–сб 9:00–20:00». */
  working_hours?: string | null;
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
  phone?: string | null;
  city?: string | null;
  address?: string | null;
  working_hours?: string | null;
};

/** Snapshot on a work item (may stay after master is deactivated). */
export type WorkItemMaster = {
  id: string;
  full_name: string;
  specialty: string;
};
