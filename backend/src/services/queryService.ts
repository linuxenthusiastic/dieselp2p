import { store } from '../data/store.js';
import type {
  AnomalyEvent,
  CarrierProfile,
  Demand,
  Match,
  MatchItem,
  Offer,
  Operation,
  ProducerProfile,
  Profile,
  SupplierProfile,
  TransportOrder,
} from '../types/domain.js';

/** Lectura completa de la base (volumen pequeño en el MVP) para composición en memoria. */
export interface Snapshot {
  profiles: Profile[];
  producers: ProducerProfile[];
  suppliers: SupplierProfile[];
  carriers: CarrierProfile[];
  demands: Demand[];
  offers: Offer[];
  matches: Match[];
  matchItems: MatchItem[];
  transportOrders: TransportOrder[];
  operations: Operation[];
  anomalies: AnomalyEvent[];
}

export async function getSnapshot(): Promise<Snapshot> {
  const [profiles, producers, suppliers, carriers, demands, offers, matches, matchItems, transportOrders, operations, anomalies] =
    await Promise.all([
      store.list('profiles'),
      store.list('producer_profiles'),
      store.list('supplier_profiles'),
      store.list('carrier_profiles'),
      store.list('demands'),
      store.list('offers'),
      store.list('matches'),
      store.list('match_items'),
      store.list('transport_orders'),
      store.list('operations'),
      store.list('anomaly_events'),
    ]);
  return { profiles, producers, suppliers, carriers, demands, offers, matches, matchItems, transportOrders, operations, anomalies };
}

const byId = <T extends { id: string }>(arr: T[]) => new Map(arr.map((x) => [x.id, x]));

export type ProducerSummary = Pick<ProducerProfile, 'id' | 'organization_name' | 'activity_type' | 'location_name' | 'latitude' | 'longitude'> & {
  contact_name: string;
};
export type SupplierSummary = Pick<SupplierProfile, 'id' | 'business_name' | 'verification_status' | 'location_name' | 'latitude' | 'longitude'>;
export type CarrierSummary = Pick<CarrierProfile, 'id' | 'company_name' | 'vehicle_type' | 'capacity_liters' | 'coverage_area' | 'latitude' | 'longitude'>;

export type DemandView = Demand & { producer: ProducerSummary | null };
export type OfferView = Offer & { supplier: SupplierSummary | null };
export type MatchItemView = MatchItem & { offer: Offer | null; supplier: SupplierSummary | null };
export type MatchView = Match & { items: MatchItemView[]; demand: DemandView | null; operation: Pick<Operation, 'id' | 'operation_code' | 'status'> | null };
export type TransportView = TransportOrder & { carrier: CarrierSummary | null; operation_code: string | null; operation_id: string | null };
export type OperationView = Operation & {
  match: MatchView | null;
  producer: ProducerSummary | null;
  transports: TransportView[];
  carrier: CarrierSummary | null;
};
export type AnomalyView = AnomalyEvent & { profile: Pick<Profile, 'id' | 'full_name' | 'email' | 'role'> | null; organization: string | null; operation_code: string | null };

export class Views {
  private producerById: Map<string, ProducerProfile>;
  private supplierById: Map<string, SupplierProfile>;
  private carrierById: Map<string, CarrierProfile>;
  private profileById: Map<string, Profile>;
  private demandById: Map<string, Demand>;
  private offerById: Map<string, Offer>;
  private matchById: Map<string, Match>;
  private operationByMatch: Map<string, Operation>;
  private operationById: Map<string, Operation>;

  constructor(public s: Snapshot) {
    this.producerById = byId(s.producers);
    this.supplierById = byId(s.suppliers);
    this.carrierById = byId(s.carriers);
    this.profileById = byId(s.profiles);
    this.demandById = byId(s.demands);
    this.offerById = byId(s.offers);
    this.matchById = byId(s.matches);
    this.operationByMatch = new Map(s.operations.map((o) => [o.match_id, o]));
    this.operationById = byId(s.operations);
  }

  getOffer(id: string): Offer | null {
    return this.offerById.get(id) ?? null;
  }

  producerSummary(id: string): ProducerSummary | null {
    const p = this.producerById.get(id);
    if (!p) return null;
    const profile = this.profileById.get(p.profile_id);
    return {
      id: p.id,
      organization_name: p.organization_name,
      activity_type: p.activity_type,
      location_name: p.location_name,
      latitude: p.latitude,
      longitude: p.longitude,
      contact_name: profile?.full_name ?? '',
    };
  }

  supplierSummary(id: string): SupplierSummary | null {
    const s = this.supplierById.get(id);
    if (!s) return null;
    return { id: s.id, business_name: s.business_name, verification_status: s.verification_status, location_name: s.location_name, latitude: s.latitude, longitude: s.longitude };
  }

  carrierSummary(id: string | null): CarrierSummary | null {
    if (!id) return null;
    const c = this.carrierById.get(id);
    if (!c) return null;
    return { id: c.id, company_name: c.company_name, vehicle_type: c.vehicle_type, capacity_liters: c.capacity_liters, coverage_area: c.coverage_area, latitude: c.latitude, longitude: c.longitude };
  }

  demand(d: Demand): DemandView {
    return { ...d, producer: this.producerSummary(d.producer_id) };
  }

  offer(o: Offer): OfferView {
    return { ...o, supplier: this.supplierSummary(o.supplier_id) };
  }

  match(m: Match): MatchView {
    const items = this.s.matchItems
      .filter((it) => it.match_id === m.id)
      .map((it) => {
        const offer = this.offerById.get(it.offer_id) ?? null;
        return { ...it, offer, supplier: offer ? this.supplierSummary(offer.supplier_id) : null };
      })
      .sort((a, b) => b.allocated_liters - a.allocated_liters);
    const d = this.demandById.get(m.demand_id);
    const op = this.operationByMatch.get(m.id);
    return { ...m, items, demand: d ? this.demand(d) : null, operation: op ? { id: op.id, operation_code: op.operation_code, status: op.status } : null };
  }

  transport(t: TransportOrder): TransportView {
    const op = this.operationByMatch.get(t.match_id);
    return { ...t, carrier: this.carrierSummary(t.carrier_id), operation_code: op?.operation_code ?? null, operation_id: op?.id ?? null };
  }

  operation(op: Operation): OperationView {
    const m = this.matchById.get(op.match_id);
    const transports = this.s.transportOrders.filter((t) => t.match_id === op.match_id).map((t) => this.transport(t));
    const carrierId = transports.find((t) => t.carrier_id)?.carrier_id ?? null;
    return {
      ...op,
      match: m ? this.match(m) : null,
      producer: this.producerSummary(op.producer_id),
      transports,
      carrier: this.carrierSummary(carrierId),
    };
  }

  anomaly(a: AnomalyEvent): AnomalyView {
    const profile = this.profileById.get(a.profile_id);
    const org =
      this.s.producers.find((p) => p.profile_id === a.profile_id)?.organization_name ??
      this.s.suppliers.find((p) => p.profile_id === a.profile_id)?.business_name ??
      this.s.carriers.find((p) => p.profile_id === a.profile_id)?.company_name ??
      null;
    const op = a.operation_id ? this.operationById.get(a.operation_id) : undefined;
    return {
      ...a,
      profile: profile ? { id: profile.id, full_name: profile.full_name, email: profile.email, role: profile.role } : null,
      organization: org,
      operation_code: op?.operation_code ?? null,
    };
  }
}

export async function views(): Promise<Views> {
  return new Views(await getSnapshot());
}
