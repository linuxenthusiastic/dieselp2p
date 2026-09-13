import { ArrowRight, Fuel, Truck, Wallet, TrendingDown } from 'lucide-react';
import clsx from 'clsx';
import type { MatchView } from '../../types';
import { formatBs, formatKm, formatLiters, formatPrice } from '../../lib/format';
import { ScoreBreakdownBars, ScoreRing } from './ScoreBreakdown';

/** Desglose visual de un match: combinación de proveedores, costos, ahorro y score. */
export function MatchAllocation({ match, compact }: { match: MatchView; compact?: boolean }) {
  const total = match.total_liters;
  return (
    <div className="space-y-2">
      {match.items.map((it, idx) => {
        const pct = total > 0 ? Math.round((it.allocated_liters / total) * 100) : 0;
        return (
          <div key={it.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 animate-fade-up" style={{ animationDelay: `${idx * 90}ms` }}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">{String.fromCharCode(65 + idx)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-slate-900">{it.supplier?.business_name ?? 'Proveedor'}</p>
                <p className="shrink-0 text-sm font-bold text-brand-700">{formatLiters(it.allocated_liters)}</p>
              </div>
              {!compact && (
                <p className="text-xs text-slate-500">
                  {it.offer?.location_name} · {formatKm(it.distance_km)} · {formatPrice(it.price_per_liter)}
                </p>
              )}
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-brand-500 transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        );
      })}
      <div className="flex items-center justify-between rounded-xl bg-brand-600 px-3 py-2.5 text-white">
        <span className="text-sm font-medium">{match.items.map((it) => formatLiters(it.allocated_liters).replace(' L', '')).join(' + ')} L</span>
        <span className="inline-flex items-center gap-1 text-sm font-bold">
          <ArrowRight className="h-4 w-4" /> {formatLiters(total)}
        </span>
      </div>
    </div>
  );
}

export function CostBreakdown({ match, className }: { match: MatchView; className?: string }) {
  const rows = [
    { icon: <Fuel className="h-4 w-4" />, label: 'Combustible', value: formatBs(match.total_fuel_cost) },
    { icon: <Truck className="h-4 w-4" />, label: 'Transporte estimado', value: formatBs(match.estimated_transport_cost) },
  ];
  return (
    <div className={clsx('space-y-2', className)}>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-2 text-slate-600">
            <span className="text-slate-400">{r.icon}</span>
            {r.label}
          </span>
          <span className="font-semibold tabular-nums text-slate-900">{r.value}</span>
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-sm">
        <span className="inline-flex items-center gap-2 font-semibold text-slate-800">
          <Wallet className="h-4 w-4 text-slate-400" />
          Costo total estimado
        </span>
        <span className="text-base font-bold tabular-nums text-slate-900">{formatBs(match.estimated_total_cost)}</span>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-fuel-50 px-3 py-2 text-sm ring-1 ring-inset ring-fuel-200">
        <span className="inline-flex items-center gap-2 font-semibold text-fuel-800">
          <TrendingDown className="h-4 w-4" />
          Ahorro estimado
        </span>
        <span className="text-right">
          <span className="block text-base font-extrabold text-fuel-800">{formatBs(match.estimated_savings)}</span>
          <span className="text-xs font-medium text-fuel-700">{match.savings_percent}% vs. referencia {formatBs(match.reference_cost)}</span>
        </span>
      </div>
    </div>
  );
}

export function MatchScorePanel({ match }: { match: MatchView }) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      <div className="flex flex-col items-center gap-1">
        <ScoreRing score={match.score} size={112} />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Match score</span>
      </div>
      <div className="flex-1">
        <ScoreBreakdownBars breakdown={match.score_breakdown} />
      </div>
    </div>
  );
}

export function MatchExplanation({ match }: { match: MatchView }) {
  return (
    <ul className="space-y-1.5 text-sm text-slate-600">
      {match.explanation.map((line, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}
