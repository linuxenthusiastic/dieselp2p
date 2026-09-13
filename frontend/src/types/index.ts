/** Tipos compartidos con el backend (espejo de backend/src/types/domain.ts + vistas). */

export type Role = 'producer' | 'supplier' | 'carrier' | 'admin';
export type DemandStatus = 'OPEN' | 'PARTIALLY_MATCHED' | 'MATCHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type OfferStatus = 'ACTIVE' | 'PARTIALLY_ALLOCATED' | 'FULLY_ALLOCATED' | 'EXPIRED' | 'CANCELLED';
export type MatchStatus = 'PROPOSED' | 'CONFIRMED' | 'CANCELLED';
export type TransportStatus = 'PENDING' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED';
export type OperationStatus = 'CREATED' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type AnomalyType = 'UNUSUAL_VOLUME' | 'FREQUENT_REQUESTS' | 'RAPID_RESALE_PATTERN' | 'MULTIPLE_LOCATIONS' | 'OTHER';
export type AnomalyStatus = 'OPEN' | 'REVIEWED' | 'DISMISSED';
export type ActivityType = 'Agricultura' | 'Ganadería' | 'Transporte' | 'Procesamiento' | 'Distribución' | 'Cosecha' | 'Otro';

export const ACTIVITY_TYPES: ActivityType[] = ['Agricultura', 'Ganadería', 'Transporte', 'Procesamiento', 'Distribución', 'Cosecha', 'Otro'];

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

export interface Session {
  profile: Profile;
  producer: ProducerProfile | null;
  supplier: SupplierProfile | null;
  carrier: CarrierProfile | null;
  isDemo: boolean;
}

export interface Demand {
  id: string;
  producer_id: string;
  requested_liters: number;
  remaining_liters: number;
  target_price: number | null;
  required_date: string;
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
  available_date: string;
  location_name: string;
  latitude: number;
  longitude: number;
  status: OfferStatus;
  created_at: string;
}

export interface ScoreBreakdown {
  availability: number;
  distance: number;
  price: number;
  volume: number;
  time: number;
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

// ---------- Vistas enriquecidas (respuestas de la API) ----------

export interface ProducerSummary {
  id: string;
  organization_name: string;
  activity_type: ActivityType;
  location_name: string;
  latitude: number;
  longitude: number;
  contact_name: string;
}
export interface SupplierSummary {
  id: string;
  business_name: string;
  verification_status: VerificationStatus;
  location_name: string;
  latitude: number;
  longitude: number;
}
export interface CarrierSummary {
  id: string;
  company_name: string;
  vehicle_type: string;
  capacity_liters: number;
  coverage_area: string;
  latitude: number;
  longitude: number;
}

export type DemandView = Demand & { producer: ProducerSummary | null; distance_km?: number };
export type OfferView = Offer & { supplier: SupplierSummary | null };
export type MatchItemView = MatchItem & { offer: Offer | null; supplier: SupplierSummary | null };
export type MatchView = Match & {
  items: MatchItemView[];
  demand: DemandView | null;
  operation: Pick<Operation, 'id' | 'operation_code' | 'status'> | null;
};
export type TransportView = TransportOrder & { carrier: CarrierSummary | null; operation_code: string | null; operation_id: string | null };
export interface NextStepInfo {
  action: 'ASSIGN_CARRIER' | 'START_TRANSIT' | 'DELIVER' | null;
  label: string;
  actor: string;
  nextStatus: OperationStatus | null;
}

export type OperationView = Operation & {
  match: MatchView | null;
  producer: ProducerSummary | null;
  transports: TransportView[];
  carrier: CarrierSummary | null;
  /** Presente en el detalle de una operación: siguiente paso simulable. */
  next_step?: NextStepInfo;
};
export type AnomalyView = AnomalyEvent & {
  profile: Pick<Profile, 'id' | 'full_name' | 'email' | 'role'> | null;
  organization: string | null;
  operation_code: string | null;
};

export interface MatchingResponse {
  match: MatchView | null;
  alternatives: MatchView[];
  analyzedOffers: number;
  feasibleOffers: number;
}

export interface DashboardMetrics {
  cards: {
    litersConnected: number;
    activeDemandLiters: number;
    availableOfferLiters: number;
    operations: number;
    estimatedSavings: number;
    openAnomalies: number;
  };
  supplyVsDemand: Array<{ zone: string; oferta: number; demanda: number }>;
  litersPerDay: Array<{ date: string; litros: number; operaciones: number }>;
  operationsByStatus: Array<{ status: string; total: number }>;
  savingsCumulative: Array<{ date: string; ahorro: number }>;
  byActivity: Array<{ activity: string; litros: number }>;
  volumeByZone: Array<{ zone: string; litros: number }>;
}

export interface ImpactMetrics {
  label: string;
  litersOptimized: number;
  producersBenefited: number;
  kmOptimized: number;
  logisticSavings: number;
  totalSavings: number;
  operationsConnected: number;
  avgScore: number;
  multiSupplierMatches: number;
  chain: Array<{ stage: string; description: string }>;
}

export interface AppConfig {
  appName: string;
  demoMode: boolean;
  storage: 'memory' | 'supabase';
  supabaseConfigured: boolean;
  demoAccounts: Record<Role, string> | null;
  params: { costPerKm: number; baseTripCost: number; referencePricePerLiter: number; truckCapacityLiters: number; maxRadiusKm: number; maxSuppliersPerMatch: number };
  zones: Array<{ name: string; latitude: number; longitude: number; department: string }>;
  disclaimer: string;
}

export interface MapData {
  offers: OfferView[];
  demands: DemandView[];
  carriers: CarrierSummary[];
  connections: MapConnection[];
}

export interface MapConnection {
  match_id: string;
  status: MatchStatus;
  operation_code: string | null;
  total_liters: number;
  score: number;
  destination: { name: string; latitude: number; longitude: number } | null;
  origins: Array<{ name: string; liters: number; latitude: number; longitude: number; distance_km: number }>;
}

export interface UserRow extends Profile {
  organization: string;
  location: string;
  detail: string;
  openAnomalies: number;
}

export interface ProducerSummaryStats {
  role: 'producer';
  activeDemand: DemandView | null;
  activeMatch: MatchView | null;
  activeOperation: OperationView | null;
  totals: { demands: number; litersRequested: number; litersMatched: number; savings: number; operations: number };
}
export interface SupplierSummaryStats {
  role: 'supplier';
  totals: { litersAvailable: number; activeOffers: number; compatibleDemands: number; operations: number; litersPlaced: number; revenue: number };
}
export interface CarrierSummaryStats {
  role: 'carrier';
  totals: { assigned: number; inTransit: number; delivered: number; pendingNearby: number; litersMoved: number; kmDriven: number };
}
export interface AdminSummaryStats {
  role: 'admin';
  totals: DashboardMetrics['cards'];
}
export type MeStats = ProducerSummaryStats | SupplierSummaryStats | CarrierSummaryStats | AdminSummaryStats;

export interface PublicVerification {
  operation_code: string;
  status: OperationStatus;
  verification_status: VerificationStatus;
  total_liters: number;
  producer: string | null;
  suppliers: Array<{ name: string; liters: number }>;
  carrier: string | null;
  created_at: string;
  updated_at: string;
  disclaimer: string;
}
