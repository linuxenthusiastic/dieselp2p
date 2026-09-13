import 'dotenv/config';

/**
 * Parámetros del MVP. Todos los valores económicos son FICTICIOS y configurables.
 * Se exponen en GET /api/config para que la UI los etiquete como simulación.
 */
export const params = {
  /** Costo logístico ficticio por km recorrido por una cisterna (Bs/km, por viaje). */
  costPerKm: Number(process.env.COST_PER_KM ?? 12),
  /** Costo fijo ficticio por viaje (carga, maniobra, peajes). Evita que un retiro cercano cueste Bs 0. */
  baseTripCost: Number(process.env.BASE_TRIP_COST ?? 150),
  /** Precio de referencia ficticio de un mercado no optimizado (Bs/L). Incluye intermediación estimada. */
  referencePricePerLiter: Number(process.env.REFERENCE_PRICE_PER_LITER ?? 4.15),
  /** Capacidad típica de una cisterna (L) para estimar viajes en el escenario de referencia. */
  truckCapacityLiters: Number(process.env.TRUCK_CAPACITY_LITERS ?? 10000),
  /** Radio máximo de búsqueda de ofertas (km). */
  maxRadiusKm: Number(process.env.MAX_RADIUS_KM ?? 350),
  /** Máximo de proveedores combinados en un match. */
  maxSuppliersPerMatch: Number(process.env.MAX_SUPPLIERS_PER_MATCH ?? 4),
  /** Cantidad de ofertas candidatas consideradas en la búsqueda combinatoria. */
  candidatePoolSize: 12,
};

export const env = {
  port: Number(process.env.PORT ?? 4000),
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  /** DEMO_MODE=true habilita el login demo por rol sin contraseñas. */
  demoMode: (process.env.DEMO_MODE ?? 'true').toLowerCase() !== 'false',
  /** Fuerza el store en memoria aunque exista Supabase (útil para pruebas). */
  forceMemoryStore: (process.env.FORCE_MEMORY_STORE ?? 'false').toLowerCase() === 'true',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  /**
   * Acepta automáticamente orígenes de la red local (localhost y rangos privados).
   * Permite abrir la demo desde un celular o el portátil de un compañero con
   * `vite --host` sin tener que editar CORS_ORIGINS. Desactívalo en producción.
   */
  allowLanOrigins: (process.env.ALLOW_LAN_ORIGINS ?? 'true').toLowerCase() !== 'false',
};

/** Hosts de desarrollo: localhost y direcciones IPv4/IPv6 privadas. */
const LAN_HOST = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/;

/** True si el origen corresponde a una máquina de la red local. */
export function isLanOrigin(origin: string): boolean {
  try {
    return LAN_HOST.test(new URL(origin).hostname);
  } catch {
    return false;
  }
}

export const supabaseConfigured =
  !env.forceMemoryStore && Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
