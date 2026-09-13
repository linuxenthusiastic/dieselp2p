/**
 * Tipos de dominio de DieselP2P.
 * Los nombres de campos coinciden con las columnas de PostgreSQL (Supabase)
 * para que el store en memoria y el store Supabase compartan el mismo modelo.
 *
 * MVP DEMO — DATOS SIMULADOS. Ninguna entidad representa operaciones reales.
 */

export type Role = 'producer' | 'supplier' | 'carrier' | 'admin';

export type DemandStatus =
  | 'OPEN'
  | 'PARTIALLY_MATCHED'
  | 'MATCHED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type OfferStatus =
  | 'ACTIVE'
  | 'PARTIALLY_ALLOCATED'
  | 'FULLY_ALLOCATED'
  | 'EXPIRED'
  | 'CANCELLED';

export type MatchStatus = 'PROPOSED' | 'CONFIRMED' | 'CANCELLED';

export type TransportStatus = 'PENDING' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED';

export type OperationStatus =
  | 'CREATED'
  | 'ASSIGNED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export type AnomalyType =
  | 'UNUSUAL_VOLUME'
  | 'FREQUENT_REQUESTS'
  | 'RAPID_RESALE_PATTERN'
  | 'MULTIPLE_LOCATIONS'
  | 'OTHER';

export type AnomalyStatus = 'OPEN' | 'REVIEWED' | 'DISMISSED';

export type ActivityType =
  | 'Agricultura'
  | 'Ganadería'
  | 'Transporte'
  | 'Procesamiento'
  | 'Distribución'
  | 'Cosecha'
  | 'Otro';

export interface Profile {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  role: Role;
  status: 'active' | 'suspended';
  created_at: string;
}

export interface ProducerProfile {
  id: string;
  profile_id: string;
  organization_name: string;
  activity_type: ActivityType;
  nit_demo: string;
  location_name: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface SupplierProfile {
  id: string;
  profile_id: string;
  business_name: string;
  verification_status: VerificationStatus;
  location_name: string;
  latitude: number;
  longitude: number;
  capacity_liters: number;
  created_at: string;
}

export interface CarrierProfile {
  id: string;
  profile_id: string;
  company_name: string;
  vehicle_type: string;
  capacity_liters: number;
  coverage_area: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface Demand {
  id: string;
  producer_id: string;
  requested_liters: number;
  remaining_liters: number;
  target_price: number | null;
  required_date: string; // YYYY-MM-DD
  location_name: string;
  latitude: number;
  longitude: number;
  activity_type: ActivityType;
  status: DemandStatus;
  created_at: string;
}

export interface Offer {
  id: string;
  supplier_id: string;
  available_liters: number;
  remaining_liters: number;
  price_per_liter: number;
  available_date: string; // YYYY-MM-DD
  location_name: string;
  latitude: number;
  longitude: number;
  status: OfferStatus;
  created_at: string;
}

export interface ScoreBreakdown {
  availability: number; // /35
  distance: number; // /25
  price: number; // /20
  volume: number; // /10
  time: number; // /10
}

export interface Match {
  id: string;
  demand_id: string;
  status: MatchStatus;
  total_liters: number;
  total_fuel_cost: number;
  estimated_transport_cost: number;
  estimated_total_cost: number;
  estimated_savings: number;
  savings_percent: number;
  reference_cost: number;
  score: number;
  score_breakdown: ScoreBreakdown;
  explanation: string[];
  created_at: string;
}

export interface MatchItem {
  id: string;
  match_id: string;
  offer_id: string;
  allocated_liters: number;
  price_per_liter: number;
  distance_km: number;
  transport_cost: number;
  subtotal: number;
}

export interface TransportOrder {
  id: string;
  match_id: string;
  match_item_id: string | null;
  carrier_id: string | null;
  origin_name: string;
  origin_latitude: number;
  origin_longitude: number;
  destination_name: string;
  destination_latitude: number;
  destination_longitude: number;
  liters: number;
  distance_km: number;
  estimated_cost: number;
  status: TransportStatus;
  created_at: string;
  updated_at: string;
}

export interface Operation {
  id: string;
  operation_code: string;
  match_id: string;
  producer_id: string;
  status: OperationStatus;
  verification_status: VerificationStatus;
  qr_token: string;
  created_at: string;
  updated_at: string;
}

export interface AnomalyEvent {
  id: string;
  profile_id: string;
  operation_id: string | null;
  type: AnomalyType;
  risk_score: number;
  description: string;
  status: AnomalyStatus;
  created_at: string;
}

export interface TableMap {
  profiles: Profile;
  producer_profiles: ProducerProfile;
  supplier_profiles: SupplierProfile;
  carrier_profiles: CarrierProfile;
  demands: Demand;
  offers: Offer;
  matches: Match;
  match_items: MatchItem;
  transport_orders: TransportOrder;
  operations: Operation;
  anomaly_events: AnomalyEvent;
}

export type TableName = keyof TableMap;

export const TABLE_NAMES: TableName[] = [
  'profiles',
  'producer_profiles',
  'supplier_profiles',
  'carrier_profiles',
  'demands',
  'offers',
  'matches',
  'match_items',
  'transport_orders',
  'operations',
  'anomaly_events',
];

/** Contexto de autenticación inyectado por el middleware. */
export interface AuthContext {
  profile: Profile;
  producer?: ProducerProfile;
  supplier?: SupplierProfile;
  carrier?: CarrierProfile;
  isDemo: boolean;
}
