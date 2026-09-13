import type { User } from '@supabase/supabase-js';
import { store } from '../data/store.js';
import { ZONES } from '../data/seedData.js';
import type { AuthContext, Profile, Role } from '../types/domain.js';
import { newId, nowIso } from '../utils/ids.js';

const VALID_ROLES: Role[] = ['producer', 'supplier', 'carrier', 'admin'];

/** Carga perfil + subperfil de rol para el contexto de autenticación. */
export async function loadAuthContext(profile: Profile, isDemo: boolean): Promise<AuthContext> {
  const ctx: AuthContext = { profile, isDemo };
  if (profile.role === 'producer') ctx.producer = (await store.list('producer_profiles', { profile_id: profile.id }))[0];
  if (profile.role === 'supplier') ctx.supplier = (await store.list('supplier_profiles', { profile_id: profile.id }))[0];
  if (profile.role === 'carrier') ctx.carrier = (await store.list('carrier_profiles', { profile_id: profile.id }))[0];
  return ctx;
}

/**
 * Crea (si no existe) el perfil de un usuario de Supabase Auth a partir de sus
 * metadatos de registro. El rol "admin" no se autoasigna desde el registro.
 */
export async function provisionProfileForUser(user: User): Promise<Profile> {
  const existing = await store.list('profiles', { user_id: user.id });
  if (existing[0]) return existing[0];
  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  const requested = meta.role as Role | undefined;
  const role: Role = requested && VALID_ROLES.includes(requested) && requested !== 'admin' ? requested : 'producer';
  const profile: Profile = {
    id: newId(),
    user_id: user.id,
    full_name: meta.full_name ?? user.email?.split('@')[0] ?? 'Usuario',
    email: user.email ?? '',
    phone: meta.phone ?? null,
    role,
    status: 'active',
    created_at: nowIso(),
  };
  await store.insert('profiles', profile);
  await ensureRoleProfile(profile, meta);
  return profile;
}

export async function ensureRoleProfile(profile: Profile, meta: Record<string, string | undefined> = {}) {
  const zoneName = meta.location_name && ZONES[meta.location_name] ? meta.location_name : 'Santa Cruz de la Sierra';
  const zone = ZONES[zoneName];
  const base = { id: newId(), profile_id: profile.id, location_name: zoneName, latitude: zone.lat, longitude: zone.lng, created_at: nowIso() };
  if (profile.role === 'producer' && !(await store.list('producer_profiles', { profile_id: profile.id }))[0]) {
    await store.insert('producer_profiles', {
      ...base,
      organization_name: meta.organization_name ?? profile.full_name,
      activity_type: (meta.activity_type as never) ?? 'Agricultura',
      nit_demo: `DEMO-${Math.floor(Math.random() * 1e9).toString().padStart(9, '0')}`,
    });
  }
  if (profile.role === 'supplier' && !(await store.list('supplier_profiles', { profile_id: profile.id }))[0]) {
    await store.insert('supplier_profiles', {
      ...base,
      business_name: meta.organization_name ?? profile.full_name,
      verification_status: 'PENDING',
      capacity_liters: Number(meta.capacity_liters ?? 20000),
    });
  }
  if (profile.role === 'carrier' && !(await store.list('carrier_profiles', { profile_id: profile.id }))[0]) {
    await store.insert('carrier_profiles', {
      ...base,
      company_name: meta.organization_name ?? profile.full_name,
      vehicle_type: meta.vehicle_type ?? 'Cisterna 10.000 L',
      capacity_liters: Number(meta.capacity_liters ?? 10000),
      coverage_area: meta.coverage_area ?? 'Santa Cruz',
    });
  }
}
