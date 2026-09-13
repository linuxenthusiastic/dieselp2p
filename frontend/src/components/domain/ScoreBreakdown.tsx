import clsx from 'clsx';
import type { ScoreBreakdown as Breakdown } from '../../types';

const ROWS: Array<{ key: keyof Breakdown; label: string; max: number }> = [
  { key: 'availability', label: 'Disponibilidad', max: 35 },
  { key: 'distance', label: 'Distancia', max: 25 },
  { key: 'price', label: 'Precio', max: 20 },
  { key: 'volume', label: 'Volumen', max: 10 },
  { key: 'time', label: 'Tiempo', max: 10 },
];

export function ScoreRing({ score, size = 96, className }: { score: number; size?: number; className?: string }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const tone = score >= 85 ? '#178a4a' : score >= 65 ? '#f5b400' : '#dc2626';
  return (
    <div className={clsx('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8f0" strokeWidth="8" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={tone} strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)' }} />
      </svg>
      <div className="absolute text-center">
        <span className="block text-2xl font-extrabold leading-none text-slate-900">{score}</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">/100</span>
      </div>
    </div>
  );
}

export function ScoreBreakdownBars({ breakdown, className }: { breakdown: Breakdown; className?: string }) {
  return (
    <div className={clsx('space-y-2.5', className)}>
      {ROWS.map((row) => {
        const v = breakdown[row.key];
        const pct = Math.round((v / row.max) * 100);
        return (
          <div key={row.key}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">{row.label}</span>
              <span className="tabular-nums font-semibold text-slate-800">
                {v}/{row.max}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={clsx('h-full rounded-full transition-all duration-700', pct >= 85 ? 'bg-brand-500' : pct >= 60 ? 'bg-fuel-400' : 'bg-red-400')} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
