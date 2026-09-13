import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/auth.js';
import { store } from '../data/store.js';
import { views } from '../services/queryService.js';
import { parseBody } from '../utils/validate.js';
import { notFound } from '../utils/errors.js';

export const usersRouter = Router();

/** Admin: listado de usuarios con su perfil de rol. */
usersRouter.get('/users', requireRole('admin'), async (_req, res, next) => {
  try {
    const v = await views();
    const list = v.s.profiles.map((p) => {
      const producer = v.s.producers.find((x) => x.profile_id === p.id);
      const supplier = v.s.suppliers.find((x) => x.profile_id === p.id);
      const carrier = v.s.carriers.find((x) => x.profile_id === p.id);
      const organization = producer?.organization_name ?? supplier?.business_name ?? carrier?.company_name ?? 'DieselP2P';
      const location = producer?.location_name ?? supplier?.location_name ?? carrier?.coverage_area ?? '—';
      const detail = producer
        ? producer.activity_type
        : supplier
          ? `Verificación: ${supplier.verification_status} · ${supplier.capacity_liters.toLocaleString('es-BO')} L`
          : carrier
            ? `${carrier.vehicle_type} · ${carrier.coverage_area}`
            : 'Administración';
      const anomalies = v.s.anomalies.filter((a) => a.profile_id === p.id && a.status === 'OPEN').length;
      return { ...p, organization, location, detail, openAnomalies: anomalies };
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

const patchSchema = z.object({ status: z.enum(['active', 'suspended']).optional(), verification_status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional() });

usersRouter.patch('/users/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const body = parseBody(patchSchema, req.body);
    const p = await store.get('profiles', String(req.params.id));
    if (!p) throw notFound('Usuario');
    const updated = body.status ? await store.update('profiles', p.id, { status: body.status }) : p;
    if (body.verification_status) {
      const sup = (await store.list('supplier_profiles', { profile_id: p.id }))[0];
      if (sup) await store.update('supplier_profiles', sup.id, { verification_status: body.verification_status });
    }
    res.json(updated);
  } catch (e) {
    next(e);
  }
});
