import type { AnomalyStatus, AnomalyType, DemandStatus, OfferStatus, OperationStatus, Role, TransportStatus, VerificationStatus } from '../types';

const nf = new Intl.NumberFormat('es-BO');
const nf2 = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatLiters = (n: number) => `${nf.format(Math.round(n))} L`;
export const formatNumber = (n: number) => nf.format(Math.round(n));
export const formatBs = (n: number, decimals = 0) => `Bs ${decimals ? nf2.format(n) : nf.format(Math.round(n))}`;
export const formatPrice = (n: number) => `Bs ${nf2.format(n)}/L`;
export const formatKm = (n: number) => `${nf.format(Math.round(n))} km`;
export const formatPercent = (n: number) => `${nf2.format(n).replace(/,00$/, '')}%`;

export function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} d`;
}

export const ROLE_LABELS: Record<Role, string> = {
  producer: 'Productor',
  supplier: 'Proveedor',
  carrier: 'Transportista',
  admin: 'Administrador',
};

export const DEMAND_STATUS: Record<DemandStatus, { label: string; tone: Tone }> = {
  OPEN: { label: 'Abierta', tone: 'blue' },
  PARTIALLY_MATCHED: { label: 'Parcialmente cubierta', tone: 'yellow' },
  MATCHED: { label: 'Match confirmado', tone: 'green' },
  IN_PROGRESS: { label: 'En curso', tone: 'yellow' },
  COMPLETED: { label: 'Completada', tone: 'green' },
  CANCELLED: { label: 'Cancelada', tone: 'gray' },
};

export const OFFER_STATUS: Record<OfferStatus, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Activa', tone: 'green' },
  PARTIALLY_ALLOCATED: { label: 'Parcialmente asignada', tone: 'yellow' },
  FULLY_ALLOCATED: { label: 'Asignada', tone: 'gray' },
  EXPIRED: { label: 'Expirada', tone: 'gray' },
  CANCELLED: { label: 'Cancelada', tone: 'gray' },
};

export const TRANSPORT_STATUS: Record<TransportStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pendiente', tone: 'gray' },
  ASSIGNED: { label: 'Asignado', tone: 'blue' },
  IN_TRANSIT: { label: 'En tránsito', tone: 'yellow' },
  DELIVERED: { label: 'Entregado', tone: 'green' },
};

export const OPERATION_STATUS: Record<OperationStatus, { label: string; tone: Tone }> = {
  CREATED: { label: 'Creada', tone: 'blue' },
  ASSIGNED: { label: 'Transporte asignado', tone: 'blue' },
  IN_TRANSIT: { label: 'En tránsito', tone: 'yellow' },
  DELIVERED: { label: 'Entregada', tone: 'green' },
  CANCELLED: { label: 'Cancelada', tone: 'gray' },
};

export const MATCH_STATUS: Record<string, { label: string; tone: Tone }> = {
  PROPOSED: { label: 'Propuesto', tone: 'yellow' },
  CONFIRMED: { label: 'Confirmado', tone: 'green' },
  CANCELLED: { label: 'Cancelado', tone: 'gray' },
};

export const VERIFICATION_STATUS: Record<VerificationStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pendiente', tone: 'yellow' },
  VERIFIED: { label: 'Verificado', tone: 'green' },
  REJECTED: { label: 'Rechazado', tone: 'red' },
};

export const ANOMALY_TYPE: Record<AnomalyType, string> = {
  UNUSUAL_VOLUME: 'Volumen inusual',
  FREQUENT_REQUESTS: 'Solicitudes frecuentes',
  RAPID_RESALE_PATTERN: 'Patrón de reventa',
  MULTIPLE_LOCATIONS: 'Múltiples ubicaciones',
  OTHER: 'Otro',
};

export const ANOMALY_STATUS: Record<AnomalyStatus, { label: string; tone: Tone }> = {
  OPEN: { label: 'Abierta', tone: 'red' },
  REVIEWED: { label: 'Revisada', tone: 'blue' },
  DISMISSED: { label: 'Descartada', tone: 'gray' },
};

export type Tone = 'green' | 'yellow' | 'blue' | 'red' | 'gray';

export function riskTone(score: number): Tone {
  if (score >= 75) return 'red';
  if (score >= 50) return 'yellow';
  return 'green';
}
