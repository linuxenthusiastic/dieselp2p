import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { store } from '../data/store.js';
import { ZONES } from '../data/seedData.js';
import { parseBody } from '../utils/validate.js';
import { ensureRoleProfile } from '../services/profileService.js';

export const profileRouter = Router();

profileRouter.get('/profile', requireAuth, (req, res) => {
  const a = req.auth!;
  res.json({ profile: a.profile, producer: a.producer ?? null, supplier: a.supplier ?? null, carrier: a.carrier ?? null, isDemo: a.isDemo });
});

const updateSchema = z.object({
  full_name: z.string().min(2).max(120).optional(),
  phone: z.string().max(30).nullable().optional(),
  organization_name: z.string().min(2).max(160).optional(),
  activity_type: z.enum(['Agricultura', 'Ganadería', 'Transporte', 'Procesamiento', 'Distribución', 'Cosecha', 'Otro']).optional(),
  location_name: z.string().max(120).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  capacity_liters: z.number().int().positive().max(1_000_000).optional(),
  vehicle_type: z.string().max(80).optional(),
  coverage_area: z.string().max(160).optional(),
});

profileRouter.patch('/profile', requireAuth, async (req, res, next) => {
  try {
    const body = parseBody(updateSchema, req.body);
    const a = req.auth!;
    const profile = await store.update('profiles', a.profile.id, {
      ...(body.full_name ? { full_name: body.full_name } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
    });
    await ensureRoleProfile(profile);
    const zone = body.location_name && ZONES[body.location_name] ? ZONES[body.location_name] : null;
    const loc = {
      ...(body.location_name ? { location_name: body.location_name } : {}),
      ...(body.latitude !== undefined ? { latitude: body.latitude } : zone ? { latitude: zone.lat } : {}),
      ...(body.longitude !== undefined ? { longitude: body.longitude } : zone ? { longitude: zone.lng } : {}),
    };
    if (a.producer) {
      await store.update('producer_profiles', a.producer.id, {
        ...loc,
        ...(body.organization_name ? { organization_name: body.organization_name } : {}),
        ...(body.activity_type ? { activity_type: body.activity_type } : {}),
      });
    }
    if (a.supplier) {
      await store.update('supplier_profiles', a.supplier.id, {
        ...loc,
        ...(body.organization_name ? { business_name: body.organization_name } : {}),
        ...(body.capacity_liters ? { capacity_liters: body.capacity_liters } : {}),
      });
    }
    if (a.carrier) {
      await store.update('carrier_profiles', a.carrier.id, {
        ...loc,
        ...(body.organization_name ? { company_name: body.organization_name } : {}),
        ...(body.capacity_liters ? { capacity_liters: body.capacity_liters } : {}),
        ...(body.vehicle_type ? { vehicle_type: body.vehicle_type } : {}),
        ...(body.coverage_area ? { coverage_area: body.coverage_area } : {}),
      });
    }
    const [producer, supplier, carrier] = await Promise.all([
      store.list('producer_profiles', { profile_id: profile.id }),
      store.list('supplier_profiles', { profile_id: profile.id }),
      store.list('carrier_profiles', { profile_id: profile.id }),
    ]);
    res.json({ profile, producer: producer[0] ?? null, supplier: supplier[0] ?? null, carrier: carrier[0] ?? null, isDemo: a.isDemo });
  } catch (e) {
    next(e);
  }
});
