/**
 * Motor de detección de anomalías (patrones ficticios de riesgo).
 * Solo analiza datos simulados de la plataforma; no interactúa con sistemas externos.
 */
import type { AnomalyEvent, Demand, Match, Operation, ProducerProfile, Profile } from '../types/domain.js';
import { haversineKm } from '../utils/geo.js';
import { newId, nowIso } from '../utils/ids.js';

export type AnomalyDraft = Omit<AnomalyEvent, 'id' | 'created_at' | 'status'>;

const HOUR = 3_600_000;

/**
 * Evalúa una nueva demanda contra el historial del productor.
 * Devuelve borradores de eventos (sin persistir).
 */
export function evaluateNewDemand(demand: Demand, history: Demand[], producer: ProducerProfile, profile: Profile): AnomalyDraft[] {
  const drafts: AnomalyDraft[] = [];
  const previous = history.filter((d) => d.id !== demand.id && d.status !== 'CANCELLED');

  // Volumen inusual: > 3x el promedio histórico (con al menos 2 solicitudes previas) y >= 5.000 L
  if (previous.length >= 2) {
    const avg = previous.reduce((s, d) => s + d.requested_liters, 0) / previous.length;
    const ratio = demand.requested_liters / avg;
    if (ratio >= 3 && demand.requested_liters >= 5000) {
      const risk = Math.round(Math.min(95, 55 + ratio * 2.2));
      drafts.push({
        profile_id: profile.id,
        operation_id: null,
        type: 'UNUSUAL_VOLUME',
        risk_score: risk,
        description: `Solicitud de ${demand.requested_liters.toLocaleString('es-BO')} L frente a un promedio histórico de ${Math.round(avg).toLocaleString('es-BO')} L (${ratio.toFixed(1)}x) para ${producer.organization_name}.`,
      });
    }
  }

  // Solicitudes frecuentes: >= 3 solicitudes en 6 horas
  const cutoff = new Date(demand.created_at).getTime() - 6 * HOUR;
  const recent = previous.filter((d) => new Date(d.created_at).getTime() >= cutoff);
  if (recent.length >= 2) {
    const count = recent.length + 1;
    drafts.push({
      profile_id: profile.id,
      operation_id: null,
      type: 'FREQUENT_REQUESTS',
      risk_score: Math.round(Math.min(90, 50 + count * 8)),
      description: `${count} solicitudes publicadas en menos de 6 horas por ${producer.organization_name}.`,
    });
  }

  // Múltiples ubicaciones: demandas en 3+ puntos separados > 100 km en 7 días
  const weekCutoff = new Date(demand.created_at).getTime() - 7 * 24 * HOUR;
  const weekDemands = [...previous.filter((d) => new Date(d.created_at).getTime() >= weekCutoff), demand];
  const farPoints: Demand[] = [];
  for (const d of weekDemands) {
    if (farPoints.every((p) => haversineKm(p.latitude, p.longitude, d.latitude, d.longitude) > 100)) farPoints.push(d);
  }
  if (farPoints.length >= 3) {
    drafts.push({
      profile_id: profile.id,
      operation_id: null,
      type: 'MULTIPLE_LOCATIONS',
      risk_score: 65,
      description: `Demandas registradas en ${farPoints.length} ubicaciones separadas por más de 100 km en 7 días.`,
    });
  }

  return drafts;
}

/**
 * Patrón de reventa rápida (simulado): 3+ operaciones en 72 h cuyo volumen
 * acumulado excede 2x el patrón histórico del productor.
 */
export function evaluateResalePattern(
  producer: ProducerProfile,
  profile: Profile,
  operations: Operation[],
  matches: Match[],
  demands: Demand[],
): AnomalyDraft | null {
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const demandById = new Map(demands.map((d) => [d.id, d]));
  const ops = operations
    .filter((o) => o.producer_id === producer.id && o.status !== 'CANCELLED')
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (ops.length < 3) return null;
  const own = demands.filter((d) => d.producer_id === producer.id);
  const avg = own.reduce((s, d) => s + d.requested_liters, 0) / Math.max(1, own.length);
  const litersOf = (o: Operation) => demandById.get(matchById.get(o.match_id)?.demand_id ?? '')?.requested_liters ?? 0;
  for (let i = 0; i + 2 < ops.length; i++) {
    const window = ops.slice(i, i + 3);
    const span = new Date(window[2].created_at).getTime() - new Date(window[0].created_at).getTime();
    if (span > 72 * HOUR) continue;
    const litersInWindow = window.reduce((s, o) => s + litersOf(o), 0);
    if (litersInWindow > 2 * avg * 3) {
      return {
        profile_id: profile.id,
        operation_id: window[2].id,
        type: 'RAPID_RESALE_PATTERN',
        risk_score: 87,
        description: `Secuencia simulada de 3 operaciones en 72 h con volumen acumulado ${litersInWindow.toLocaleString('es-BO')} L (>2x el patrón histórico) para ${producer.organization_name}.`,
      };
    }
  }
  return null;
}

export function materialize(draft: AnomalyDraft): AnomalyEvent {
  return { id: newId(), created_at: nowIso(), status: 'OPEN', ...draft };
}
