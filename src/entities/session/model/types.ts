export type StationUserRole = 'owner' | 'master';

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'blocked';

export type User = {
  id: number;
  name: string;
  email: string;
  service_station_id: number;
  /** owner — владелец СТО; master — мастер. Пока optional для совместимости. */
  role?: StationUserRole | null;
  /** trial | active | expired | blocked. Нет поля — старый демо-аккаунт, доступ открыт. */
  subscription_status?: SubscriptionStatus | null;
  /** ISO datetime, конец 30-дневного триала */
  trial_ends_at?: string | null;
  /** ISO datetime, конец оплаченного периода */
  subscription_ends_at?: string | null;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  station_name: string;
};

export type TokenPayload = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type LoginResponseData = TokenPayload & {
  user: User;
};

export type ApiDataResponse<T> = {
  data: T;
};
