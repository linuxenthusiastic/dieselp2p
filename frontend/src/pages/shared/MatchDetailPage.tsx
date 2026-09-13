import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useConfirmMatch, useMatch } from '../../hooks/queries';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { ErrorState, Skeleton } from '../../components/ui/Feedback';
import { DieselMap } from '../../components/map/DieselMap';
import { connectionFromMatch } from '../../components/domain/MatchResultPanel';
import { CostBreakdown, MatchAllocation, MatchExplanation, MatchScorePanel } from '../../components/domain/MatchSummary';
import { MATCH_STATUS, formatDate, formatDateTime, formatLiters } from '../../lib/format';

export default function MatchDetailPage() {
  const { id } = useParams();
  const { role } = useAuth();
  const navigate = useNavigate();
  const { data: match, isLoading, isError, refetch } = useMatch(id);
  const confirm = useConfirmMatch();

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !match) return <ErrorState retry={() => refetch()} />;

  const canConfirm = match.status === 'PROPOSED' && (role === 'producer' || role === 'admin');
  const onConfirm = async () => {
    try {
      const op = await confirm.mutateAsync(match.id);
      toast.success(`Operación ${op.operation_code} creada`);
      navigate(`/app/operations/${op.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo confirmar');
    }
  };

  return (
    <div>
      <Link to="/app/matches" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Matches
      </Link>
      <PageHeader
        title={`Match · ${formatLiters(match.total_liters)}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge map={MATCH_STATUS} value={match.status} />
            {match.items.length > 1 && <Badge tone="yellow">Multi-proveedor · {match.items.length} ofertas</Badge>}
            <span className="text-xs">{formatDateTime(match.created_at)}</span>
          </span>
        }
        actions={
          canConfirm ? (
            <Button variant="accent" icon={<CheckCircle2 className="h-4 w-4" />} loading={confirm.isPending} onClick={onConfirm}>
              Confirmar match
            </Button>
          ) : match.operation ? (
            <Link to={`/app/operations/${match.operation.id}`}>
              <Button variant="secondary">Operación {match.operation.operation_code}</Button>
            </Link>
          ) : null
        }
      />

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Demanda" subtitle={match.demand?.producer?.organization_name} />
          <CardBody className="text-sm text-slate-600">
            {match.demand ? (
              <ul className="space-y-1">
                <li>Solicitado: <b className="text-slate-900">{formatLiters(match.demand.requested_liters)}</b></li>
                <li>Entrega: {match.demand.location_name} · {formatDate(match.demand.required_date)}</li>
                <li>Actividad: {match.demand.activity_type}</li>
                <li>
                  <Link to={`/app/demands/${match.demand.id}`} className="font-medium text-brand-700 hover:underline">Ver demanda</Link>
                </li>
              </ul>
            ) : '—'}
          </CardBody>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader title="Conexión en el mapa" />
          <CardBody>
            <DieselMap connections={[connectionFromMatch(match)]} highlightMatchId={match.id} className="h-72" showLegend={false} />
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Combinación de proveedores" />
          <CardBody>
            <MatchAllocation match={match} />
          </CardBody>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader title="Score y explicación" />
          <CardBody className="space-y-5">
            <MatchScorePanel match={match} />
            <MatchExplanation match={match} />
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Costos estimados" />
          <CardBody>
            <CostBreakdown match={match} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
