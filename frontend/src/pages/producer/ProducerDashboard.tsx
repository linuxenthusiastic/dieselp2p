import { Link } from 'react-router-dom';
import { ArrowRight, Fuel, Leaf, Package, PlusCircle, Search, Target, TrendingDown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useMe } from '../../hooks/queries';
import { Button, Card, CardBody, CardHeader, EmptyState, ErrorState, SkeletonCards, StatCard, StatusBadge } from '../../components/ui';
import { DieselMap } from '../../components/map/DieselMap';
import { MatchAllocation } from '../../components/domain/MatchSummary';
import { ScoreRing } from '../../components/domain/ScoreBreakdown';
import { DEMAND_STATUS, OPERATION_STATUS, formatBs, formatDate, formatLiters, formatNumber, formatPrice } from '../../lib/format';
import type { DemandView, MapConnection, MatchView, ProducerSummaryStats } from '../../types';

function toConnection(match: MatchView, demand: DemandView): MapConnection {
  return {
    match_id: match.id,
    status: match.status,
    operation_code: match.operation?.operation_code ?? null,
    total_liters: match.total_liters,
    score: match.score,
    destination: { name: demand.producer?.organization_name ?? demand.location_name, latitude: demand.latitude, longitude: demand.longitude },
    origins: match.items.map((it) => ({
      name: it.supplier?.business_name ?? 'Proveedor',
      liters: it.allocated_liters,
      latitude: it.offer?.latitude ?? 0,
      longitude: it.offer?.longitude ?? 0,
      distance_km: it.distance_km,
    })),
  };
}

function ActiveDemandCard({ demand }: { demand: DemandView }) {
  const rows = [
    { label: 'Volumen solicitado', value: formatLiters(demand.requested_liters) },
    { label: 'Pendiente por cubrir', value: formatLiters(demand.remaining_liters) },
    { label: 'Ubicación', value: demand.location_name },
    { label: 'Fecha requerida', value: formatDate(demand.required_date) },
    { label: 'Actividad', value: demand.activity_type },
    { label: 'Precio objetivo', value: demand.target_price ? formatPrice(demand.target_price) : '—' },
  ];
  return (
    <Card>
      <CardHeader title="Tu demanda activa" subtitle={`Publicada el ${formatDate(demand.created_at)}`} action={<StatusBadge map={DEMAND_STATUS} value={demand.status} />} />
      <CardBody>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          {rows.map((r) => (
            <div key={r.label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{r.label}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-900">{r.value}</dd>
            </div>
          ))}
        </dl>
        <Link to={`/app/demands/${demand.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
          Ver detalle <ArrowRight className="h-4 w-4" />
        </Link>
      </CardBody>
    </Card>
  );
}

function MatchCard({ data }: { data: ProducerSummaryStats }) {
  const { activeMatch, activeDemand } = data;
  if (activeMatch) {
    return (
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Match actual</p>
            <p className="mt-1 text-sm text-slate-600">
              {activeMatch.items.length} {activeMatch.items.length === 1 ? 'proveedor' : 'proveedores'} · {formatLiters(activeMatch.total_liters)}
            </p>
          </div>
          <ScoreRing score={activeMatch.score} size={56} />
        </div>
        <div className="mt-3">
          <MatchAllocation match={activeMatch} compact />
        </div>
        <Link to={`/app/matches/${activeMatch.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
          Ver match <ArrowRight className="h-4 w-4" />
        </Link>
      </Card>
    );
  }
  return (
    <Card className="flex flex-col justify-between p-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ofertas encontradas</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">—</p>
        <p className="mt-0.5 text-xs text-slate-500">{activeDemand ? 'Aún no ejecutaste el matching' : 'Publica una demanda para buscar ofertas'}</p>
      </div>
      {activeDemand && (
        <Link to={`/app/demands/${activeDemand.id}`} className="mt-3">
          <Button size="sm" variant="secondary" icon={<Search className="h-4 w-4" />}>
            Buscar ofertas
          </Button>
        </Link>
      )}
    </Card>
  );
}

export default function ProducerDashboard() {
  const { session } = useAuth();
  const { data, isLoading, isError, refetch } = useMe();
  const orgName = session?.producer?.organization_name ?? session?.profile.full_name ?? 'Productor';

  if (isLoading) return <SkeletonCards count={6} />;
  if (isError || !data || data.role !== 'producer') return <ErrorState retry={() => void refetch()} />;

  const { activeDemand, activeMatch, activeOperation, totals } = data;
  const connections = activeMatch && activeDemand ? [toConnection(activeMatch, activeDemand)] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Panel del productor</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{orgName}</h1>
          <p className="mt-1 text-sm text-slate-500">Publica tu necesidad de diésel y deja que el motor encuentre la mejor combinación de proveedores.</p>
        </div>
        <Link to="/app/demands/new">
          <Button variant="accent" size="lg" icon={<PlusCircle className="h-5 w-5" />}>
            Nueva demanda
          </Button>
        </Link>
      </div>

      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Package className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Mi demanda activa</p>
              {activeDemand ? (
                <>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{formatLiters(activeDemand.requested_liters)}</p>
                  <div className="mt-1">
                    <StatusBadge map={DEMAND_STATUS} value={activeDemand.status} />
                  </div>
                </>
              ) : (
                <p className="mt-1 text-lg font-semibold text-slate-400">Sin demanda activa</p>
              )}
            </div>
          </div>
        </Card>
        <StatCard label="Volumen solicitado" value={formatLiters(totals.litersRequested)} hint={`${formatNumber(totals.demands)} demandas publicadas`} icon={<Fuel className="h-5 w-5" />} tone="green" />
        <MatchCard data={data} />
        <Card className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <Leaf className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Estado de operación</p>
              {activeOperation ? (
                <>
                  <p className="mt-1 font-mono text-lg font-bold text-slate-900">{activeOperation.operation_code}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadge map={OPERATION_STATUS} value={activeOperation.status} />
                    <Link to={`/app/operations/${activeOperation.id}`} className="text-xs font-medium text-brand-700 hover:underline">
                      Ver
                    </Link>
                  </div>
                </>
              ) : (
                <p className="mt-1 text-2xl font-bold text-slate-400">—</p>
              )}
            </div>
          </div>
        </Card>
        <StatCard label="Ahorro estimado" value={formatBs(totals.savings)} hint="Estimación sobre datos simulados" icon={<TrendingDown className="h-5 w-5" />} tone="yellow" />
        <StatCard label="Operaciones" value={formatNumber(totals.operations)} hint={`${formatLiters(totals.litersMatched)} conectados`} icon={<Target className="h-5 w-5" />} tone="blue" />
      </div>

      {activeDemand ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <ActiveDemandCard demand={activeDemand} />
          <Card className="overflow-hidden p-2">
            <DieselMap demands={[activeDemand]} connections={connections} highlightMatchId={activeMatch?.id ?? null} className="h-72" showLegend={connections.length > 0} />
          </Card>
        </div>
      ) : (
        <EmptyState
          icon={<Package className="h-6 w-6" />}
          title="Todavía no tienes una demanda activa"
          description="Publica cuántos litros necesitas, dónde y para cuándo. El motor de matching combinará las mejores ofertas disponibles."
          action={
            <Link to="/app/demands/new">
              <Button variant="accent" icon={<PlusCircle className="h-4 w-4" />}>
                Publicar mi primera demanda
              </Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
