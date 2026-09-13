import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { views } from '../services/queryService.js';
import { assignCarrier, updateTransportStatus } from '../services/operationsService.js';
import { parseBody } from '../utils/validate.js';
import { roadDistanceKm } from '../utils/geo.js';

export const transportRouter = Router();

/** GET /api/transport — órdenes de transporte visibles según rol. */
transportRouter.get('/transport', requireAuth, async (req, res, next) => {
  try {
    const a = req.auth!;
    const v = await views();
    let list = v.s.transportOrders;
    if (a.profile.role === 'carrier') {
      const c = a.carrier!;
      // asignadas al transportista + pendientes dentro de su zona (para aceptar)
      list = list.filter(
        (t) => t.carrier_id === c.id || (t.status === 'PENDING' && roadDistanceKm(c.latitude, c.longitude, t.origin_latitude, t.origin_longitude) <= 400),
      );
    } else if (a.profile.role === 'producer') {
      const mine = new Set(v.s.operations.filter((o) => o.producer_id === a.producer?.id).map((o) => o.match_id));
      list = list.filter((t) => mine.has(t.match_id));
    } else if (a.profile.role === 'supplier') {
      const myOffers = new Set(v.s.offers.filter((o) => o.supplier_id === a.supplier?.id).map((o) => o.id));
      const myItems = new Set(v.s.matchItems.filter((it) => myOffers.has(it.offer_id)).map((it) => it.id));
      list = list.filter((t) => t.match_item_id && myItems.has(t.match_item_id));
    }
    res.json(list.map((t) => v.transport(t)).sort((x, y) => y.created_at.localeCompare(x.created_at)));
  } catch (e) {
    next(e);
  }
});

/** GET /api/carriers — transportistas disponibles para asignación. */
transportRouter.get('/carriers', requireAuth, async (_req, res, next) => {
  try {
    const v = await views();
    res.json(v.s.carriers.map((c) => v.carrierSummary(c.id)));
  } catch (e) {
    next(e);
  }
});

const assignSchema = z.object({ match_id: z.string().min(1), carrier_id: z.string().min(1) });

/** POST /api/transport — asigna transportista a las órdenes de un match. */
transportRouter.post('/transport', requireRole('producer', 'admin', 'carrier'), async (req, res, next) => {
  try {
    const { match_id, carrier_id } = parseBody(assignSchema, req.body);
    res.status(201).json(await assignCarrier(match_id, carrier_id, req.auth!));
  } catch (e) {
    next(e);
  }
});

const statusSchema = z.object({ status: z.enum(['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED']) });

transportRouter.patch('/transport/:id/status', requireRole('carrier', 'admin'), async (req, res, next) => {
  try {
    const { status } = parseBody(statusSchema, req.body);
    res.json(await updateTransportStatus(String(req.params.id), status, req.auth!));
  } catch (e) {
    next(e);
  }
});
