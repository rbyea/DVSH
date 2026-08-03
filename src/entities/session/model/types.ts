export type User = {
  id: number;
  name: string;
  email: string;
  service_station_id: number;
};

export type LoginRequest = {
  email: string;
  password: string;
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
