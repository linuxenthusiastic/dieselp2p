const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distancia haversine en km entre dos coordenadas. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** Distancia por carretera aproximada: haversine con factor de sinuosidad. */
export function roadDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return round1(haversineKm(lat1, lon1, lat2, lon2) * 1.18);
}

export const round1 = (n: number) => Math.round(n * 10) / 10;
export const round2 = (n: number) => Math.round(n * 100) / 100;
