import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { store } from '../data/store.js';
import { views } from '../services/queryService.js';
import { parseBody } from '../utils/validate.js';
import { badRequest, forbidden, notFound } from '../utils/errors.js';
import { newId, nowIso } from '../utils/ids.js';
import type { Offer } from '../types/domain.js';

export const offersRouter = Router();

const createSchema = z.object({
  available_liters: z.number().int().min(100).max(1_000_000),
  price_per_liter: z.number().positive().max(50),
  available_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  location_name: z.string().min(2).max(120),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

offersRouter.get('/offers', requireAuth, async (req, res, next) => {
  try {
    const a = req.auth!;
    const v = await views();
    let list = v.s.offers;
    if (a.profile.role === 'supplier') list = list.filter((o) => o.supplier_id === a.supplier?.id);
    else if (req.query.active === 'true') list = list.filter((o) => ['ACTIVE', 'PARTIALLY_ALLOCATED'].includes(o.status));
    res.json(list.map((o) => v.offer(o)).sort((x, y) => y.created_at.localeCompare(x.created_at)));
  } catch (e) {
    next(e);
  }
});

offersRouter.post('/offers', requireRole('supplier', 'admin'), async (req, res, next) => {
  try {
    const body = parseBody(createSchema, req.body);
    const a = req.auth!;
    const supplierId = a.supplier?.id ?? (req.body.supplier_id as string | undefined);
    if (!supplierId) throw badRequest('Se requiere un perfil de proveedor');
    const supplier = await store.get('supplier_profiles', supplierId);
    if (!supplier) throw notFound('Proveedor');
    if (supplier.verification_status !== 'VERIFIED') throw forbidden('El proveedor debe estar verificado para publicar ofertas');
    const offer: Offer = {
      id: newId(),
      supplier_id: supplierId,
      available_liters: body.available_liters,
      remaining_liters: body.available_liters,
      price_per_liter: body.price_per_liter,
      available_date: body.available_date,
      location_name: body.location_name,
      latitude: body.latitude,
      longitude: body.longitude,
      status: 'ACTIVE',
      created_at: nowIso(),
    };
    await store.insert('offers', offer);
    const v = await views();
    res.status(201).json(v.offer(offer));
  } catch (e) {
    next(e);
  }
});

offersRouter.get('/offers/:id', requireAuth, async (req, res, next) => {
  try {
    const o = await store.get('offers', String(req.params.id));
    if (!o) throw notFound('Oferta');
    const v = await views();
    const items = v.s.matchItems.filter((it) => it.offer_id === o.id);
    const matches = v.s.matches.filter((m) => items.some((it) => it.match_id === m.id) && m.status === 'CONFIRMED').map((m) => v.match(m));
    res.json({ ...v.offer(o), matches });
  } catch (e) {
    next(e);
  }
});

const patchSchema = z.object({
  status: z.enum(['ACTIVE', 'PARTIALLY_ALLOCATED', 'FULLY_ALLOCATED', 'EXPIRED', 'CANCELLED']).optional(),
  price_per_liter: z.number().positive().max(50).optional(),
  available_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

offersRouter.patch('/offers/:id', requireRole('supplier', 'admin'), async (req, res, next) => {
  try {
    const body = parseBody(patchSchema, req.body);
    const o = await store.get('offers', String(req.params.id));
    if (!o) throw notFound('Oferta');
    const a = req.auth!;
    if (a.profile.role === 'supplier') {
      if (o.supplier_id !== a.supplier?.id) throw forbidden();
      if (body.status && !['CANCELLED', 'ACTIVE'].includes(body.status)) throw forbidden('Estado no permitido para el proveedor');
    }
    const updated = await store.update('offers', o.id, body);
    const v = await views();
    res.json(v.offer(updated));
  } catch (e) {
    next(e);
  }
});
