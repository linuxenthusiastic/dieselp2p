import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { store } from '../data/store.js';
import { views } from '../services/queryService.js';
import { evaluateNewDemand, materialize } from '../services/anomalyEngine.js';
import { parseBody } from '../utils/validate.js';
import { badRequest, forbidden, notFound } from '../utils/errors.js';
import { newId, nowIso } from '../utils/ids.js';
import { roadDistanceKm } from '../utils/geo.js';
import { params } from '../config.js';
import type { Demand } from '../types/domain.js';

export const demandsRouter = Router();

const activity = z.enum(['Agricultura', 'Ganadería', 'Transporte', 'Procesamiento', 'Distribución', 'Cosecha', 'Otro']);

const createSchema = z.object({
  requested_liters: z.number().int().min(100).max(500_000),
  target_price: z.number().positive().max(50).nullable().optional(),
  required_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  location_name: z.string().min(2).max(120),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  activity_type: activity,
});

/**
 * GET /api/demands
 *  - productor: sus demandas
 *  - proveedor: ?compatible=true → demandas abiertas dentro del radio
 *  - admin/transportista: todas
 */
demandsRouter.get('/demands', requireAuth, async (req, res, next) => {
  try {
    const a = req.auth!;
    const v = await views();
    let list = v.s.demands;
    if (a.profile.role === 'producer') list = list.filter((d) => d.producer_id === a.producer?.id);
    let result = list.map((d) => v.demand(d)) as Array<ReturnType<typeof v.demand> & { distance_km?: number }>;
    if (a.profile.role === 'supplier' && a.supplier) {
      const sup = a.supplier;
      result = result
        .filter((d) => ['OPEN', 'PARTIALLY_MATCHED'].includes(d.status) && d.remaining_liters > 0)
        .map((d) => ({ ...d, distance_km: roadDistanceKm(sup.latitude, sup.longitude, d.latitude, d.longitude) }))
        .filter((d) => d.distance_km! <= params.maxRadiusKm)
        .sort((x, y) => x.distance_km! - y.distance_km!);
    } else {
      result.sort((x, y) => y.created_at.localeCompare(x.created_at));
    }
    res.json(result);
  } catch (e) {
    next(e);
  }
});

demandsRouter.post('/demands', requireRole('producer', 'admin'), async (req, res, next) => {
  try {
    const body = parseBody(createSchema, req.body);
    const a = req.auth!;
    const producerId = a.producer?.id ?? (req.body.producer_id as string | undefined);
    if (!producerId) throw badRequest('Se requiere un perfil de productor');
    const producer = await store.get('producer_profiles', producerId);
    if (!producer) throw notFound('Productor');
    const demand: Demand = {
      id: newId(),
      producer_id: producerId,
      requested_liters: body.requested_liters,
      remaining_liters: body.requested_liters,
      target_price: body.target_price ?? null,
      required_date: body.required_date,
      location_name: body.location_name,
      latitude: body.latitude,
      longitude: body.longitude,
      activity_type: body.activity_type,
      status: 'OPEN',
      created_at: nowIso(),
    };
    await store.insert('demands', demand);

    // Detección de anomalías sobre datos simulados
    const history = await store.list('demands', { producer_id: producerId });
    const profile = await store.get('profiles', producer.profile_id);
    const drafts = profile ? evaluateNewDemand(demand, history, producer, profile) : [];
    const anomalies = [];
    for (const d of drafts) anomalies.push(await store.insert('anomaly_events', materialize(d)));

    const v = await views();
    res.status(201).json({ demand: v.demand(demand), anomalies });
  } catch (e) {
    next(e);
  }
});

demandsRouter.get('/demands/:id', requireAuth, async (req, res, next) => {
  try {
    const d = await store.get('demands', String(req.params.id));
    if (!d) throw notFound('Demanda');
    const a = req.auth!;
    if (a.profile.role === 'producer' && d.producer_id !== a.producer?.id) throw forbidden();
    const v = await views();
    const matches = v.s.matches.filter((m) => m.demand_id === d.id && m.status !== 'CANCELLED').map((m) => v.match(m));
    res.json({ ...v.demand(d), matches });
  } catch (e) {
    next(e);
  }
});

const patchSchema = z.object({
  status: z.enum(['OPEN', 'PARTIALLY_MATCHED', 'MATCHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  target_price: z.number().positive().max(50).nullable().optional(),
  required_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

demandsRouter.patch('/demands/:id', requireRole('producer', 'admin'), async (req, res, next) => {
  try {
    const body = parseBody(patchSchema, req.body);
    const d = await store.get('demands', String(req.params.id));
    if (!d) throw notFound('Demanda');
    const a = req.auth!;
    if (a.profile.role === 'producer') {
      if (d.producer_id !== a.producer?.id) throw forbidden();
      if (body.status && body.status !== 'CANCELLED') throw forbidden('El productor solo puede cancelar');
    }
    const updated = await store.update('demands', d.id, body);
    const v = await views();
    res.json(v.demand(updated));
  } catch (e) {
    next(e);
  }
});
