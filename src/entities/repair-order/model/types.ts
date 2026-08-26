import type { VehicleDiagnostic } from '@/shared/lib/diagnostics';

export type PublicStationContacts = {
  name: string;
  phone?: string | null;
  city?: string | null;
  address?: string | null;
  working_hours?: string | null;
};

export type RepairStatus =
  'new' | 'pending_approval' | 'revision' | 'in_progress' | 'waiting_parts' | 'done' | 'completed';

export type RepairListItem = {
  id: string;
  order_number: string;
  client_name: string;
  car: string;
  vehicle_id: string;
  status: RepairStatus;
  updated_at: string;
  total: number;
  total_formatted: string;
};

export type PaginationMeta = {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
};

export type RepairListResponse = {
  data: RepairListItem[];
  meta: PaginationMeta;
};

export type GetRepairsParams = {
  search?: string;
  status?: RepairStatus;
  page?: number;
  per_page?: number;
};

/** UI/mock row used by create-repair flow until that API is wired. */
export type RepairRow = {
  id: string;
  orderNumber: string;
  clientName: string;
  car: string;
  status: RepairStatus;
  updatedAt: string;
  total: string;
};

export type RepairCreatePayload = {
  vehicleId?: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  carModel: string;
  licensePlate: string;
  vin?: string;
  chassisNumber?: string;
  mileage?: number;
  status: Exclude<RepairStatus, 'done' | 'completed'>;
  plannedReadyAt?: string;
  total?: number;
  workItems: Array<{ title: string }>;
  orderedParts: Array<{ name: string; quantity: number; price?: number }>;
  comment?: string;
};

export type StoreRepairRequest = {
  vehicle_id: string | number;
  client_id?: string | number;
  status: Exclude<RepairStatus, 'done' | 'completed'>;
  planned_ready_at?: string | null;
  mileage?: number | null;
  total?: number | null;
  comment?: string | null;
  work_items?: Array<{
    title: string;
    master_id?: string | number | null;
    price?: number | null;
    hours?: number | null;
    /** Дополнительная работа (считается отдельно от основных) */
    is_extra?: boolean;
  }>;
  ordered_parts?: Array<{ name: string; quantity: number; price?: number | null }>;
};

export type RepairCreated = {
  id: string;
  order_number: string;
  status: Exclude<RepairStatus, 'done' | 'completed'>;
  public_token: string;
  public_url: string;
};

export type RepairWorkItem = {
  id: string;
  title: string;
  is_done: boolean | null;
  /** Дополнительная работа — отдельный блок и отдельная сумма в итогах */
  is_extra?: boolean | null;
  /** Цена позиции, ₽ */
  price?: number | null;
  /** Часы работы мастера */
  hours?: number | null;
  master_id?: string | null;
  master?: {
    id: string;
    full_name: string;
    specialty: string;
  } | null;
};

export type CreateWorkItemRequest = {
  title: string;
  master_id?: string | number | null;
  price?: number | null;
  hours?: number | null;
  is_extra?: boolean;
};

export type WorkTitleSuggestion = {
  title: string;
  price: number | null;
  hours: number | null;
  master_id: string | null;
};

export type UpdateWorkItemRequest = {
  title?: string;
  is_done?: boolean;
  master_id?: string | number | null;
  price?: number | null;
  hours?: number | null;
  is_extra?: boolean;
};

export type RepairPart = {
  id: string;
  name: string;
  quantity: number;
  /** Цена за единицу, ₽ */
  price?: number | null;
};

export type CreatePartRequest = {
  name: string;
  quantity?: number;
  price?: number | null;
};

export type UpdatePartRequest = {
  name?: string;
  quantity?: number;
  price?: number | null;
};

export type RepairDetailClient = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
};

export type RepairDetailVehicle = {
  id: string;
  car_model: string;
  license_plate: string;
  vin?: string | null;
  chassis_number?: string | null;
  mileage?: number | null;
  /** Floor for mileage edits — from last issued (completed) repair. */
  last_completed_mileage?: number | null;
  latest_diagnostic?: VehicleDiagnostic | null;
};

export type EstimateStatus = 'pending' | 'approved' | 'declined';

export type EstimateDecision = 'approved' | 'declined';

/** Client handover confirmation after status «Выдан» (completed). */
export type ClientConfirmStatus = 'pending' | 'confirmed' | 'disputed';

export type ClientConfirmDecision = 'confirmed' | 'disputed';

export type RepairDetail = {
  id: string;
  order_number: string;
  status: RepairStatus;
  planned_ready_at?: string | null;
  comment?: string | null;
  mileage?: number | null;
  total?: number | null;
  estimate_status?: EstimateStatus | null;
  estimate_comment?: string | null;
  estimate_decided_at?: string | null;
  client_confirm_status?: ClientConfirmStatus | null;
  client_confirm_comment?: string | null;
  client_confirmed_at?: string | null;
  public_token: string;
  public_url: string;
  client: RepairDetailClient;
  vehicle: RepairDetailVehicle;
  work_items: RepairWorkItem[];
  ordered_parts: RepairPart[];
  created_at: string;
  updated_at: string;
};

export type UpdateRepairRequest = {
  status?: RepairStatus;
  planned_ready_at?: string | null;
  comment?: string | null;
  mileage?: number | null;
  total?: number | null;
  /** Master can put estimate back to pending after editing the quote. */
  estimate_status?: EstimateStatus | null;
  /** Keep the client's decline note when only status is synced. */
  estimate_comment?: string | null;
  /** Re-send handover confirmation after disputed fixes. */
  client_confirm_status?: ClientConfirmStatus | null;
};

export type PublicRepairWorkItem = {
  title: string;
  is_done: boolean;
  price?: number | null;
  hours?: number | null;
  is_extra?: boolean | null;
};

/** Past closed/completed repairs on the same vehicle (public client card). */
export type PublicRepairHistoryItem = {
  order_number: string;
  status: RepairStatus;
  status_label?: string;
  completed_at?: string | null;
  updated_at?: string;
  total?: number | null;
  total_formatted?: string | null;
  mileage?: number | null;
  work_items?: PublicRepairWorkItem[];
  ordered_parts?: Array<{ name: string; quantity: number; price?: number | null }>;
  client_confirm_status?: ClientConfirmStatus | null;
};

/** Active repair block inside public vehicle card. */
export type PublicCurrentRepair = {
  order_number: string;
  status: RepairStatus;
  status_label: string;
  planned_ready_at?: string | null;
  total?: number | null;
  total_formatted?: string | null;
  mileage?: number | null;
  estimate_status?: EstimateStatus | null;
  estimate_comment?: string | null;
  estimate_decided_at?: string | null;
  /** Master's note for the client (from repair.comment). */
  comment?: string | null;
  client_confirm_status?: ClientConfirmStatus | null;
  client_confirm_comment?: string | null;
  client_confirmed_at?: string | null;
  /** Client display name for handover verification. */
  client_name?: string | null;
  work_items: PublicRepairWorkItem[];
  ordered_parts?: Array<{ name: string; quantity: number; price?: number | null }>;
  updated_at: string;
};

/**
 * Public client card is keyed by vehicle token.
 * `current_repair` may be completed while client confirmation is pending/disputed.
 */
export type PublicClientVehicleSummary = {
  public_token: string;
  car_model: string;
  license_plate: string;
  vin?: string | null;
  chassis_number?: string | null;
};

export type PublicVehicle = {
  car_model: string;
  license_plate: string;
  vin?: string | null;
  chassis_number?: string | null;
  /** Fallback name when not nested in current_repair. */
  client_name?: string | null;
  station?: PublicStationContacts | null;
  latest_diagnostic?: VehicleDiagnostic | null;
  current_repair: PublicCurrentRepair | null;
  previous_repairs: PublicRepairHistoryItem[];
  /**
   * All vehicles of the same client (incl. current), for switching on the public card.
   * Each item has its own public_token → `/public/vehicles/{token}`.
   */
  client_vehicles?: PublicClientVehicleSummary[];
};

/** @deprecated Use PublicVehicle + current_repair. Kept for gradual migration. */
export type PublicRepair = PublicCurrentRepair & {
  car_model: string;
  license_plate: string;
  previous_repairs?: PublicRepairHistoryItem[];
};

export type ApprovePublicEstimateRequest = {
  decision: EstimateDecision;
  comment?: string | null;
};

export type ConfirmPublicRepairRequest = {
  decision: ClientConfirmDecision;
  comment?: string | null;
};

export type PublicLinkResponse = {
  public_token: string;
  public_url: string;
};

export type RepairNotification = {
  channel: string;
  is_active: boolean;
  chat_id?: string | null;
};

export type RepairNotificationLink = {
  url?: string;
  link?: string;
};
