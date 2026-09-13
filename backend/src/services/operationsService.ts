import { store } from '../data/store.js';
import type { AuthContext, Demand, Match, MatchItem, Offer, Operation, OperationStatus, TransportOrder, TransportStatus } from '../types/domain.js';
import { badRequest, forbidden, notFound } from '../utils/errors.js';
import { newId, newQrToken, nowIso, operationCode } from '../utils/ids.js';
import { roadDistanceKm } from '../utils/geo.js';
import { env } from '../config.js';
import { findBestMatch, type MatchProposal } from './matchingEngine.js';
import { views, type MatchView, type OperationView } from './queryService.js';

/**
 * Orquestación de negocio: matching → confirmación → transporte → operación.
 */

function proposalToMatch(demandId: string, p: MatchProposal): { match: Match; items: MatchItem[] } {
  const matchId = newId();
  const match: Match = {
    id: matchId,
    demand_id: demandId,
    status: 'PROPOSED',
    total_liters: p.totalLiters,
    total_fuel_cost: p.costs.fuelCost,
    estimated_transport_cost: p.costs.transportCost,
    estimated_total_cost: p.costs.totalCost,
    estimated_savings: p.costs.savings,
    savings_percent: p.costs.savingsPercent,
    reference_cost: p.costs.referenceCost,
    score: p.score,
    score_breakdown: p.breakdown,
    explanation: p.explanation,
    created_at: nowIso(),
  };
  const items: MatchItem[] = p.items.map((it) => ({
    id: newId(),
    match_id: matchId,
    offer_id: it.offer.id,
    allocated_liters: it.allocatedLiters,
    price_per_liter: it.pricePerLiter,
    distance_km: it.distanceKm,
    transport_cost: it.transportCost,
    subtotal: it.subtotal,
  }));
  return { match, items };
}

export interface MatchingResponse {
  match: MatchView | null;
  alternatives: MatchView[];
  analyzedOffers: number;
  feasibleOffers: number;
}

/** Ejecuta el motor de matching para una demanda y persiste la propuesta óptima. */
export async function runMatchingForDemand(demandId: string, auth: AuthContext): Promise<MatchingResponse> {
  const demand = await store.get('demands', demandId);
  if (!demand) throw notFound('Demanda');
  if (auth.profile.role === 'producer' && demand.producer_id !== auth.producer?.id) throw forbidden();
  if (!['OPEN', 'PARTIALLY_MATCHED'].includes(demand.status)) throw badRequest('La demanda no está abierta para matching');

  const [offers, suppliers] = await Promise.all([store.list('offers'), store.list('supplier_profiles')]);
  const result = findBestMatch(demand, offers, suppliers);

  // Cancela propuestas previas no confirmadas de esta demanda
  const previous = await store.list('matches', { demand_id: demandId, status: 'PROPOSED' });
  for (const m of previous) await store.update('matches', m.id, { status: 'CANCELLED' });

  let persisted: Match | null = null;
  if (result.best) {
    const { match, items } = proposalToMatch(demandId, result.best);
    persisted = await store.insert('matches', match);
    for (const it of items) await store.insert('match_items', it);
  }

  const v = await views();
  // Las alternativas no se persisten: se construyen como vistas efímeras
  const altViews = result.alternatives.map((p, idx) => {
    const { match, items } = proposalToMatch(demandId, p);
    const id = `alt-${idx + 1}`;
    return {
      ...match,
      id,
      items: items.map((it) => ({
        ...it,
        match_id: id,
        offer: v.getOffer(it.offer_id),
        supplier: v.supplierSummary(p.items.find((x) => x.offer.id === it.offer_id)!.supplier.id),
      })),
      demand: v.demand(demand),
      operation: null,
    } satisfies MatchView;
  });

  return {
    match: persisted ? v.match(persisted) : null,
    alternatives: altViews,
    analyzedOffers: result.analyzedOffers,
    feasibleOffers: result.feasibleOffers,
  };
}

async function nextOperationCode(): Promise<string> {
  const count = await store.count('operations');
  return operationCode(count + 1, 2026);
}

/** Confirma un match: asigna litros de las ofertas, crea órdenes de transporte y la operación trazable. */
export async function confirmMatch(matchId: string, auth: AuthContext): Promise<OperationView> {
  const match = await store.get('matches', matchId);
  if (!match) throw notFound('Match');
  if (match.status !== 'PROPOSED') throw badRequest('El match ya fue confirmado o cancelado');
  const demand = await store.get('demands', match.demand_id);
  if (!demand) throw notFound('Demanda');
  if (auth.profile.role === 'producer' && demand.producer_id !== auth.producer?.id) throw forbidden();

  const items = await store.list('match_items', { match_id: matchId });
  const producer = await store.get('producer_profiles', demand.producer_id);
  if (!producer) throw notFound('Productor');

  for (const it of items) {
    const offer = await store.get('offers', it.offer_id);
    if (!offer) throw notFound('Oferta');
    if (offer.remaining_liters < it.allocated_liters) throw badRequest(`La oferta de ${offer.location_name} ya no tiene volumen suficiente. Vuelve a ejecutar el matching.`);
    const remaining = offer.remaining_liters - it.allocated_liters;
    const patch: Partial<Offer> = { remaining_liters: remaining, status: remaining === 0 ? 'FULLY_ALLOCATED' : 'PARTIALLY_ALLOCATED' };
    await store.update('offers', offer.id, patch);
    const supplier = await store.get('supplier_profiles', offer.supplier_id);
    const transport: TransportOrder = {
      id: newId(),
      match_id: matchId,
      match_item_id: it.id,
      carrier_id: null,
      origin_name: `${supplier?.business_name ?? 'Proveedor'} · ${offer.location_name}`,
      origin_latitude: offer.latitude,
      origin_longitude: offer.longitude,
      destination_name: `${producer.organization_name} · ${demand.location_name}`,
      destination_latitude: demand.latitude,
      destination_longitude: demand.longitude,
      liters: it.allocated_liters,
      distance_km: it.distance_km,
      estimated_cost: it.transport_cost,
      status: 'PENDING',
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    await store.insert('transport_orders', transport);
  }

  const remainingDemand = Math.max(0, demand.remaining_liters - match.total_liters);
  const demandPatch: Partial<Demand> = {
    remaining_liters: remainingDemand,
    status: remainingDemand === 0 ? 'MATCHED' : 'PARTIALLY_MATCHED',
  };
  await store.update('demands', demand.id, demandPatch);
  await store.update('matches', matchId, { status: 'CONFIRMED' });

  const operation: Operation = {
    id: newId(),
    operation_code: await nextOperationCode(),
    match_id: matchId,
    producer_id: producer.id,
    status: 'CREATED',
    verification_status: 'VERIFIED',
    qr_token: newQrToken(),
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  await store.insert('operations', operation);
  const v = await views();
  return v.operation(operation);
}

/** Asigna un transportista a todas las órdenes de transporte de un match. */
export async function assignCarrier(matchId: string, carrierId: string, auth: AuthContext): Promise<OperationView> {
  const carrier = await store.get('carrier_profiles', carrierId);
  if (!carrier) throw notFound('Transportista');
  if (auth.profile.role === 'carrier' && auth.carrier?.id !== carrierId) throw forbidden();
  const orders = await store.list('transport_orders', { match_id: matchId });
  if (orders.length === 0) throw notFound('Órdenes de transporte');
  const totalLiters = orders.reduce((s, o) => s + o.liters, 0);
  if (totalLiters > carrier.capacity_liters * 2) throw badRequest('La capacidad del transportista es insuficiente para esta operación');
  for (const o of orders) {
    if (o.status !== 'PENDING') continue;
    await store.update('transport_orders', o.id, { carrier_id: carrierId, status: 'ASSIGNED', updated_at: nowIso() });
  }
  const ops = await store.list('operations', { match_id: matchId });
  const op = ops[0];
  if (!op) throw notFound('Operación');
  await store.update('operations', op.id, { status: 'ASSIGNED', updated_at: nowIso() });
  const match = await store.get('matches', matchId);
  if (match) await store.update('demands', match.demand_id, { status: 'IN_PROGRESS' });
  const v = await views();
  return v.operation((await store.get('operations', op.id))!);
}

const TRANSITIONS: Record<TransportStatus, TransportStatus[]> = {
  PENDING: ['ASSIGNED'],
  ASSIGNED: ['IN_TRANSIT'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: [],
};

/** Actualiza el estado de una orden de transporte y propaga a operación y demanda. */
export async function updateTransportStatus(transportId: string, status: TransportStatus, auth: AuthContext) {
  const order = await store.get('transport_orders', transportId);
  if (!order) throw notFound('Orden de transporte');
  if (auth.profile.role === 'carrier' && order.carrier_id !== auth.carrier?.id) throw forbidden();
  const allowed = TRANSITIONS[order.status];
  const isAdmin = auth.profile.role === 'admin';
  if (!allowed.includes(status) && !isAdmin) throw badRequest(`Transición no permitida: ${order.status} → ${status}`);
  await store.update('transport_orders', transportId, { status, updated_at: nowIso() });

  const siblings = await store.list('transport_orders', { match_id: order.match_id });
  const op = (await store.list('operations', { match_id: order.match_id }))[0];
  const match = await store.get('matches', order.match_id);
  if (op) {
    let opStatus = op.status;
    if (siblings.every((s) => s.status === 'DELIVERED')) opStatus = 'DELIVERED';
    else if (siblings.some((s) => s.status === 'IN_TRANSIT')) opStatus = 'IN_TRANSIT';
    else if (siblings.some((s) => s.status === 'ASSIGNED')) opStatus = 'ASSIGNED';
    else opStatus = 'CREATED';
    await store.update('operations', op.id, { status: opStatus, updated_at: nowIso() });
    if (match) {
      if (opStatus === 'DELIVERED') await store.update('demands', match.demand_id, { status: 'COMPLETED' });
      else if (opStatus === 'IN_TRANSIT' || opStatus === 'ASSIGNED') await store.update('demands', match.demand_id, { status: 'IN_PROGRESS' });
    }
  }
  const v = await views();
  return v.transport((await store.get('transport_orders', transportId))!);
}

/** Describe el siguiente paso simulable de una operación, sin ejecutarlo. */
export interface NextStepInfo {
  /** Acción interna a ejecutar. `null` cuando la operación ya terminó. */
  action: 'ASSIGN_CARRIER' | 'START_TRANSIT' | 'DELIVER' | null;
  /** Etiqueta para el botón de la interfaz. */
  label: string;
  /** Quién ejecutaría este paso en una operación real. */
  actor: string;
  /** Estado en el que quedará la operación. */
  nextStatus: OperationStatus | null;
}

export function describeNextStep(status: OperationStatus, hasCarrier: boolean): NextStepInfo {
  if (status === 'CREATED' && !hasCarrier)
    return { action: 'ASSIGN_CARRIER', label: 'Asignar transportista disponible', actor: 'el productor o el transportista', nextStatus: 'ASSIGNED' };
  if (status === 'CREATED' || status === 'ASSIGNED')
    return { action: 'START_TRANSIT', label: 'Iniciar tránsito', actor: 'el transportista desde su panel', nextStatus: 'IN_TRANSIT' };
  if (status === 'IN_TRANSIT')
    return { action: 'DELIVER', label: 'Confirmar entrega', actor: 'el transportista al llegar al destino', nextStatus: 'DELIVERED' };
  return { action: null, label: 'Operación finalizada', actor: '—', nextStatus: null };
}

/**
 * Avanza una operación al siguiente estado del flujo. Existe únicamente para la
 * demostración: permite recorrer el ciclo completo sin cambiar de usuario.
 * En una operación real cada paso lo ejecuta el actor correspondiente.
 */
export async function simulateNextStep(operationId: string, auth: AuthContext): Promise<OperationView> {
  if (!env.demoMode) throw forbidden('La simulación de pasos solo está disponible en modo demo');
  const op = await store.get('operations', operationId);
  if (!op) throw notFound('Operación');
  if (auth.profile.role === 'producer' && op.producer_id !== auth.producer?.id) throw forbidden();
  if (auth.profile.role === 'supplier') throw forbidden('El proveedor no participa en el avance logístico');

  const orders = await store.list('transport_orders', { match_id: op.match_id });
  if (orders.length === 0) throw notFound('Órdenes de transporte');
  const hasCarrier = orders.some((o) => o.carrier_id);
  const step = describeNextStep(op.status, hasCarrier);
  if (!step.action) throw badRequest('La operación ya está entregada o cancelada');

  if (step.action === 'ASSIGN_CARRIER') {
    const match = await store.get('matches', op.match_id);
    const liters = match?.total_liters ?? orders.reduce((s, o) => s + o.liters, 0);
    const carriers = await store.list('carrier_profiles');
    const destination = orders[0];
    // Transportista con capacidad suficiente y más cercano al punto de entrega
    const candidate = carriers
      .filter((c) => c.capacity_liters * 2 >= liters)
      .sort(
        (a, b) =>
          roadDistanceKm(a.latitude, a.longitude, destination.destination_latitude, destination.destination_longitude) -
          roadDistanceKm(b.latitude, b.longitude, destination.destination_latitude, destination.destination_longitude),
      )[0];
    if (!candidate) throw badRequest('No hay transportistas con capacidad suficiente para esta operación');
    return assignCarrier(op.match_id, candidate.id, { ...auth, profile: { ...auth.profile, role: 'admin' } });
  }

  const target: TransportStatus = step.action === 'START_TRANSIT' ? 'IN_TRANSIT' : 'DELIVERED';
  const from: TransportStatus = step.action === 'START_TRANSIT' ? 'ASSIGNED' : 'IN_TRANSIT';
  const adminAuth: AuthContext = { ...auth, profile: { ...auth.profile, role: 'admin' } };
  for (const o of orders) {
    if (o.status === from) await updateTransportStatus(o.id, target, adminAuth);
  }
  const v = await views();
  return v.operation((await store.get('operations', operationId))!);
}

