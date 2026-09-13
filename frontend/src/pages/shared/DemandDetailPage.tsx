import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Sparkles, MapPin, Calendar, Fuel, Tag } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useConfirmMatch, useDemand, useFindMatch } from '../../hooks/queries';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { ErrorState, Skeleton } from '../../components/ui/Feedback';
import { DieselMap } from '../../components/map/DieselMap';
import { MatchSearchOverlay } from '../../components/domain/MatchSearchOverlay';
import { MatchResultPanel, connectionFromMatch } from '../../components/domain/MatchResultPanel';
import { MatchAllocation } from '../../components/domain/MatchSummary';
import { ScoreRing } from '../../components/domain/ScoreBreakdown';
import { DEMAND_STATUS, MATCH_STATUS, formatBs, formatDate, formatLiters, formatPrice, relativeTime } from '../../lib/format';
import type { MatchingResponse } from '../../types';

export default function DemandDetailPage() {
  const { id } = useParams();
  const { role } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useDemand(id);
  const findMatch = useFindMatch();
  const confirmMatch = useConfirmMatch();
  const [searching, setSearching] = useState(false);
  const [pending, setPending] = useState<MatchingResponse | null>(null);
  const [result, setResult] = useState<MatchingResponse | null>(null);

  const runMatching = async () => {
    if (!id) return;
    setSearching(true);
    setResult(null);
    setPending(null);
    try {
      setPending(await findMatch.mutateAsync(id));
    } catch (err) {
      setSearching(false);
      toast.error(err instanceof Error ? err.message : 'No se pudo ejecutar el matching');
    }
  };
  const onSearchDone = useCallback(() => {
    setSearching(false);
    setResult(pending);
  }, [pending]);

  const onConfirm = async (matchId: string) => {
    try {
      const op = await confirmMatch.mutateAsync(matchId);
      toast.success(`Operación ${op.operation_code} creada`);
      navigate(`/app/operations/${op.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo confirmar');
    }
  };

  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  if (isError || !data) return <ErrorState retry={() => refetch()} />;

  const canMatch = (role === 'producer' || role === 'admin') && ['OPEN', 'PARTIALLY_MATCHED'].includes(data.status);
  const proposed = data.matches.find((m) => m.status === 'PROPOSED');
  const confirmed = data.matches.filter((m) => m.status === 'CONFIRMED');

  return (
    <div>
      <MatchSearchOverlay open={searching} ready={pending !== null} analyzedOffers={pending?.analyzedOffers ?? null} onDone={onSearchDone} liters={data.remaining_liters} />
      <Link to="/app/demands" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Demandas
      </Link>
      <PageHeader
        title={`Demanda de ${formatLiters(data.requested_liters)}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {data.producer?.organization_name} <StatusBadge map={DEMAND_STATUS} value={data.status} /> <span className="text-xs">creada {relativeTime(data.created_at)}</span>
          </span>
        }
        actions={
          canMatch && (
            <Button variant="accent" icon={<Sparkles className="h-4 w-4" />} onClick={runMatching} loading={findMatch.isPending}>
              {proposed ? 'Volver a buscar ofertas' : 'Buscar ofertas'}
            </Button>
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Detalle" />
          <CardBody className="space-y-3 text-sm">
            <Row icon={Fuel} label="Solicitado" value={formatLiters(data.requested_liters)} />
            <Row icon={Fuel} label="Pendiente" value={formatLiters(data.remaining_liters)} />
            <Row icon={MapPin} label="Ubicación" value={data.location_name} />
            <Row icon={Calendar} label="Fecha requerida" value={formatDate(data.required_date)} />
            <Row icon={Tag} label="Actividad" value={data.activity_type} />
            <Row icon={Tag} label="Precio objetivo" value={data.target_price ? formatPrice(data.target_price) : '—'} />
            {typeof data.distance_km === 'number' && <Row icon={MapPin} label="Distancia a tu ubicación" value={`${Math.round(data.distance_km)} km`} />}
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Ubicación" />
          <CardBody>
            <DieselMap demands={[data]} connections={confirmed.map(connectionFromMatch)} className="h-64" showLegend={false} />
          </CardBody>
        </Card>
      </div>

      {result && (
        <div className="mt-6">
          <MatchResultPanel result={result} onConfirm={onConfirm} confirming={confirmMatch.isPending} canConfirm={canMatch && Boolean(result.match)} />
        </div>
      )}

      {!result && data.matches.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Matches de esta demanda</h2>
          <div className="stagger grid gap-4 md:grid-cols-2">
            {data.matches.map((m) => (
              <Card key={m.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusBadge map={MATCH_STATUS} value={m.status} />
                      {m.items.length > 1 && <Badge tone="yellow">Multi-proveedor</Badge>}
                    </div>
                    <p className="mt-2 text-xl font-bold text-slate-900">{formatLiters(m.total_liters)}</p>
                    <p className="text-xs text-slate-500">Total {formatBs(m.estimated_total_cost)} · ahorro est. {formatBs(m.estimated_savings)}</p>
                  </div>
                  <ScoreRing score={m.score} size={64} />
                </div>
                <div className="mt-3">
                  <MatchAllocation match={m} compact />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/app/matches/${m.id}`}>
                    <Button size="sm" variant="outline">Ver detalle</Button>
                  </Link>
                  {m.status === 'PROPOSED' && canMatch && (
                    <Button size="sm" variant="accent" onClick={() => onConfirm(m.id)} loading={confirmMatch.isPending}>
                      Confirmar match
                    </Button>
                  )}
                  {m.operation && (
                    <Link to={`/app/operations/${m.operation.id}`}>
                      <Button size="sm" variant="secondary">{m.operation.operation_code}</Button>
                    </Link>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Fuel; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4 text-slate-400" /> {label}
      </span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}
