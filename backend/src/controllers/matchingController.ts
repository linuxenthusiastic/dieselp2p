import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { store } from '../data/store.js';
import { views } from '../services/queryService.js';
import { confirmMatch, runMatchingForDemand } from '../services/operationsService.js';
import { parseBody } from '../utils/validate.js';
import { forbidden, notFound } from '../utils/errors.js';

export const matchingRouter = Router();

const findSchema = z.object({ demand_id: z.string().min(1) });

/** POST /api/matching/find — ejecuta el motor de matching para una demanda. */
matchingRouter.post('/matching/find', requireRole('producer', 'admin', 'supplier'), async (req, res, next) => {
  try {
    const { demand_id } = parseBody(findSchema, req.body);
    res.json(await runMatchingForDemand(demand_id, req.auth!));
  } catch (e) {
    next(e);
  }
});

matchingRouter.get('/matches', requireAuth, async (req, res, next) => {
  try {
    const a = req.auth!;
    const v = await views();
    let list = v.s.matches.filter((m) => m.status !== 'CANCELLED');
    if (a.profile.role === 'producer') {
      const mine = new Set(v.s.demands.filter((d) => d.producer_id === a.producer?.id).map((d) => d.id));
      list = list.filter((m) => mine.has(m.demand_id));
    } else if (a.profile.role === 'supplier') {
      const myOffers = new Set(v.s.offers.filter((o) => o.supplier_id === a.supplier?.id).map((o) => o.id));
      const myMatches = new Set(v.s.matchItems.filter((it) => myOffers.has(it.offer_id)).map((it) => it.match_id));
      list = list.filter((m) => myMatches.has(m.id));
    } else if (a.profile.role === 'carrier') {
      const myMatches = new Set(v.s.transportOrders.filter((t) => t.carrier_id === a.carrier?.id).map((t) => t.match_id));
      list = list.filter((m) => myMatches.has(m.id));
    }
    res.json(list.map((m) => v.match(m)).sort((x, y) => y.created_at.localeCompare(x.created_at)));
  } catch (e) {
    next(e);
  }
});

matchingRouter.get('/matches/:id', requireAuth, async (req, res, next) => {
  try {
    const m = await store.get('matches', String(req.params.id));
    if (!m) throw notFound('Match');
    const v = await views();
    const view = v.match(m);
    const a = req.auth!;
    if (a.profile.role === 'producer' && view.demand?.producer_id !== a.producer?.id) throw forbidden();
    res.json(view);
  } catch (e) {
    next(e);
  }
});

/** POST /api/matches/:id/confirm — confirma el match y crea la operación trazable. */
matchingRouter.post('/matches/:id/confirm', requireRole('producer', 'admin'), async (req, res, next) => {
  try {
    res.status(201).json(await confirmMatch(String(req.params.id), req.auth!));
  } catch (e) {
    next(e);
  }
});
