import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/auth.js';
import { store } from '../data/store.js';
import { views } from '../services/queryService.js';
import { evaluateResalePattern, materialize } from '../services/anomalyEngine.js';
import { parseBody } from '../utils/validate.js';
import { notFound } from '../utils/errors.js';

export const anomaliesRouter = Router();

anomaliesRouter.get('/anomalies', requireRole('admin'), async (_req, res, next) => {
  try {
    const v = await views();
    res.json(v.s.anomalies.map((a) => v.anomaly(a)).sort((x, y) => y.risk_score - x.risk_score));
  } catch (e) {
    next(e);
  }
});

const patchSchema = z.object({ status: z.enum(['OPEN', 'REVIEWED', 'DISMISSED']) });

anomaliesRouter.patch('/anomalies/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { status } = parseBody(patchSchema, req.body);
    const a = await store.get('anomaly_events', String(req.params.id));
    if (!a) throw notFound('Anomalía');
    const updated = await store.update('anomaly_events', a.id, { status });
    const v = await views();
    res.json(v.anomaly(updated));
  } catch (e) {
    next(e);
  }
});

/** Ejecuta el motor de patrones de reventa sobre todos los productores (datos simulados). */
anomaliesRouter.post('/anomalies/scan', requireRole('admin'), async (_req, res, next) => {
  try {
    const v = await views();
    const created = [];
    for (const producer of v.s.producers) {
      const profile = v.s.profiles.find((p) => p.id === producer.profile_id);
      if (!profile) continue;
      const draft = evaluateResalePattern(producer, profile, v.s.operations, v.s.matches, v.s.demands);
      if (!draft) continue;
      const exists = v.s.anomalies.some((a) => a.profile_id === profile.id && a.type === draft.type && a.status === 'OPEN');
      if (exists) continue;
      created.push(await store.insert('anomaly_events', materialize(draft)));
    }
    res.json({ created: created.length, events: created });
  } catch (e) {
    next(e);
  }
});
