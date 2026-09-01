export type Master = {
  id: string;
  full_name: string;
  /** Профессия / специализация на СТО */
  specialty: string;
  birthday?: string | null;
  phone?: string | null;
  is_active: boolean;
  created_at?: string | null;
};

export type StationInfo = {
  id: string;
  name: string;
  legal_name?: string | null;
  /**
   * Доля мастера от стоимости назначенной работы, %.
   * Например 50 → мастер 50%, СТО 50%.
   */
  master_share_percent?: number | null;
  /** Телефон СТО для клиента (публичная карточка, печать). */
  phone?: string | null;
  city?: string | null;
  address?: string | null;
  /** Ссылка на карточку СТО в Яндекс.Картах или 2ГИС. */
  map_url?: string | null;
  /** Свободная строка, например «пн–сб 9:00–20:00». */
  working_hours?: string | null;
  inn?: string | null;
  ogrn?: string | null;
  /** Код приглашения: регистрация по ссылке даёт 60 дней триала вместо 30. */
  referral_code?: string | null;
};

export type CreateMasterRequest = {
  full_name: string;
  specialty: string;
  birthday?: string | null;
  phone?: string | null;
};

export type UpdateMasterRequest = {
  full_name?: string;
  specialty?: string;
  birthday?: string | null;
  phone?: string | null;
  is_active?: boolean;
};

export type UpdateStationRequest = {
  name?: string;
  legal_name?: string | null;
  master_share_percent?: number | null;
  phone?: string | null;
  city?: string | null;
  address?: string | null;
  map_url?: string | null;
  working_hours?: string | null;
  inn?: string | null;
  ogrn?: string | null;
};

/** Snapshot on a work item (may stay after master is deactivated). */
export type WorkItemMaster = {
  id: string;
  full_name: string;
  specialty: string;
};
