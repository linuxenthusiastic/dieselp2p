import { params } from '../config.js';
import { round2 } from '../utils/geo.js';

/**
 * Motor de costos del MVP.
 * Todos los valores son estimaciones ficticias y parametrizables (ver config.ts).
 */

/** Costo logístico estimado de un viaje: costo fijo + distancia * costo por km. */
export function transportCost(distanceKm: number): number {
  return Math.round(params.baseTripCost + distanceKm * params.costPerKm);
}

export interface CostSummary {
  fuelCost: number;
  transportCost: number;
  totalCost: number;
  referenceCost: number;
  savings: number;
  savingsPercent: number;
}

/**
 * Escenario de referencia (no optimizado): el productor compra al precio de
 * referencia de mercado y contrata transporte hacia un proveedor "promedio"
 * sin información de cercanía. Sirve para estimar el ahorro de DieselP2P.
 */
export function referenceCost(liters: number, referenceDistanceKm: number): number {
  const trips = Math.max(1, Math.ceil(liters / params.truckCapacityLiters));
  return round2(liters * params.referencePricePerLiter + (params.baseTripCost + referenceDistanceKm * params.costPerKm) * trips);
}

export function summarizeCosts(fuelCost: number, transport: number, liters: number, referenceDistanceKm: number): CostSummary {
  const total = round2(fuelCost + transport);
  const reference = referenceCost(liters, referenceDistanceKm);
  const savings = round2(Math.max(0, reference - total));
  return {
    fuelCost: round2(fuelCost),
    transportCost: round2(transport),
    totalCost: total,
    referenceCost: reference,
    savings,
    savingsPercent: reference > 0 ? Math.round((savings / reference) * 1000) / 10 : 0,
  };
}
