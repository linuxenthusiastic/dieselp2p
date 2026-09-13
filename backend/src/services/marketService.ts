/**
 * Inteligencia de mercado para proveedores.
 *
 * Responde a una pregunta concreta: "¿a qué precio tengo que ofertar para
 * llevarme esta demanda?". Para cada demanda abierta calcula la mejor
 * combinación posible SIN el proveedor que consulta, y deduce el precio máximo
 * al que tendría que ofertar para desplazarla.
 *
 * Solo expone agregados y precios de ofertas, que ya son públicos dentro de la
 * plataforma. No revela qué proveedor concreto está detrás de cada precio.
 */
import { store } from '../data/store.js';
import { params } from '../config.js';
import { roadDistanceKm, round2 } from '../utils/geo.js';
import { transportCost } from './costEngine.js';
import { findBestMatch } from './matchingEngine.js';
import type { Demand, Offer, SupplierProfile } from '../types/domain.js';

export interface Oportunidad {
  demand_id: string;
  location_name: string;
  activity_type: string;
  required_date: string;
  liters: number;
  distance_km: number;
  /** Costo efectivo por litro de la mejor combinación actual sin este proveedor. */
  precio_a_batir: number | null;
  /** Precio máximo al que debería ofertar para ser más competitivo. */
  precio_sugerido: number | null;
  /** Logística por litro que le supone atender esta demanda. */
  logistica_por_litro: number;
  /** Litros que podría cubrir con su capacidad disponible. */
  cobertura_posible: number;
  /** Ya tiene una oferta activa que entra en la mejor combinación. */
  ya_compite: boolean;
}

export interface MarketSnapshot {
  referencia: {
    precio_referencia: number;
    precio_promedio_mercado: number | null;
    precio_minimo: number | null;
    precio_maximo: number | null;
    ofertas_activas: number;
    litros_disponibles: number;
  };
  demanda: {
    abiertas: number;
    litros_solicitados: number;
    por_zona: Array<{ zone: string; litros: number; demandas: number }>;
  };
  mi_posicion: {
    precio_promedio: number | null;
    litros_activos: number;
    /** Porcentaje de ofertas activas del mercado más baratas que la suya. */
    percentil_precio: number | null;
  } | null;
  precios_por_zona: Array<{ zone: string; promedio: number; minimo: number; maximo: number; ofertas: number }>;
  oportunidades: Oportunidad[];
}

const zona = (nombre: string) => nombre.split('·').pop()!.trim();
const activas = (o: Offer) => ['ACTIVE', 'PARTIALLY_ALLOCATED'].includes(o.status) && o.remaining_liters > 0;
const abiertas = (d: Demand) => ['OPEN', 'PARTIALLY_MATCHED'].includes(d.status) && d.remaining_liters > 0;

export async function getMarketSnapshot(supplier?: SupplierProfile): Promise<MarketSnapshot> {
  const [offers, demands, suppliers] = await Promise.all([
    store.list('offers'),
    store.list('demands'),
    store.list('supplier_profiles'),
  ]);

  const ofertasActivas = offers.filter(activas);
  const demandasAbiertas = demands.filter(abiertas);
  const precios = ofertasActivas.map((o) => o.price_per_liter).sort((a, b) => a - b);
  const promedio = (xs: number[]) => (xs.length ? round2(xs.reduce((s, x) => s + x, 0) / xs.length) : null);

  // Demanda agregada por zona
  const zonasDemanda = new Map<string, { litros: number; demandas: number }>();
  for (const d of demandasAbiertas) {
    const z = zona(d.location_name);
    const cur = zonasDemanda.get(z) ?? { litros: 0, demandas: 0 };
    cur.litros += d.remaining_liters;
    cur.demandas += 1;
    zonasDemanda.set(z, cur);
  }

  // Precios por zona
  const zonasPrecio = new Map<string, number[]>();
  for (const o of ofertasActivas) {
    const z = zona(o.location_name);
    zonasPrecio.set(z, [...(zonasPrecio.get(z) ?? []), o.price_per_liter]);
  }

  // Posición del proveedor que consulta
  let miPosicion: MarketSnapshot['mi_posicion'] = null;
  if (supplier) {
    const mias = ofertasActivas.filter((o) => o.supplier_id === supplier.id);
    const miPrecio = promedio(mias.map((o) => o.price_per_liter));
    miPosicion = {
      precio_promedio: miPrecio,
      litros_activos: mias.reduce((s, o) => s + o.remaining_liters, 0),
      percentil_precio:
        miPrecio !== null && precios.length > 0
          ? Math.round((precios.filter((p) => p < miPrecio).length / precios.length) * 100)
          : null,
    };
  }

  // Oportunidades: qué precio hace falta para entrar en cada demanda abierta
  const oportunidades: Oportunidad[] = [];
  if (supplier) {
    const ajenas = offers.filter((o) => o.supplier_id !== supplier.id);
    const misActivas = ofertasActivas.filter((o) => o.supplier_id === supplier.id);
    const miCapacidad = misActivas.reduce((s, o) => s + o.remaining_liters, 0);

    for (const d of demandasAbiertas) {
      const distancia = roadDistanceKm(supplier.latitude, supplier.longitude, d.latitude, d.longitude);
      if (distancia > params.maxRadiusKm) continue;

      const cobertura = Math.min(d.remaining_liters, Math.max(miCapacidad, supplier.capacity_liters));
      const logisticaPorLitro = round2(transportCost(distancia) / Math.max(1, cobertura));

      // Mejor combinación posible sin este proveedor: es el listón a superar.
      const sinMi = findBestMatch(d, ajenas, suppliers);
      const precioABatir = sinMi.best ? round2(sinMi.best.costs.totalCost / sinMi.best.totalLiters) : null;
      const sugerido = precioABatir !== null ? round2(precioABatir - logisticaPorLitro - 0.05) : null;

      const conMigo = findBestMatch(d, offers, suppliers);
      const yaCompite = Boolean(conMigo.best?.items.some((it) => it.supplier.id === supplier.id));

      oportunidades.push({
        demand_id: d.id,
        location_name: d.location_name,
        activity_type: d.activity_type,
        required_date: d.required_date,
        liters: d.remaining_liters,
        distance_km: distancia,
        precio_a_batir: precioABatir,
        precio_sugerido: sugerido !== null && sugerido > 0 ? sugerido : null,
        logistica_por_litro: logisticaPorLitro,
        cobertura_posible: cobertura,
        ya_compite: yaCompite,
      });
    }
    // Primero lo más cercano y de mayor volumen
    oportunidades.sort((a, b) => a.distance_km - b.distance_km || b.liters - a.liters);
  }

  return {
    referencia: {
      precio_referencia: params.referencePricePerLiter,
      precio_promedio_mercado: promedio(precios),
      precio_minimo: precios[0] ?? null,
      precio_maximo: precios[precios.length - 1] ?? null,
      ofertas_activas: ofertasActivas.length,
      litros_disponibles: ofertasActivas.reduce((s, o) => s + o.remaining_liters, 0),
    },
    demanda: {
      abiertas: demandasAbiertas.length,
      litros_solicitados: demandasAbiertas.reduce((s, d) => s + d.remaining_liters, 0),
      por_zona: [...zonasDemanda.entries()]
        .map(([zone, v]) => ({ zone, ...v }))
        .sort((a, b) => b.litros - a.litros)
        .slice(0, 8),
    },
    mi_posicion: miPosicion,
    precios_por_zona: [...zonasPrecio.entries()]
      .map(([zone, ps]) => ({
        zone,
        promedio: promedio(ps)!,
        minimo: Math.min(...ps),
        maximo: Math.max(...ps),
        ofertas: ps.length,
      }))
      .sort((a, b) => a.promedio - b.promedio),
    oportunidades,
  };
}
