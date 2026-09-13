import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost } from '../lib/api';
import type {
  AnomalyView,
  AppConfig,
  CarrierSummary,
  DashboardMetrics,
  DemandView,
  ImpactMetrics,
  MapData,
  MarketSnapshot,
  MatchView,
  MatchingResponse,
  MeStats,
  OfferView,
  OperationView,
  TransportView,
  UserRow,
} from '../types';

export const keys = {
  config: ['config'] as const,
  me: ['me'] as const,
  demands: ['demands'] as const,
  demand: (id: string) => ['demands', id] as const,
  offers: ['offers'] as const,
  matches: ['matches'] as const,
  match: (id: string) => ['matches', id] as const,
  transport: ['transport'] as const,
  carriers: ['carriers'] as const,
  operations: ['operations'] as const,
  operation: (id: string) => ['operations', id] as const,
  anomalies: ['anomalies'] as const,
  dashboard: ['analytics', 'dashboard'] as const,
  impact: ['analytics', 'impact'] as const,
  users: ['users'] as const,
  map: ['map'] as const,
  market: ['market'] as const,
};

export const useConfig = () => useQuery({ queryKey: keys.config, queryFn: () => apiGet<AppConfig>('/config'), staleTime: Infinity });
export const useMe = () => useQuery({ queryKey: keys.me, queryFn: () => apiGet<MeStats>('/analytics/me') });
export const useDemands = () => useQuery({ queryKey: keys.demands, queryFn: () => apiGet<DemandView[]>('/demands') });
export const useDemand = (id: string | undefined) =>
  useQuery({ queryKey: keys.demand(id ?? ''), queryFn: () => apiGet<DemandView & { matches: MatchView[] }>(`/demands/${id}`), enabled: Boolean(id) });
export const useOffers = (activeOnly = false) =>
  useQuery({ queryKey: [...keys.offers, activeOnly], queryFn: () => apiGet<OfferView[]>(`/offers${activeOnly ? '?active=true' : ''}`) });
export const useMatches = () => useQuery({ queryKey: keys.matches, queryFn: () => apiGet<MatchView[]>('/matches') });
export const useMatch = (id: string | undefined) => useQuery({ queryKey: keys.match(id ?? ''), queryFn: () => apiGet<MatchView>(`/matches/${id}`), enabled: Boolean(id) });
export const useTransport = () => useQuery({ queryKey: keys.transport, queryFn: () => apiGet<TransportView[]>('/transport') });
export const useCarriers = () => useQuery({ queryKey: keys.carriers, queryFn: () => apiGet<CarrierSummary[]>('/carriers') });
export const useOperations = () => useQuery({ queryKey: keys.operations, queryFn: () => apiGet<OperationView[]>('/operations') });
export const useOperation = (id: string | undefined) =>
  useQuery({ queryKey: keys.operation(id ?? ''), queryFn: () => apiGet<OperationView>(`/operations/${id}`), enabled: Boolean(id) });
export const useAnomalies = () => useQuery({ queryKey: keys.anomalies, queryFn: () => apiGet<AnomalyView[]>('/anomalies') });
export const useDashboard = () => useQuery({ queryKey: keys.dashboard, queryFn: () => apiGet<DashboardMetrics>('/analytics/dashboard') });
export const useImpact = () => useQuery({ queryKey: keys.impact, queryFn: () => apiGet<ImpactMetrics>('/analytics/impact') });
export const useUsers = () => useQuery({ queryKey: keys.users, queryFn: () => apiGet<UserRow[]>('/users') });
export const useMarket = () => useQuery({ queryKey: keys.market, queryFn: () => apiGet<MarketSnapshot>('/market') });
export const useMapData = () => useQuery({ queryKey: keys.map, queryFn: () => apiGet<MapData>('/map') });

/** Invalida todo lo que depende del estado del mercado. */
export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

export function useCreateDemand() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost<{ demand: DemandView; anomalies: AnomalyView[] }>('/demands', body),
    onSuccess: () => void invalidate(),
  });
}

export function useCreateOffer() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (body: Record<string, unknown>) => apiPost<OfferView>('/offers', body), onSuccess: () => void invalidate() });
}

export function useFindMatch() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (demandId: string) => apiPost<MatchingResponse>('/matching/find', { demand_id: demandId }), onSuccess: () => void invalidate() });
}

export function useConfirmMatch() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (matchId: string) => apiPost<OperationView>(`/matches/${matchId}/confirm`), onSuccess: () => void invalidate() });
}

export function useAssignCarrier() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (body: { match_id: string; carrier_id: string }) => apiPost<OperationView>('/transport', body),
    onSuccess: () => void invalidate(),
  });
}

export function useUpdateTransportStatus() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiPatch<TransportView>(`/transport/${id}/status`, { status }),
    onSuccess: () => void invalidate(),
  });
}

export function useUpdateAnomaly() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => apiPatch<AnomalyView>(`/anomalies/${id}`, { status }), onSuccess: () => void invalidate() });
}

export function useUpdateOperation() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; status?: string; verification_status?: string }) => apiPatch<OperationView>(`/operations/${id}`, body),
    onSuccess: () => void invalidate(),
  });
}

/** Avanza la operación al siguiente estado (solo demo). */
export function useSimulateNextStep() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (operationId: string) => apiPost<OperationView>(`/operations/${operationId}/simulate-next`), onSuccess: () => void invalidate() });
}

export function useUpdateDemand() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: ({ id, ...body }: { id: string; status?: string }) => apiPatch<DemandView>(`/demands/${id}`, body), onSuccess: () => void invalidate() });
}

export function useUpdateOffer() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: ({ id, ...body }: { id: string; status?: string; price_per_liter?: number }) => apiPatch<OfferView>(`/offers/${id}`, body), onSuccess: () => void invalidate() });
}

export function useUpdateUser() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; status?: string; verification_status?: string }) => apiPatch<UserRow>(`/users/${id}`, body),
    onSuccess: () => void invalidate(),
  });
}

export function useUpdateProfile() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (body: Record<string, unknown>) => apiPatch('/profile', body), onSuccess: () => void invalidate() });
}

export function useResetDemo() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: () => apiPost<{ ok: boolean }>('/demo/reset'), onSuccess: () => void invalidate() });
}

export function useScanAnomalies() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: () => apiPost<{ created: number }>('/anomalies/scan'), onSuccess: () => void invalidate() });
}
