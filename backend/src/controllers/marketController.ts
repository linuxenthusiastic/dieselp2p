import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import { getMarketSnapshot } from '../services/marketService.js';

export const marketRouter = Router();

/**
 * GET /api/market — panorama del mercado para que un proveedor decida su precio.
 * El proveedor ve agregados y, para cada demanda abierta, el precio que tendría
 * que ofertar para desplazar a la mejor combinación actual.
 */
marketRouter.get('/market', requireRole('supplier', 'admin'), async (req, res, next) => {
  try {
    res.json(await getMarketSnapshot(req.auth!.supplier));
  } catch (e) {
    next(e);
  }
});
