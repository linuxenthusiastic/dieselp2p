import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import { store } from '../data/store.js';
import { badRequest } from '../utils/errors.js';

export const demoRouter = Router();

/** Admin: reinicia los datos seed (solo store en memoria). */
demoRouter.post('/demo/reset', requireRole('admin'), async (_req, res, next) => {
  try {
    if (!store.reset) throw badRequest('El reinicio solo está disponible con el store en memoria. En Supabase, vuelve a ejecutar seed.sql.');
    await store.reset();
    res.json({ ok: true, message: 'Datos de demostración reiniciados' });
  } catch (e) {
    next(e);
  }
});
