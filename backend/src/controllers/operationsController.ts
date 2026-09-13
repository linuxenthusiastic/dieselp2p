import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { describeNextStep, simulateNextStep } from '../services/operationsService.js';
import { store } from '../data/store.js';
import { views } from '../services/queryService.js';
import { parseBody } from '../utils/validate.js';
import { forbidden, notFound } from '../utils/errors.js';
import { nowIso } from '../utils/ids.js';

export const operationsRouter = Router();

operationsRouter.get('/operations', requireAuth, async (req, res, next) => {
  try {
    const a = req.auth!;
    const v = await views();
    let list = v.s.operations.map((o) => v.operation(o));
    if (a.profile.role === 'producer') list = list.filter((o) => o.producer_id === a.producer?.id);
    else if (a.profile.role === 'supplier') list = list.filter((o) => o.match?.items.some((it) => it.supplier?.id === a.supplier?.id));
    else if (a.profile.role === 'carrier') list = list.filter((o) => o.carrier?.id === a.carrier?.id);
    res.json(list.sort((x, y) => y.created_at.localeCompare(x.created_at)));
  } catch (e) {
    next(e);
  }
});

/** Verificación pública por token QR (trazabilidad sin datos sensibles). */
operationsRouter.get('/operations/verify/:token', async (req, res, next) => {
  try {
    const ops = await store.list('operations', { qr_token: String(req.params.token) });
    const op = ops[0];
    if (!op) throw notFound('Operación');
    const v = await views();
    const view = v.operation(op);
    res.json({
      operation_code: view.operation_code,
      status: view.status,
      verification_status: view.verification_status,
      total_liters: view.match?.total_liters ?? 0,
      producer: view.producer?.organization_name ?? null,
      suppliers: view.match?.items.map((it) => ({ name: it.supplier?.business_name ?? 'Proveedor', liters: it.allocated_liters })) ?? [],
      carrier: view.carrier?.company_name ?? null,
      created_at: view.created_at,
      updated_at: view.updated_at,
      disclaimer: 'MVP DEMO — DATOS SIMULADOS',
    });
  } catch (e) {
    next(e);
  }
});

operationsRouter.get('/operations/:id', requireAuth, async (req, res, next) => {
  try {
    const op = await store.get('operations', String(req.params.id));
    if (!op) throw notFound('Operación');
    const v = await views();
    const view = v.operation(op);
    const a = req.auth!;
    if (a.profile.role === 'producer' && view.producer_id !== a.producer?.id) throw forbidden();
    if (a.profile.role === 'carrier' && view.carrier?.id !== a.carrier?.id) throw forbidden();
    if (a.profile.role === 'supplier' && !view.match?.items.some((it) => it.supplier?.id === a.supplier?.id)) throw forbidden();
    res.json({ ...view, next_step: describeNextStep(view.status, Boolean(view.carrier)) });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/operations/:id/simulate-next
 * Avanza la operación al siguiente estado del flujo. Solo para la demostración:
 * evita tener que cambiar de usuario para recorrer el ciclo completo.
 */
operationsRouter.post('/operations/:id/simulate-next', requireRole('producer', 'carrier', 'admin'), async (req, res, next) => {
  try {
    res.json(await simulateNextStep(String(req.params.id), req.auth!));
  } catch (e) {
    next(e);
  }
});

const patchSchema = z.object({
  status: z.enum(['CREATED', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']).optional(),
  verification_status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
});

/** Admin: cambia estado de operaciones de demostración. */
operationsRouter.patch('/operations/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const body = parseBody(patchSchema, req.body);
    const op = await store.get('operations', String(req.params.id));
    if (!op) throw notFound('Operación');
    const updated = await store.update('operations', op.id, { ...body, updated_at: nowIso() });
    if (body.status) {
      const transportStatus = body.status === 'DELIVERED' ? 'DELIVERED' : body.status === 'IN_TRANSIT' ? 'IN_TRANSIT' : body.status === 'ASSIGNED' ? 'ASSIGNED' : null;
      if (transportStatus) {
        for (const t of await store.list('transport_orders', { match_id: op.match_id })) {
          if (t.carrier_id) await store.update('transport_orders', t.id, { status: transportStatus, updated_at: nowIso() });
        }
      }
      const match = await store.get('matches', op.match_id);
      if (match) {
        const demandStatus = body.status === 'DELIVERED' ? 'COMPLETED' : body.status === 'CANCELLED' ? 'CANCELLED' : body.status === 'CREATED' ? 'MATCHED' : 'IN_PROGRESS';
        await store.update('demands', match.demand_id, { status: demandStatus });
      }
    }
    const v = await views();
    res.json(v.operation(updated));
  } catch (e) {
    next(e);
  }
});
