/**
 * Datos SEED ficticios de DieselP2P.
 * ------------------------------------------------------------------
 * MVP DEMO — DATOS SIMULADOS. Nombres, coordenadas, precios y volúmenes
 * son inventados con fines de demostración. No representan datos oficiales
 * ni personas/empresas reales.
 *
 * Este módulo es la única fuente de verdad del seed: alimenta el store en
 * memoria y genera `supabase/seed.sql` (npm run seed:sql).
 */
import type {
  ActivityType,
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
import { seedId, operationCode } from '../utils/ids.js';
import { roadDistanceKm } from '../utils/geo.js';
import { params } from '../config.js';

export const SEED_NOW = '2026-09-13T12:00:00.000Z';
export const DEMO_EMAILS = {
  producer: 'demo.producer@dieselp2p.demo',
  supplier: 'demo.supplier@dieselp2p.demo',
  carrier: 'demo.carrier@dieselp2p.demo',
  admin: 'demo.admin@dieselp2p.demo',
} as const;

/** Zonas ficticias (coordenadas aproximadas para la demo). */
export const ZONES: Record<string, { lat: number; lng: number; dept: string }> = {
  'Santa Cruz de la Sierra': { lat: -17.7833, lng: -63.1821, dept: 'Santa Cruz' },
  Warnes: { lat: -17.5167, lng: -63.1667, dept: 'Santa Cruz' },
  Montero: { lat: -17.3389, lng: -63.2556, dept: 'Santa Cruz' },
  Cotoca: { lat: -17.75, lng: -62.9833, dept: 'Santa Cruz' },
  'La Guardia': { lat: -17.8919, lng: -63.3306, dept: 'Santa Cruz' },
  Pailón: { lat: -17.6531, lng: -62.7508, dept: 'Santa Cruz' },
  'San Julián': { lat: -16.9, lng: -62.6, dept: 'Santa Cruz' },
  Okinawa: { lat: -17.2, lng: -62.9, dept: 'Santa Cruz' },
  Mineros: { lat: -17.1167, lng: -63.2333, dept: 'Santa Cruz' },
  Portachuelo: { lat: -17.35, lng: -63.4, dept: 'Santa Cruz' },
  Camiri: { lat: -20.05, lng: -63.5167, dept: 'Santa Cruz' },
  'San Ignacio de Velasco': { lat: -16.37, lng: -60.96, dept: 'Santa Cruz' },
  Vallegrande: { lat: -18.49, lng: -64.11, dept: 'Santa Cruz' },
  'Puerto Suárez': { lat: -18.95, lng: -57.8, dept: 'Santa Cruz' },
  Cochabamba: { lat: -17.3895, lng: -66.1568, dept: 'Cochabamba' },
  Tarija: { lat: -21.5355, lng: -64.7296, dept: 'Tarija' },
  Yacuiba: { lat: -22.0153, lng: -63.6775, dept: 'Tarija' },
  Trinidad: { lat: -14.83, lng: -64.9, dept: 'Beni' },
  Sucre: { lat: -19.03, lng: -65.26, dept: 'Chuquisaca' },
  'El Alto': { lat: -16.5, lng: -68.15, dept: 'La Paz' },
};

const z = (name: keyof typeof ZONES) => ZONES[name];

const P = (n: number) => seedId('a0000001', n); // profiles
const PR = (n: number) => seedId('b0000001', n); // producer_profiles
const SU = (n: number) => seedId('c0000001', n); // supplier_profiles
const CA = (n: number) => seedId('d0000001', n); // carrier_profiles
const DE = (n: number) => seedId('e0000001', n); // demands
const OF = (n: number) => seedId('f0000001', n); // offers
const MA = (n: number) => seedId('a1000001', n); // matches
const MI = (n: number) => seedId('a2000001', n); // match_items
const TR = (n: number) => seedId('a3000001', n); // transport_orders
const OP = (n: number) => seedId('a4000001', n); // operations
const AN = (n: number) => seedId('a5000001', n); // anomaly_events

const dayOffset = (days: number, hour = 9) => {
  const d = new Date(SEED_NOW);
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
};
const dateOnly = (iso: string) => iso.slice(0, 10);

/** PRNG determinístico (mulberry32) para datos históricos reproducibles. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SeedData {
  profiles: Profile[];
  producer_profiles: ProducerProfile[];
  supplier_profiles: SupplierProfile[];
  carrier_profiles: CarrierProfile[];
  demands: Demand[];
  offers: Offer[];
  matches: Match[];
  match_items: MatchItem[];
  transport_orders: TransportOrder[];
  operations: Operation[];
  anomaly_events: AnomalyEvent[];
}

export function buildSeed(): SeedData {
  const profiles: Profile[] = [];
  const producer_profiles: ProducerProfile[] = [];
  const supplier_profiles: SupplierProfile[] = [];
  const carrier_profiles: CarrierProfile[] = [];
  const demands: Demand[] = [];
  const offers: Offer[] = [];
  const matches: Match[] = [];
  const match_items: MatchItem[] = [];
  const transport_orders: TransportOrder[] = [];
  const operations: Operation[] = [];
  const anomaly_events: AnomalyEvent[] = [];

  let profileSeq = 0;
  const addProfile = (p: Omit<Profile, 'id' | 'user_id' | 'status' | 'created_at'>): Profile => {
    const profile: Profile = {
      id: P(++profileSeq),
      user_id: null,
      status: 'active',
      created_at: dayOffset(-60),
      ...p,
    };
    profiles.push(profile);
    return profile;
  };

  // ---------- ADMIN ----------
  addProfile({ full_name: 'Administración DieselP2P', email: DEMO_EMAILS.admin, phone: '+591 70000000', role: 'admin' });

  // ---------- PRODUCTORES (10) ----------
  const producerDefs: Array<{
    org: string;
    contact: string;
    email: string;
    activity: ActivityType;
    zone: keyof typeof ZONES;
    dLat?: number;
    dLng?: number;
  }> = [
    { org: 'Asociación Agrícola Santa Cruz', contact: 'María Fernanda Rojas', email: DEMO_EMAILS.producer, activity: 'Agricultura', zone: 'Santa Cruz de la Sierra' },
    { org: 'Cooperativa Arrocera Montero', contact: 'Juan Carlos Aguilera', email: 'arrocera.montero@dieselp2p.demo', activity: 'Agricultura', zone: 'Montero', dLat: 0.02 },
    { org: 'Ganadería El Trébol', contact: 'Rosario Vaca', email: 'eltrebol@dieselp2p.demo', activity: 'Ganadería', zone: 'San Ignacio de Velasco' },
    { org: 'Transportes del Sur SRL', contact: 'Edwin Mamani', email: 'transdelsur@dieselp2p.demo', activity: 'Transporte', zone: 'Yacuiba' },
    { org: 'Soyera Pailón SRL', contact: 'Gabriela Suárez', email: 'soyera.pailon@dieselp2p.demo', activity: 'Cosecha', zone: 'Pailón' },
    { org: 'Ingenio Azucarero Warnes', contact: 'Luis Alberto Roca', email: 'ingenio.warnes@dieselp2p.demo', activity: 'Procesamiento', zone: 'Warnes', dLng: 0.03 },
    { org: 'Lácteos Vallegrande', contact: 'Patricia Flores', email: 'lacteos.vallegrande@dieselp2p.demo', activity: 'Procesamiento', zone: 'Vallegrande' },
    { org: 'Agro Cotoca', contact: 'Ramiro Justiniano', email: 'agro.cotoca@dieselp2p.demo', activity: 'Agricultura', zone: 'Cotoca' },
    { org: 'Frutícola Cochabamba', contact: 'Daniela Quiroga', email: 'fruticola.cbba@dieselp2p.demo', activity: 'Agricultura', zone: 'Cochabamba' },
    { org: 'Distribuidora Oriente Alimentos', contact: 'Marcelo Terrazas', email: 'dist.oriente@dieselp2p.demo', activity: 'Distribución', zone: 'Santa Cruz de la Sierra', dLat: -0.03, dLng: 0.04 },
  ];
  producerDefs.forEach((d, i) => {
    const prof = addProfile({ full_name: d.contact, email: d.email, phone: `+591 7${String(1000000 + i * 37).padStart(7, '0')}`, role: 'producer' });
    const zz = z(d.zone);
    producer_profiles.push({
      id: PR(i + 1),
      profile_id: prof.id,
      organization_name: d.org,
      activity_type: d.activity,
      nit_demo: `DEMO-${String(100200300 + i * 111).padStart(9, '0')}`,
      location_name: d.zone,
      latitude: zz.lat + (d.dLat ?? 0),
      longitude: zz.lng + (d.dLng ?? 0),
      created_at: dayOffset(-60),
    });
  });

  // ---------- PROVEEDORES (8, verificados ficticios) ----------
  const supplierDefs: Array<{ name: string; contact: string; email: string; zone: keyof typeof ZONES; capacity: number }> = [
    { name: 'Combustibles del Norte SRL', contact: 'Carla Antelo', email: DEMO_EMAILS.supplier, zone: 'Montero', capacity: 60000 },
    { name: 'Distribuidora Warnes Energía', contact: 'Hugo Paz', email: 'warnes.energia@dieselp2p.demo', zone: 'Warnes', capacity: 40000 },
    { name: 'Petro Oriente SA', contact: 'Sandra Moreno', email: 'petro.oriente@dieselp2p.demo', zone: 'Santa Cruz de la Sierra', capacity: 120000 },
    { name: 'Surtidor Cotoca', contact: 'Iván Chávez', email: 'surtidor.cotoca@dieselp2p.demo', zone: 'Cotoca', capacity: 30000 },
    { name: 'EnergíaSur Yacuiba', contact: 'Teresa Ortiz', email: 'energiasur@dieselp2p.demo', zone: 'Yacuiba', capacity: 80000 },
    { name: 'Combustibles Chaco', contact: 'Andrés Villarroel', email: 'chaco.fuel@dieselp2p.demo', zone: 'Camiri', capacity: 50000 },
    { name: 'Valle Energía', contact: 'Mónica Ledezma', email: 'valle.energia@dieselp2p.demo', zone: 'Cochabamba', capacity: 70000 },
    { name: 'Andina Fuel Trinidad', contact: 'Jorge Suárez', email: 'andina.trinidad@dieselp2p.demo', zone: 'Trinidad', capacity: 45000 },
  ];
  supplierDefs.forEach((d, i) => {
    const prof = addProfile({ full_name: d.contact, email: d.email, phone: `+591 6${String(2000000 + i * 53).padStart(7, '0')}`, role: 'supplier' });
    const zz = z(d.zone);
    supplier_profiles.push({
      id: SU(i + 1),
      profile_id: prof.id,
      business_name: d.name,
      verification_status: 'VERIFIED',
      location_name: d.zone,
      latitude: zz.lat,
      longitude: zz.lng,
      capacity_liters: d.capacity,
      created_at: dayOffset(-60),
    });
  });

  // ---------- TRANSPORTISTAS (5) ----------
  const carrierDefs: Array<{ name: string; contact: string; email: string; zone: keyof typeof ZONES; vehicle: string; capacity: number; coverage: string }> = [
    { name: 'Logística Oriente', contact: 'Fernando Salvatierra', email: DEMO_EMAILS.carrier, zone: 'Santa Cruz de la Sierra', vehicle: 'Cisterna 15.000 L', capacity: 15000, coverage: 'Santa Cruz metropolitana y Norte Integrado' },
    { name: 'Transcisternas del Norte', contact: 'Elena Gutiérrez', email: 'transcisternas@dieselp2p.demo', zone: 'Montero', vehicle: 'Cisterna 10.000 L', capacity: 10000, coverage: 'Norte Integrado' },
    { name: 'Chaco Transportes', contact: 'Rubén Cardozo', email: 'chaco.transportes@dieselp2p.demo', zone: 'Camiri', vehicle: 'Cisterna 20.000 L', capacity: 20000, coverage: 'Chaco y Sur' },
    { name: 'Cisternas Valle', contact: 'Lucía Camacho', email: 'cisternas.valle@dieselp2p.demo', zone: 'Cochabamba', vehicle: 'Cisterna 12.000 L', capacity: 12000, coverage: 'Cochabamba y Valles' },
    { name: 'Ruta Verde Logística', contact: 'Pablo Arce', email: 'rutaverde@dieselp2p.demo', zone: 'Warnes', vehicle: 'Cisterna 8.000 L', capacity: 8000, coverage: 'Santa Cruz y Este' },
  ];
  carrierDefs.forEach((d, i) => {
    const prof = addProfile({ full_name: d.contact, email: d.email, phone: `+591 7${String(3000000 + i * 71).padStart(7, '0')}`, role: 'carrier' });
    const zz = z(d.zone);
    carrier_profiles.push({
      id: CA(i + 1),
      profile_id: prof.id,
      company_name: d.name,
      vehicle_type: d.vehicle,
      capacity_liters: d.capacity,
      coverage_area: d.coverage,
      latitude: zz.lat + 0.01,
      longitude: zz.lng - 0.01,
      created_at: dayOffset(-60),
    });
  });

  // ---------- OFERTAS ACTIVAS (caso principal + alternativo + otras) ----------
  let offerSeq = 0;
  const addOffer = (o: {
    supplier: number;
    liters: number;
    price: number;
    availableInDays: number;
    zone?: keyof typeof ZONES;
    status?: Offer['status'];
    remaining?: number;
    createdDaysAgo?: number;
  }): Offer => {
    const sup = supplier_profiles[o.supplier - 1];
    const zz = o.zone ? z(o.zone) : { lat: sup.latitude, lng: sup.longitude };
    const offer: Offer = {
      id: OF(++offerSeq),
      supplier_id: sup.id,
      available_liters: o.liters,
      remaining_liters: o.remaining ?? o.liters,
      price_per_liter: o.price,
      available_date: dateOnly(dayOffset(o.availableInDays)),
      location_name: o.zone ?? sup.location_name,
      latitude: zz.lat,
      longitude: zz.lng,
      status: o.status ?? 'ACTIVE',
      created_at: dayOffset(-(o.createdDaysAgo ?? 2), 8),
    };
    offers.push(offer);
    return offer;
  };

  // Caso principal: 10.000 L (Santa Cruz, 20/09/2026) => A 7.000 + B 3.000
  const offerA = addOffer({ supplier: 1, liters: 7000, price: 3.72, availableInDays: 2 }); // Combustibles del Norte (Montero)
  const offerB = addOffer({ supplier: 2, liters: 3000, price: 3.78, availableInDays: 3 }); // Distribuidora Warnes Energía
  addOffer({ supplier: 3, liters: 8000, price: 4.05, availableInDays: 1 }); // Petro Oriente (más caro, cerca)
  // Caso alternativo: 10.000 L (Cotoca, 28/09/2026) => 5.000 + 3.000 + 2.000 (disponibles después del 20/09)
  addOffer({ supplier: 4, liters: 5000, price: 3.7, availableInDays: 11 });
  addOffer({ supplier: 4, liters: 3000, price: 3.72, availableInDays: 12, zone: 'Pailón' });
  addOffer({ supplier: 3, liters: 2000, price: 3.74, availableInDays: 11, zone: 'Cotoca' });
  // Otras ofertas activas en distintas zonas
  addOffer({ supplier: 5, liters: 12000, price: 3.68, availableInDays: 4 }); // Yacuiba
  addOffer({ supplier: 6, liters: 9000, price: 3.75, availableInDays: 2 }); // Camiri
  addOffer({ supplier: 7, liters: 15000, price: 3.7, availableInDays: 3 }); // Cochabamba
  addOffer({ supplier: 8, liters: 6000, price: 3.8, availableInDays: 5 }); // Trinidad
  addOffer({ supplier: 1, liters: 4000, price: 3.85, availableInDays: 9, zone: 'Mineros' });
  addOffer({ supplier: 3, liters: 10000, price: 4.1, availableInDays: 6, zone: 'La Guardia' });
  addOffer({ supplier: 6, liters: 5000, price: 3.79, availableInDays: 8, zone: 'Vallegrande' });
  addOffer({ supplier: 2, liters: 2500, price: 3.9, availableInDays: 14, zone: 'Okinawa' });
  addOffer({ supplier: 5, liters: 7000, price: 3.66, availableInDays: 10, zone: 'Tarija' });
  addOffer({ supplier: 8, liters: 3500, price: 3.82, availableInDays: 7, zone: 'San Julián' });

  // ---------- HISTÓRICO: demandas, matches, operaciones ----------
  const random = rng(20260913);
  const pick = <T,>(arr: T[]) => arr[Math.floor(random() * arr.length)];
  const nearestSuppliers = (lat: number, lng: number) =>
    [...supplier_profiles].sort(
      (a, b) => roadDistanceKm(lat, lng, a.latitude, a.longitude) - roadDistanceKm(lat, lng, b.latitude, b.longitude),
    );

  let demandSeq = 0;
  let matchSeq = 0;
  let itemSeq = 0;
  let transportSeq = 0;
  let opSeq = 0;
  let anomalySeq = 0;

  const litersOptions = [2000, 3000, 4000, 5000, 6000, 8000, 10000, 12000];
  const carriersByZone = (lat: number, lng: number) =>
    [...carrier_profiles].sort(
      (a, b) => roadDistanceKm(lat, lng, a.latitude, a.longitude) - roadDistanceKm(lat, lng, b.latitude, b.longitude),
    )[0];

  interface HistoricalOp {
    producerIdx: number;
    liters: number;
    daysAgo: number;
    split?: number[]; // porcentaje por proveedor
    status: 'DELIVERED' | 'IN_TRANSIT' | 'ASSIGNED' | 'CREATED';
    carrierIdx?: number;
  }

  const historical: HistoricalOp[] = [];
  const producersForHistory = [0, 1, 2, 3, 4, 5, 6, 7, 8]; // excluye a la distribuidora (caso anomalía)
  for (let i = 0; i < 18; i++) {
    historical.push({
      producerIdx: producersForHistory[i % producersForHistory.length],
      liters: pick(litersOptions),
      daysAgo: 30 - Math.floor(i * 1.6),
      split: i % 3 === 0 ? [0.6, 0.4] : undefined,
      status: 'DELIVERED',
    });
  }
  // Operación en tránsito para el transportista demo (Logística Oriente)
  historical.push({ producerIdx: 4, liters: 8000, daysAgo: 1, split: [0.625, 0.375], status: 'IN_TRANSIT', carrierIdx: 0 });
  // Operación creada sin transportista asignado (aparece como pendiente)
  historical.push({ producerIdx: 5, liters: 6000, daysAgo: 0, status: 'CREATED' });

  const opStatusToDemand: Record<HistoricalOp['status'], Demand['status']> = {
    DELIVERED: 'COMPLETED',
    IN_TRANSIT: 'IN_PROGRESS',
    ASSIGNED: 'IN_PROGRESS',
    CREATED: 'MATCHED',
  };
  const opStatusToTransport: Record<HistoricalOp['status'], TransportOrder['status']> = {
    DELIVERED: 'DELIVERED',
    IN_TRANSIT: 'IN_TRANSIT',
    ASSIGNED: 'ASSIGNED',
    CREATED: 'PENDING',
  };

  for (const h of historical) {
    const producer = producer_profiles[h.producerIdx];
    const createdAt = dayOffset(-h.daysAgo, 8 + Math.floor(random() * 8));
    const demand: Demand = {
      id: DE(++demandSeq),
      producer_id: producer.id,
      requested_liters: h.liters,
      remaining_liters: 0,
      target_price: 3.8,
      required_date: dateOnly(dayOffset(-h.daysAgo + 4)),
      location_name: producer.location_name,
      latitude: producer.latitude,
      longitude: producer.longitude,
      activity_type: producer.activity_type,
      status: opStatusToDemand[h.status],
      created_at: createdAt,
    };
    demands.push(demand);

    const split = h.split ?? [1];
    const nearby = nearestSuppliers(demand.latitude, demand.longitude).slice(0, 3);
    const items: MatchItem[] = [];
    const usedOffers: Offer[] = [];
    let fuel = 0;
    let transport = 0;
    let refDistanceSum = 0;
    const matchId = MA(++matchSeq);

    split.forEach((share, idx) => {
      const sup = nearby[idx];
      const liters = Math.round((h.liters * share) / 100) * 100;
      const price = Math.round((3.62 + random() * 0.28) * 100) / 100;
      const offer = addOffer({
        supplier: supplier_profiles.indexOf(sup) + 1,
        liters,
        price,
        availableInDays: -h.daysAgo - 1,
        status: 'FULLY_ALLOCATED',
        remaining: 0,
        createdDaysAgo: h.daysAgo + 3,
      });
      usedOffers.push(offer);
      const distance = roadDistanceKm(offer.latitude, offer.longitude, demand.latitude, demand.longitude);
      const transportCost = Math.round(params.baseTripCost + distance * params.costPerKm);
      const subtotal = Math.round(liters * price * 100) / 100;
      fuel += subtotal;
      transport += transportCost;
      refDistanceSum += distance * 1.9; // escenario de referencia: proveedor no optimizado más lejano
      items.push({
        id: MI(++itemSeq),
        match_id: matchId,
        offer_id: offer.id,
        allocated_liters: liters,
        price_per_liter: price,
        distance_km: distance,
        transport_cost: transportCost,
        subtotal,
      });
    });

    const totalLiters = items.reduce((s, it) => s + it.allocated_liters, 0);
    const totalCost = Math.round((fuel + transport) * 100) / 100;
    const referenceCost =
      Math.round(
        (totalLiters * params.referencePricePerLiter +
          (params.baseTripCost + refDistanceSum * params.costPerKm) * Math.ceil(totalLiters / params.truckCapacityLiters)) *
          100,
      ) / 100;
    const savings = Math.round((referenceCost - totalCost) * 100) / 100;
    const avgDist = items.reduce((s, it) => s + it.distance_km * it.allocated_liters, 0) / totalLiters;
    const distanceScore = Math.round(Math.max(0, Math.min(25, 25 * (1 - Math.max(0, avgDist - 20) / 230))));
    const priceScore = 18;
    const volumeScore = items.length <= 2 ? 10 : 8;
    const timeScore = avgDist <= 40 ? 10 : avgDist <= 120 ? 9 : 8;
    const breakdown = { availability: 35, distance: distanceScore, price: priceScore, volume: volumeScore, time: timeScore };
    const score = Object.values(breakdown).reduce((s, v) => s + v, 0);

    matches.push({
      id: matchId,
      demand_id: demand.id,
      status: 'CONFIRMED',
      total_liters: totalLiters,
      total_fuel_cost: Math.round(fuel * 100) / 100,
      estimated_transport_cost: transport,
      estimated_total_cost: totalCost,
      estimated_savings: savings,
      savings_percent: Math.round((savings / referenceCost) * 1000) / 10,
      reference_cost: referenceCost,
      score,
      score_breakdown: breakdown,
      explanation: [
        `Se combinan ${items.length} oferta(s) verificada(s) para cubrir ${totalLiters.toLocaleString('es-BO')} L (100%).`,
        `Distancia promedio ponderada de ${Math.round(avgDist)} km respecto al punto de entrega.`,
        `Costo total estimado Bs ${totalCost.toLocaleString('es-BO')} frente a Bs ${referenceCost.toLocaleString('es-BO')} de referencia.`,
      ],
      created_at: dayOffset(-h.daysAgo, 12),
    });
    match_items.push(...items);

    const carrier = h.carrierIdx !== undefined ? carrier_profiles[h.carrierIdx] : carriersByZone(demand.latitude, demand.longitude);
    const tStatus = opStatusToTransport[h.status];
    for (const it of items) {
      const offer = usedOffers.find((o) => o.id === it.offer_id)!;
      const sup = supplier_profiles.find((s) => s.id === offer.supplier_id)!;
      transport_orders.push({
        id: TR(++transportSeq),
        match_id: matchId,
        match_item_id: it.id,
        carrier_id: tStatus === 'PENDING' ? null : carrier.id,
        origin_name: `${sup.business_name} · ${offer.location_name}`,
        origin_latitude: offer.latitude,
        origin_longitude: offer.longitude,
        destination_name: `${producer.organization_name} · ${demand.location_name}`,
        destination_latitude: demand.latitude,
        destination_longitude: demand.longitude,
        liters: it.allocated_liters,
        distance_km: it.distance_km,
        estimated_cost: it.transport_cost,
        status: tStatus,
        created_at: dayOffset(-h.daysAgo, 13),
        updated_at: dayOffset(-h.daysAgo + (h.status === 'DELIVERED' ? 2 : 0), 15),
      });
    }

    operations.push({
      id: OP(++opSeq),
      operation_code: operationCode(opSeq, 2026),
      match_id: matchId,
      producer_id: producer.id,
      status: h.status,
      verification_status: 'VERIFIED',
      qr_token: `demo${String(opSeq).padStart(4, '0')}${matchId.slice(-8)}`,
      created_at: dayOffset(-h.daysAgo, 13),
      updated_at: dayOffset(-h.daysAgo + (h.status === 'DELIVERED' ? 2 : 0), 16),
    });
  }

  // Demanda ABIERTA del caso alternativo (Agro Cotoca, 10.000 L => 5.000 + 3.000 + 2.000)
  const agroCotoca = producer_profiles[7];
  demands.push({
    id: DE(++demandSeq),
    producer_id: agroCotoca.id,
    requested_liters: 10000,
    remaining_liters: 10000,
    target_price: 3.8,
    required_date: dateOnly(dayOffset(15)),
    location_name: agroCotoca.location_name,
    latitude: agroCotoca.latitude,
    longitude: agroCotoca.longitude,
    activity_type: agroCotoca.activity_type,
    status: 'OPEN',
    created_at: dayOffset(-1, 10),
  });

  // Demanda abierta de ganadería (compatible con varios proveedores)
  const trebol = producer_profiles[2];
  demands.push({
    id: DE(++demandSeq),
    producer_id: trebol.id,
    requested_liters: 4000,
    remaining_liters: 4000,
    target_price: 3.85,
    required_date: dateOnly(dayOffset(9)),
    location_name: trebol.location_name,
    latitude: trebol.latitude,
    longitude: trebol.longitude,
    activity_type: trebol.activity_type,
    status: 'OPEN',
    created_at: dayOffset(-2, 11),
  });

  // ---------- CASO ANOMALÍA: Distribuidora Oriente Alimentos ----------
  const dist = producer_profiles[9];
  const distProfile = profiles.find((p) => p.id === dist.profile_id)!;
  // Histórico normal: 1.200 - 1.800 L
  [1200, 1500, 1800].forEach((liters, i) => {
    demands.push({
      id: DE(++demandSeq),
      producer_id: dist.id,
      requested_liters: liters,
      remaining_liters: 0,
      target_price: 3.8,
      required_date: dateOnly(dayOffset(-20 + i * 6)),
      location_name: dist.location_name,
      latitude: dist.latitude,
      longitude: dist.longitude,
      activity_type: dist.activity_type,
      status: 'COMPLETED',
      created_at: dayOffset(-24 + i * 6, 10),
    });
  });
  // Solicitud inusual: 20.000 L
  demands.push({
    id: DE(++demandSeq),
    producer_id: dist.id,
    requested_liters: 20000,
    remaining_liters: 20000,
    target_price: 3.6,
    required_date: dateOnly(dayOffset(3)),
    location_name: dist.location_name,
    latitude: dist.latitude,
    longitude: dist.longitude,
    activity_type: dist.activity_type,
    status: 'OPEN',
    created_at: dayOffset(-1, 15),
  });
  // Solicitudes frecuentes en pocas horas
  [0, 1, 2].forEach((i) => {
    demands.push({
      id: DE(++demandSeq),
      producer_id: dist.id,
      requested_liters: 1500,
      remaining_liters: 1500,
      target_price: 3.8,
      required_date: dateOnly(dayOffset(4)),
      location_name: dist.location_name,
      latitude: dist.latitude,
      longitude: dist.longitude,
      activity_type: dist.activity_type,
      status: 'OPEN',
      created_at: dayOffset(0, 6 + i),
    });
  });

  const transSur = producer_profiles[3];
  const transSurProfile = profiles.find((p) => p.id === transSur.profile_id)!;
  const transSurOp = operations.find((o) => o.producer_id === transSur.id) ?? null;
  const fruticola = producer_profiles[8];
  const fruticolaProfile = profiles.find((p) => p.id === fruticola.profile_id)!;
  const petroProfile = profiles.find((p) => p.id === supplier_profiles[2].profile_id)!;

  const addAnomaly = (a: Omit<AnomalyEvent, 'id' | 'created_at'> & { daysAgo: number }) => {
    const { daysAgo, ...rest } = a;
    anomaly_events.push({ id: AN(++anomalySeq), created_at: dayOffset(-daysAgo, 16), ...rest });
  };
  addAnomaly({
    profile_id: distProfile.id,
    operation_id: null,
    type: 'UNUSUAL_VOLUME',
    risk_score: 82,
    description: 'Solicitud de 20.000 L frente a un promedio histórico de 1.500 L (13x). Verificar capacidad productiva declarada.',
    status: 'OPEN',
    daysAgo: 1,
  });
  addAnomaly({
    profile_id: distProfile.id,
    operation_id: null,
    type: 'FREQUENT_REQUESTS',
    risk_score: 74,
    description: '3 solicitudes publicadas en menos de 3 horas para la misma ubicación.',
    status: 'OPEN',
    daysAgo: 0,
  });
  addAnomaly({
    profile_id: transSurProfile.id,
    operation_id: transSurOp?.id ?? null,
    type: 'RAPID_RESALE_PATTERN',
    risk_score: 87,
    description: 'Secuencia simulada compra → compra → compra → transferencia en 72 horas. Volumen acumulado supera 2,4x la capacidad declarada.',
    status: 'OPEN',
    daysAgo: 3,
  });
  addAnomaly({
    profile_id: fruticolaProfile.id,
    operation_id: null,
    type: 'MULTIPLE_LOCATIONS',
    risk_score: 65,
    description: 'Demandas registradas en 3 ubicaciones separadas por más de 150 km en 7 días.',
    status: 'REVIEWED',
    daysAgo: 6,
  });
  addAnomaly({
    profile_id: petroProfile.id,
    operation_id: null,
    type: 'OTHER',
    risk_score: 41,
    description: 'Precio publicado 9% por encima del promedio de la zona. Sin evidencia de irregularidad.',
    status: 'DISMISSED',
    daysAgo: 10,
  });

  // Marca las ofertas del caso principal con "remaining" completo por claridad
  offerA.remaining_liters = 7000;
  offerB.remaining_liters = 3000;

  return {
    profiles,
    producer_profiles,
    supplier_profiles,
    carrier_profiles,
    demands,
    offers,
    matches,
    match_items,
    transport_orders,
    operations,
    anomaly_events,
  };
}
