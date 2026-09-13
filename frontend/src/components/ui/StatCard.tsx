import type { ReactNode } from 'react';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: 'green' | 'yellow' | 'neutral' | 'red' | 'blue';
  className?: string;
}

const toneClasses = {
  green: 'bg-brand-50 text-brand-700',
  yellow: 'bg-fuel-50 text-fuel-700',
  neutral: 'bg-slate-100 text-slate-600',
  red: 'bg-red-50 text-red-600',
  blue: 'bg-sky-50 text-sky-700',
};

/** Anima números al cambiar (contador suave). */
export function useAnimatedNumber(target: number, duration = 700) {
  const [value, setValue] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const from = prev.current;
    const to = target;
    if (from === to) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export function StatCard({ label, value, hint, icon, tone = 'neutral', className }: StatCardProps) {
  return (
    <div className={clsx('card flex items-start gap-4 p-5', className)}>
      {icon && <div className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', toneClasses[tone])}>{icon}</div>}
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 break-words">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

export function AnimatedStatCard({ value, format, ...rest }: Omit<StatCardProps, 'value'> & { value: number; format: (n: number) => string }) {
  const animated = useAnimatedNumber(value);
  return <StatCard {...rest} value={format(animated)} />;
}
