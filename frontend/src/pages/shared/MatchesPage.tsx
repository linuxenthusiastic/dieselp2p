import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Target } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../hooks/useAuth';
import { useMatches } from '../../hooks/queries';
import { Badge, Card, EmptyState, ErrorState, PageHeader, SkeletonCards, StatusBadge } from '../../components/ui';
import { MatchAllocation } from '../../components/domain/MatchSummary';
import { ScoreRing } from '../../components/domain/ScoreBreakdown';
import { MATCH_STATUS, formatBs, formatLiters, relativeTime } from '../../lib/format';
import type { MatchStatus, MatchView } from '../../types';

type Filter = 'ALL' | 'PROPOSED' | 'CONFIRMED';

function MatchCard({ match, index }: { match: MatchView; index: number }) {
  const multi = match.items.length > 1;
  return (
    <Link to={`/app/matches/${match.id}`} className="block animate-fade-up" style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}>
      <Card className="h-full p-5 transition hover:-translate-y-0.5 hover:shadow-float">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-900">{match.demand?.producer?.organization_name ?? 'Productor'}</p>
            <p className="inline-flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3 w-3" /> {match.demand?.location_name ?? '—'}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge map={MATCH_STATUS} value={match.status} />
              {multi && <Badge tone="yellow">Multi-proveedor</Badge>}
            </div>
          </div>
          <ScoreRing score={match.score} size={64} />
        </div>
        <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">{formatLiters(match.total_liters)}</p>
        <div className="mt-3">
          <MatchAllocation match={match} compact />
        </div>
        <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3 text-sm">
          <div>
            <p className="text-xs text-slate-500">Costo total estimado</p>
            <p className="font-semibold text-slate-900">{formatBs(match.estimated_total_cost)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Ahorro estimado</p>
            <p className="font-semibold text-fuel-700">
              {formatBs(match.estimated_savings)} <span className="text-xs font-medium">({match.savings_percent}%)</span>
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>{match.operation ? <span className="font-mono font-semibold text-brand-700">{match.operation.operation_code}</span> : 'Sin operación'}</span>
          <span>{relativeTime(match.created_at)}</span>
        </div>
      </Card>
    </Link>
  );
}

export default function MatchesPage() {
  const { role } = useAuth();
  const { data, isLoading, isError, refetch } = useMatches();
  const [filter, setFilter] = useState<Filter>('ALL');

  const rows = useMemo(() => (data ?? []).filter((m) => filter === 'ALL' || m.status === filter), [data, filter]);
  const count = (s: MatchStatus) => (data ?? []).filter((m) => m.status === s).length;
  const chips: Array<{ key: Filter; label: string; n: number }> = [
    { key: 'ALL', label: 'Todos', n: data?.length ?? 0 },
    { key: 'PROPOSED', label: 'Propuestos', n: count('PROPOSED') },
    { key: 'CONFIRMED', label: 'Confirmados', n: count('CONFIRMED') },
  ];

  return (
    <div>
      <PageHeader
        title={role === 'admin' ? 'Matches' : 'Mis matches'}
        description="Combinaciones de ofertas encontradas por el motor de matching. Una demanda puede ser cubierta por varios proveedores."
      />
      {isLoading ? (
        <SkeletonCards count={6} />
      ) : isError ? (
        <ErrorState retry={() => void refetch()} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon={<Target className="h-6 w-6" />} title="Aún no hay matches" description="Ejecuta el matching desde una demanda abierta para ver combinaciones de ofertas." />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className={clsx(
                  'rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition',
                  filter === c.key ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
                )}
              >
                {c.label} <span className="opacity-70">({c.n})</span>
              </button>
            ))}
          </div>
          {rows.length === 0 ? (
            <EmptyState title="Sin matches con este estado" />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((m, i) => (
                <MatchCard key={m.id} match={m} index={i} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
