import { Router } from 'express';
import { z } from 'zod';
import { createDemoSession, revokeDemoSession } from '../middleware/auth.js';
import { env, params, supabaseConfigured } from '../config.js';
import { store } from '../data/store.js';
import { DEMO_EMAILS, ZONES } from '../data/seedData.js';
import { parseBody } from '../utils/validate.js';
import { loadAuthContext } from '../services/profileService.js';

export const authRouter = Router();

/** Configuración pública del MVP (sin secretos). */
authRouter.get('/config', (_req, res) => {
  res.json({
    appName: 'DieselP2P',
    demoMode: env.demoMode,
    storage: store.kind,
    supabaseConfigured,
    demoAccounts: env.demoMode ? DEMO_EMAILS : null,
    params: {
      costPerKm: params.costPerKm,
      referencePricePerLiter: params.referencePricePerLiter,
      truckCapacityLiters: params.truckCapacityLiters,
      baseTripCost: params.baseTripCost,
      maxRadiusKm: params.maxRadiusKm,
      maxSuppliersPerMatch: params.maxSuppliersPerMatch,
    },
    zones: Object.entries(ZONES).map(([name, z]) => ({ name, latitude: z.lat, longitude: z.lng, department: z.dept })),
    disclaimer: 'MVP DEMO — DATOS SIMULADOS',
  });
});

const demoLoginSchema = z.object({ role: z.enum(['producer', 'supplier', 'carrier', 'admin']) });

/** Login demo por rol: token efímero asociado a un perfil ficticio. */
authRouter.post('/auth/demo-login', async (req, res, next) => {
  try {
    const { role } = parseBody(demoLoginSchema, req.body);
    const { token, profile } = await createDemoSession(role);
    const ctx = await loadAuthContext(profile, true);
    res.json({ token, profile: ctx.profile, producer: ctx.producer ?? null, supplier: ctx.supplier ?? null, carrier: ctx.carrier ?? null, isDemo: true });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/auth/logout', (req, res) => {
  const header = req.header('authorization') ?? '';
  if (header.startsWith('Bearer demo_')) revokeDemoSession(header.slice(7));
  res.json({ ok: true });
});
