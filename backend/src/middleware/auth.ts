import type { NextFunction, Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { env } from '../config.js';
import { store, supabaseAdmin } from '../data/store.js';
import { DEMO_EMAILS } from '../data/seedData.js';
import type { AuthContext, Profile, Role } from '../types/domain.js';
import { forbidden, unauthorized } from '../utils/errors.js';
import { loadAuthContext, provisionProfileForUser } from '../services/profileService.js';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}

/**
 * Sesiones DEMO: tokens aleatorios en memoria asociados a los perfiles demo
 * (demo.<rol>@dieselp2p.demo). No hay contraseñas. Claramente ficticio.
 */
const demoSessions = new Map<string, { profileId: string; expiresAt: number }>();
const DEMO_TTL_MS = 12 * 60 * 60 * 1000;

export async function createDemoSession(role: Role): Promise<{ token: string; profile: Profile }> {
  if (!env.demoMode) throw forbidden('El modo demo está deshabilitado');
  const profiles = await store.list('profiles', { email: DEMO_EMAILS[role] });
  const profile = profiles[0];
  if (!profile) throw unauthorized(`No existe el perfil demo para el rol ${role}. Ejecuta el seed.`);
  const token = `demo_${randomBytes(18).toString('hex')}`;
  demoSessions.set(token, { profileId: profile.id, expiresAt: Date.now() + DEMO_TTL_MS });
  return { token, profile };
}

export function revokeDemoSession(token: string) {
  demoSessions.delete(token);
}

async function resolveProfile(token: string): Promise<{ profile: Profile; isDemo: boolean } | null> {
  if (token.startsWith('demo_')) {
    const s = demoSessions.get(token);
    if (!s || s.expiresAt < Date.now()) return null;
    const profile = await store.get('profiles', s.profileId);
    return profile ? { profile, isDemo: true } : null;
  }
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  const profile = await provisionProfileForUser(data.user);
  return { profile, isDemo: false };
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.header('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) return next();
    const resolved = await resolveProfile(token);
    if (resolved) {
      if (resolved.profile.status !== 'active') throw forbidden('Cuenta suspendida');
      req.auth = await loadAuthContext(resolved.profile, resolved.isDemo);
    }
    next();
  } catch (e) {
    next(e);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) return next(unauthorized());
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized());
    if (!roles.includes(req.auth.profile.role)) return next(forbidden());
    next();
  };
}
