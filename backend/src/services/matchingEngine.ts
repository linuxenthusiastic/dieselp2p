/**
 * MOTOR DE MATCHING — corazón técnico de DieselP2P.
 *
 * Dada una demanda (volumen, ubicación, fecha, precio objetivo) y un conjunto
 * de ofertas, encuentra la combinación de UNA O VARIAS ofertas que cubre el
 * volumen al menor costo total (combustible + logística), y la explica con un
 * score de 0 a 100.
 *
 * Regla fundamental: una demanda puede ser cubierta por múltiples proveedores.
 *   10.000 L = 7.000 L (Proveedor A) + 3.000 L (Proveedor B)
 */
import { params } from '../config.js';
import type { Demand, Offer, ScoreBreakdown, SupplierProfile } from '../types/domain.js';
import { roadDistanceKm, round2 } from '../utils/geo.js';
import { summarizeCosts, transportCost, type CostSummary } from './costEngine.js';

export interface CandidateOffer {
  offer: Offer;
  supplier: SupplierProfile;
  distanceKm: number;
  /** Costo unitario efectivo (precio + logística prorrateada) usado para ordenar candidatos. */
  effectiveUnitCost: number;
  daysBeforeRequired: number;
}

export interface AllocationItem {
  offer: Offer;
  supplier: SupplierProfile;
  allocatedLiters: number;
  pricePerLiter: number;
  distanceKm: number;
  transportCost: number;
  subtotal: number;
}

export interface MatchProposal {
  items: AllocationItem[];
  totalLiters: number;
  coverage: number; // 0..1
  costs: CostSummary;
  score: number;
  breakdown: ScoreBreakdown;
  explanation: string[];
}

export interface MatchingResult {
  best: MatchProposal | null;
  alternatives: MatchProposal[];
  analyzedOffers: number;
  feasibleOffers: number;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const daysBetween = (fromIso: string, toIso: string) =>
  Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000);

/** Filtra ofertas viables y calcula distancia y costo efectivo. */
export function buildCandidates(demand: Demand, offers: Offer[], suppliers: SupplierProfile[]): CandidateOffer[] {
  const supplierById = new Map(suppliers.map((s) => [s.id, s]));
  const candidates: CandidateOffer[] = [];
  for (const offer of offers) {
    if (!['ACTIVE', 'PARTIALLY_ALLOCATED'].includes(offer.status)) continue;
    if (offer.remaining_liters <= 0) continue;
    const supplier = supplierById.get(offer.supplier_id);
    if (!supplier || supplier.verification_status !== 'VERIFIED') continue;
    const daysBeforeRequired = daysBetween(offer.available_date, demand.required_date);
    if (daysBeforeRequired < 0) continue; // no disponible a tiempo
    const distanceKm = roadDistanceKm(offer.latitude, offer.longitude, demand.latitude, demand.longitude);
    if (distanceKm > params.maxRadiusKm) continue;
    const usable = Math.min(offer.remaining_liters, demand.remaining_liters);
    const effectiveUnitCost = offer.price_per_liter + transportCost(distanceKm) / usable;
    candidates.push({ offer, supplier, distanceKm, effectiveUnitCost, daysBeforeRequired });
  }
  return candidates.sort((a, b) => a.effectiveUnitCost - b.effectiveUnitCost);
}

/** Asigna litros a un subconjunto de candidatos (más barato primero) hasta cubrir la demanda. */
function allocate(subset: CandidateOffer[], needed: number): AllocationItem[] {
  const ordered = [...subset].sort((a, b) => a.offer.price_per_liter - b.offer.price_per_liter);
  const items: AllocationItem[] = [];
  let remaining = needed;
  for (const c of ordered) {
    if (remaining <= 0) break;
    const liters = Math.min(c.offer.remaining_liters, remaining);
    if (liters <= 0) continue;
    const tCost = transportCost(c.distanceKm);
    items.push({
      offer: c.offer,
      supplier: c.supplier,
      allocatedLiters: liters,
      pricePerLiter: c.offer.price_per_liter,
      distanceKm: c.distanceKm,
      transportCost: tCost,
      subtotal: round2(liters * c.offer.price_per_liter),
    });
    remaining -= liters;
  }
  return items;
}

function scoreProposal(items: AllocationItem[], demand: Demand, candidates: CandidateOffer[]): { score: number; breakdown: ScoreBreakdown } {
  const needed = demand.remaining_liters;
  const total = items.reduce((s, it) => s + it.allocatedLiters, 0);
  const coverage = needed > 0 ? clamp(total / needed, 0, 1) : 0;

  // 35% disponibilidad: porcentaje del volumen cubierto por ofertas disponibles a tiempo
  const availability = Math.round(35 * coverage);

  // 25% distancia: promedio ponderado por litros; 25 puntos hasta 20 km, 0 a 250 km
  const avgDistance = total > 0 ? items.reduce((s, it) => s + it.distanceKm * it.allocatedLiters, 0) / total : 0;
  const distance = Math.round(clamp(25 * (1 - Math.max(0, avgDistance - 20) / 230), 0, 25));

  // 20% precio: precio promedio ponderado vs. precio objetivo (o referencia de mercado)
  const avgPrice = total > 0 ? items.reduce((s, it) => s + it.subtotal, 0) / total : 0;
  const target = demand.target_price ?? params.referencePricePerLiter;
  const ratio = target > 0 ? avgPrice / target : 1;
  const price = ratio <= 0.95 ? 20 : ratio <= 1 ? 18 : Math.round(clamp(18 * (1 - (ratio - 1) / 0.3), 0, 18));

  // 10% volumen compatible: menor fragmentación = mejor
  const fragmentationPenalty = items.length <= 2 ? 0 : items.length === 3 ? 2 : 4;
  const volume = Math.round(clamp(10 * coverage - fragmentationPenalty, 0, 10));

  // 10% tiempo de entrega: distancia máxima de recorrido y holgura de fechas
  const maxDistance = items.reduce((m, it) => Math.max(m, it.distanceKm), 0);
  let time = maxDistance <= 40 ? 10 : maxDistance <= 120 ? 9 : maxDistance <= 200 ? 8 : maxDistance <= 300 ? 7 : 6;
  const minSlack = Math.min(
    ...items.map((it) => candidates.find((c) => c.offer.id === it.offer.id)?.daysBeforeRequired ?? 0),
  );
  if (Number.isFinite(minSlack) && minSlack < 1) time = Math.max(0, time - 2);

  const breakdown = { availability, distance, price, volume, time };
  return { score: availability + distance + price + volume + time, breakdown };
}

function explain(items: AllocationItem[], demand: Demand, costs: CostSummary, coverage: number): string[] {
  const total = items.reduce((s, it) => s + it.allocatedLiters, 0);
  const avgDistance = total > 0 ? items.reduce((s, it) => s + it.distanceKm * it.allocatedLiters, 0) / total : 0;
  const avgPrice = total > 0 ? costs.fuelCost / total : 0;
  const lines: string[] = [];
  lines.push(
    items.length === 1
      ? `Una sola oferta verificada cubre ${total.toLocaleString('es-BO')} L (${Math.round(coverage * 100)}% de la demanda).`
      : `Se combinan ${items.length} ofertas verificadas: ${items.map((it) => `${it.allocatedLiters.toLocaleString('es-BO')} L`).join(' + ')} = ${total.toLocaleString('es-BO')} L (${Math.round(coverage * 100)}%).`,
  );
  lines.push(`Distancia promedio ponderada de ${Math.round(avgDistance)} km hasta ${demand.location_name}.`);
  const target = demand.target_price ?? params.referencePricePerLiter;
  const diff = Math.round(((avgPrice - target) / target) * 1000) / 10;
  lines.push(
    `Precio promedio Bs ${avgPrice.toFixed(2)}/L, ${Math.abs(diff)}% ${diff <= 0 ? 'por debajo' : 'por encima'} del precio objetivo (Bs ${target.toFixed(2)}/L).`,
  );
  lines.push(
    `Costo total estimado Bs ${costs.totalCost.toLocaleString('es-BO')} (combustible + logística) vs. Bs ${costs.referenceCost.toLocaleString('es-BO')} de referencia: ahorro estimado ${costs.savingsPercent}%.`,
  );
  return lines;
}

function buildProposal(subset: CandidateOffer[], demand: Demand, candidates: CandidateOffer[], referenceDistanceKm: number): MatchProposal | null {
  const items = allocate(subset, demand.remaining_liters);
  if (items.length === 0) return null;
  const totalLiters = items.reduce((s, it) => s + it.allocatedLiters, 0);
  const fuel = items.reduce((s, it) => s + it.subtotal, 0);
  const transport = items.reduce((s, it) => s + it.transportCost, 0);
  const costs = summarizeCosts(fuel, transport, totalLiters, referenceDistanceKm);
  const coverage = demand.remaining_liters > 0 ? totalLiters / demand.remaining_liters : 0;
  const { score, breakdown } = scoreProposal(items, demand, candidates);
  return { items, totalLiters, coverage, costs, score, breakdown, explanation: explain(items, demand, costs, coverage) };
}

/** Genera subconjuntos de tamaño 1..k de un arreglo (búsqueda combinatoria acotada). */
function* subsets<T>(arr: T[], maxSize: number): Generator<T[]> {
  const n = arr.length;
  const current: T[] = [];
  function* rec(start: number): Generator<T[]> {
    if (current.length > 0) yield [...current];
    if (current.length >= maxSize) return;
    for (let i = start; i < n; i++) {
      current.push(arr[i]);
      yield* rec(i + 1);
      current.pop();
    }
  }
  yield* rec(0);
}

const proposalKey = (p: MatchProposal) => p.items.map((it) => it.offer.id).sort().join('|');

/**
 * Busca la mejor combinación de ofertas para una demanda.
 * Orden de preferencia: mayor cobertura → menor costo total → mayor score.
 */
export function findBestMatch(demand: Demand, offers: Offer[], suppliers: SupplierProfile[]): MatchingResult {
  const candidates = buildCandidates(demand, offers, suppliers);
  const analyzedOffers = offers.filter((o) => ['ACTIVE', 'PARTIALLY_ALLOCATED'].includes(o.status)).length;
  if (candidates.length === 0) return { best: null, alternatives: [], analyzedOffers, feasibleOffers: 0 };

  // Distancia de referencia: promedio de las ofertas viables (elección sin información)
  const referenceDistanceKm = candidates.reduce((s, c) => s + c.distanceKm, 0) / candidates.length;

  const pool = candidates.slice(0, params.candidatePoolSize);
  const proposals: MatchProposal[] = [];
  const seen = new Set<string>();
  for (const subset of subsets(pool, params.maxSuppliersPerMatch)) {
    const capacity = subset.reduce((s, c) => s + c.offer.remaining_liters, 0);
    // descarta subconjuntos donde alguna oferta no aporta (sobrecapacidad evidente)
    if (subset.length > 1 && capacity - Math.min(...subset.map((c) => c.offer.remaining_liters)) >= demand.remaining_liters) continue;
    const p = buildProposal(subset, demand, candidates, referenceDistanceKm);
    if (!p) continue;
    const key = proposalKey(p);
    if (seen.has(key)) continue;
    seen.add(key);
    proposals.push(p);
  }

  proposals.sort((a, b) => {
    if (b.coverage !== a.coverage) return b.coverage - a.coverage;
    if (a.costs.totalCost !== b.costs.totalCost) return a.costs.totalCost - b.costs.totalCost;
    return b.score - a.score;
  });

  const [best, ...rest] = proposals;
  return { best: best ?? null, alternatives: rest.slice(0, 3), analyzedOffers, feasibleOffers: candidates.length };
}
