import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Target, CheckCircle2, ChevronDown, ChevronUp, Crosshair } from 'lucide-react';
import clsx from 'clsx';
import type { MatchingResponse, MatchView } from '../../types';
import { formatLiters } from '../../lib/format';
import { Button } from '../ui/Button';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { DieselMap } from '../map/DieselMap';
import { CostBreakdown, MatchAllocation, MatchExplanation, MatchScorePanel } from './MatchSummary';
import { EmptyState } from '../ui/Feedback';

export function connectionFromMatch(m: MatchView) {
  return {
    match_id: m.id,
    status: m.status,
    operation_code: m.operation?.operation_code ?? null,
    total_liters: m.total_liters,
    score: m.score,
    destination: m.demand ? { name: m.demand.producer?.organization_name ?? m.demand.location_name, latitude: m.demand.latitude, longitude: m.demand.longitude } : null,
    origins: m.items.map((it) => ({
      name: it.supplier?.business_name ?? 'Proveedor',
      liters: it.allocated_liters,
      latitude: it.offer?.latitude ?? 0,
      longitude: it.offer?.longitude ?? 0,
      distance_km: it.distance_km,
    })),
  };
}

/** Resultado del motor de matching: combinación, score, costos, mapa y confirmación. */
export function MatchResultPanel({ result, onConfirm, confirming, canConfirm }: { result: MatchingResponse; onConfirm?: (matchId: string) => void; confirming?: boolean; canConfirm?: boolean }) {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const match = result.match;
  if (!match) {
    return (
      <EmptyState
        icon={<Target className="h-6 w-6" />}
        title="No se encontraron ofertas compatibles"
        description={`Se analizaron ${result.analyzedOffers} ofertas activas. Ninguna cumple fecha, radio o verificación. Ajusta la fecha requerida o vuelve a intentar más tarde.`}
      />
    );
  }
  const covered = match.total_liters >= (match.demand?.remaining_liters ?? match.total_liters);
  return (
    <div className="space-y-5 animate-fade-up">
      <div className="rounded-2xl bg-gradient-to-r from-brand-700 to-brand-600 p-5 text-white shadow-float sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuel-300">{covered ? 'Match óptimo encontrado' : 'Match parcial encontrado'}</p>
            <h2 className="mt-1 flex items-center gap-2 text-3xl font-extrabold">
              <Crosshair className="h-7 w-7 shrink-0 text-fuel-300" />
              {formatLiters(match.total_liters)} cubiertos
            </h2>
            <p className="mt-1 text-sm text-brand-100">
              {match.items.map((it) => `${formatLiters(it.allocated_liters)} → ${it.supplier?.business_name ?? 'Proveedor'}`).join('  ·  ')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-brand-200">Score</p>
            <p className="text-4xl font-extrabold text-fuel-300">{match.score}<span className="text-lg text-brand-200">/100</span></p>
          </div>
        </div>
        <p className="mt-3 text-xs text-brand-200">
          {result.analyzedOffers} ofertas analizadas · {result.feasibleOffers} viables · {match.items.length} proveedor{match.items.length > 1 ? 'es' : ''} combinado{match.items.length > 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Combinación de proveedores" subtitle="Matching parcial y multi-proveedor" />
          <CardBody>
            <MatchAllocation match={match} />
          </CardBody>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader title="Conexión en el mapa" subtitle="Proveedor → Productor (ruta aproximada)" />
          <CardBody>
            <DieselMap connections={[connectionFromMatch(match)]} highlightMatchId={match.id} className="h-72" showLegend={false} />
          </CardBody>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader title="¿Por qué esta combinación?" subtitle="Score explicable: 35% disponibilidad · 25% distancia · 20% precio · 10% volumen · 10% tiempo" />
          <CardBody className="space-y-5">
            <MatchScorePanel match={match} />
            <MatchExplanation match={match} />
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Costo total estimado" subtitle="Combustible + logística (valores simulados)" />
          <CardBody>
            <CostBreakdown match={match} />
            {canConfirm && onConfirm && (
              <Button className="mt-5 w-full" size="lg" variant="accent" loading={confirming} icon={<CheckCircle2 className="h-5 w-5" />} onClick={() => onConfirm(match.id)}>
                Confirmar match y crear operación
              </Button>
            )}
            {!canConfirm && match.operation && (
              <Link to={`/app/operations/${match.operation.id}`} className="mt-5 block">
                <Button className="w-full" variant="secondary">Ver operación {match.operation.operation_code}</Button>
              </Link>
            )}
          </CardBody>
        </Card>
      </div>

      {result.alternatives.length > 0 && (
        <div>
          <button onClick={() => setShowAlternatives((v) => !v)} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
            {showAlternatives ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showAlternatives ? 'Ocultar' : 'Ver'} {result.alternatives.length} combinaciones alternativas
          </button>
          {showAlternatives && (
            <div className="stagger mt-3 grid gap-4 md:grid-cols-3">
              {result.alternatives.map((alt, i) => (
                <div key={alt.id} className={clsx('card p-4')}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alternativa {i + 1}</span>
                    <span className="text-sm font-bold text-slate-700">{alt.score}/100</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{alt.items.map((it) => formatLiters(it.allocated_liters)).join(' + ')}</p>
                  <ul className="mt-1 space-y-0.5 text-xs text-slate-500">
                    {alt.items.map((it) => (
                      <li key={it.id}>{it.supplier?.business_name} · {it.distance_km} km</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-slate-600">
                    Total <span className="font-semibold">Bs {alt.estimated_total_cost.toLocaleString('es-BO')}</span> · ahorro est. {alt.savings_percent}%
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
