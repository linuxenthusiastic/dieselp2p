import clsx from 'clsx';
import type { ReactNode } from 'react';
import type { Tone } from '../../lib/format';

const tones: Record<Tone, string> = {
  green: 'bg-brand-50 text-brand-700 ring-brand-600/20',
  yellow: 'bg-fuel-50 text-fuel-800 ring-fuel-600/25',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  gray: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

export function Badge({ tone = 'gray', children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap', tones[tone], className)}>
      {dot && <span className={clsx('h-1.5 w-1.5 rounded-full', { green: 'bg-brand-500', yellow: 'bg-fuel-500', blue: 'bg-sky-500', red: 'bg-red-500', gray: 'bg-slate-400' }[tone])} />}
      {children}
    </span>
  );
}

export function StatusBadge({ map, value }: { map: Record<string, { label: string; tone: Tone }>; value: string }) {
  const s = map[value] ?? { label: value, tone: 'gray' as Tone };
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}
