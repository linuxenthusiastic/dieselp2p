/**
 * Motor de impacto: agrega métricas de la simulación para dashboards.
 * Los indicadores se etiquetan como "Simulación del MVP".
 */
import type { AnomalyEvent, Demand, Match, MatchItem, Offer, Operation, ProducerProfile, TransportOrder } from '../types/domain.js';
import { params } from '../config.js';

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

interface Snapshot {
  demands: Demand[];
  offers: Offer[];
  matches: Match[];
  matchItems: MatchItem[];
  operations: Operation[];
  transportOrders: TransportOrder[];
  anomalies: AnomalyEvent[];
  producers: ProducerProfile[];
}

const zoneOf = (name: string) => name.split('·').pop()!.trim();

export function computeDashboard(s: Snapshot): DashboardMetrics {
  const confirmed = s.matches.filter((m) => m.status === 'CONFIRMED');
  const litersConnected = confirmed.reduce((a, m) => a + m.total_liters, 0);
  const activeDemandLiters = s.demands
    .filter((d) => ['OPEN', 'PARTIALLY_MATCHED'].includes(d.status))
    .reduce((a, d) => a + d.remaining_liters, 0);
  const availableOfferLiters = s.offers
    .filter((o) => ['ACTIVE', 'PARTIALLY_ALLOCATED'].includes(o.status))
    .reduce((a, o) => a + o.remaining_liters, 0);
  const estimatedSavings = Math.round(confirmed.reduce((a, m) => a + m.estimated_savings, 0));

  const zoneAgg = new Map<string, { oferta: number; demanda: number }>();
  for (const o of s.offers) {
    if (!['ACTIVE', 'PARTIALLY_ALLOCATED'].includes(o.status)) continue;
    const zone = zoneOf(o.location_name);
    const cur = zoneAgg.get(zone) ?? { oferta: 0, demanda: 0 };
    cur.oferta += o.remaining_liters;
    zoneAgg.set(zone, cur);
  }
  for (const d of s.demands) {
    if (!['OPEN', 'PARTIALLY_MATCHED'].includes(d.status)) continue;
    const zone = zoneOf(d.location_name);
    const cur = zoneAgg.get(zone) ?? { oferta: 0, demanda: 0 };
    cur.demanda += d.remaining_liters;
    zoneAgg.set(zone, cur);
  }
  const supplyVsDemand = [...zoneAgg.entries()]
    .map(([zone, v]) => ({ zone, ...v }))
    .sort((a, b) => b.oferta + b.demanda - (a.oferta + a.demanda))
    .slice(0, 8);

  const perDay = new Map<string, { litros: number; operaciones: number; ahorro: number }>();
  for (const m of confirmed) {
    const date = m.created_at.slice(0, 10);
    const cur = perDay.get(date) ?? { litros: 0, operaciones: 0, ahorro: 0 };
    cur.litros += m.total_liters;
    cur.operaciones += 1;
    cur.ahorro += m.estimated_savings;
    perDay.set(date, cur);
  }
  const days = [...perDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const litersPerDay = days.map(([date, v]) => ({ date, litros: v.litros, operaciones: v.operaciones }));
  let acc = 0;
  const savingsCumulative = days.map(([date, v]) => {
    acc += v.ahorro;
    return { date, ahorro: Math.round(acc) };
  });

  const statusCount = new Map<string, number>();
  for (const op of s.operations) statusCount.set(op.status, (statusCount.get(op.status) ?? 0) + 1);
  const operationsByStatus = [...statusCount.entries()].map(([status, total]) => ({ status, total }));

  const activityAgg = new Map<string, number>();
  const demandById = new Map(s.demands.map((d) => [d.id, d]));
  for (const m of confirmed) {
    const d = demandById.get(m.demand_id);
    if (!d) continue;
    activityAgg.set(d.activity_type, (activityAgg.get(d.activity_type) ?? 0) + m.total_liters);
  }
  const byActivity = [...activityAgg.entries()].map(([activity, litros]) => ({ activity, litros })).sort((a, b) => b.litros - a.litros);

  const volumeZone = new Map<string, number>();
  for (const m of confirmed) {
    const d = demandById.get(m.demand_id);
    if (!d) continue;
    const zone = zoneOf(d.location_name);
    volumeZone.set(zone, (volumeZone.get(zone) ?? 0) + m.total_liters);
  }
  const volumeByZone = [...volumeZone.entries()].map(([zone, litros]) => ({ zone, litros })).sort((a, b) => b.litros - a.litros).slice(0, 8);

  return {
    cards: {
      litersConnected,
      activeDemandLiters,
      availableOfferLiters,
      operations: s.operations.length,
      estimatedSavings,
      openAnomalies: s.anomalies.filter((a) => a.status === 'OPEN').length,
    },
    supplyVsDemand,
    litersPerDay,
    operationsByStatus,
    savingsCumulative,
    byActivity,
    volumeByZone,
  };
}

export function computeImpact(s: Snapshot): ImpactMetrics {
  const confirmed = s.matches.filter((m) => m.status === 'CONFIRMED');
  const demandById = new Map(s.demands.map((d) => [d.id, d]));
  const litersOptimized = confirmed.reduce((a, m) => a + m.total_liters, 0);
  const producersBenefited = new Set(confirmed.map((m) => demandById.get(m.demand_id)?.producer_id).filter(Boolean)).size;
  const itemsByMatch = new Map<string, MatchItem[]>();
  for (const it of s.matchItems) itemsByMatch.set(it.match_id, [...(itemsByMatch.get(it.match_id) ?? []), it]);
  // km optimizados: diferencia entre la distancia de referencia (no optimizada, ~1.9x) y la real
  let kmOptimized = 0;
  let logisticSavings = 0;
  for (const m of confirmed) {
    const items = itemsByMatch.get(m.id) ?? [];
    const realKm = items.reduce((a, it) => a + it.distance_km, 0);
    const refKm = realKm * 1.9;
    kmOptimized += refKm - realKm;
    logisticSavings += (refKm - realKm) * params.costPerKm;
  }
  const avgScore = confirmed.length ? confirmed.reduce((a, m) => a + m.score, 0) / confirmed.length : 0;
  const multiSupplierMatches = confirmed.filter((m) => (itemsByMatch.get(m.id)?.length ?? 0) > 1).length;

  return {
    label: 'Simulación del MVP — datos ficticios',
    litersOptimized,
    producersBenefited,
    kmOptimized: Math.round(kmOptimized),
    logisticSavings: Math.round(logisticSavings),
    totalSavings: Math.round(confirmed.reduce((a, m) => a + m.estimated_savings, 0)),
    operationsConnected: s.operations.length,
    avgScore: Math.round(avgScore * 10) / 10,
    multiSupplierMatches,
    chain: [
      { stage: 'DIÉSEL', description: 'Oferta verificada visible y comparable' },
      { stage: 'PRODUCCIÓN', description: 'Menos paradas por falta de combustible en campo' },
      { stage: 'TRANSPORTE', description: 'Rutas más cortas y cisternas mejor aprovechadas' },
      { stage: 'DISTRIBUCIÓN', description: 'Trazabilidad de cada litro entregado' },
      { stage: 'ALIMENTOS', description: 'Menor costo logístico trasladado al precio' },
      { stage: 'CANASTA FAMILIAR', description: 'Cadena alimentaria más eficiente' },
    ],
  };
}
