import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { views } from '../services/queryService.js';

export const mapRouter = Router();

/**
 * GET /api/map — puntos y conexiones para el mapa central.
 * 🟢 ofertas · 🔴 demandas · 🟡 matches (líneas proveedor → productor) · 🔵 transportistas
 */
mapRouter.get('/map', requireAuth, async (req, res, next) => {
  try {
    const a = req.auth!;
    const v = await views();
    const offers = v.s.offers
      .filter((o) => ['ACTIVE', 'PARTIALLY_ALLOCATED'].includes(o.status))
      .map((o) => v.offer(o));
    const demands = v.s.demands
      .filter((d) => !['COMPLETED', 'CANCELLED'].includes(d.status))
      .map((d) => v.demand(d));
    const carriers = v.s.carriers.map((c) => v.carrierSummary(c.id)!);
    let matches = v.s.matches.filter((m) => m.status !== 'CANCELLED').map((m) => v.match(m));
    if (a.profile.role === 'producer') matches = matches.filter((m) => m.demand?.producer_id === a.producer?.id);
    if (a.profile.role === 'supplier') matches = matches.filter((m) => m.items.some((it) => it.supplier?.id === a.supplier?.id));
    if (a.profile.role === 'carrier') {
      const mine = new Set(v.s.transportOrders.filter((t) => t.carrier_id === a.carrier?.id).map((t) => t.match_id));
      matches = matches.filter((m) => mine.has(m.id));
    }
    // Solo conexiones recientes/activas para no saturar el mapa
    const connections = matches
      .filter((m) => m.status === 'PROPOSED' || (m.operation && !['DELIVERED', 'CANCELLED'].includes(m.operation.status)))
      .map((m) => ({
        match_id: m.id,
        status: m.status,
        operation_code: m.operation?.operation_code ?? null,
        total_liters: m.total_liters,
        score: m.score,
        destination: m.demand
          ? { name: m.demand.producer?.organization_name ?? m.demand.location_name, latitude: m.demand.latitude, longitude: m.demand.longitude }
          : null,
        origins: m.items.map((it) => ({
          name: it.supplier?.business_name ?? 'Proveedor',
          liters: it.allocated_liters,
          latitude: it.offer?.latitude ?? 0,
          longitude: it.offer?.longitude ?? 0,
          distance_km: it.distance_km,
        })),
      }))
      .filter((c) => c.destination);
    res.json({ offers, demands, carriers, connections });
  } catch (e) {
    next(e);
  }
});
