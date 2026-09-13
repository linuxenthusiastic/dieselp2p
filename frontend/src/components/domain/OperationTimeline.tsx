import { Check, Circle } from 'lucide-react';
import clsx from 'clsx';
import type { OperationStatus } from '../../types';

const STEPS: Array<{ status: OperationStatus; label: string }> = [
  { status: 'CREATED', label: 'Creada' },
  { status: 'ASSIGNED', label: 'Transporte asignado' },
  { status: 'IN_TRANSIT', label: 'En tránsito' },
  { status: 'DELIVERED', label: 'Entregada' },
];

export function OperationTimeline({ status }: { status: OperationStatus }) {
  const idx = STEPS.findIndex((s) => s.status === status);
  const cancelled = status === 'CANCELLED';
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((step, i) => {
        const done = !cancelled && i <= idx;
        const current = !cancelled && i === idx;
        return (
          <li key={step.status} className="flex flex-1 items-center gap-2 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <span
                className={clsx(
                  'flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs transition-colors',
                  done ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white text-slate-400',
                  current && 'ring-4 ring-brand-100',
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2 w-2" />}
              </span>
              <span className={clsx('whitespace-nowrap text-[11px] font-medium', done ? 'text-brand-700' : 'text-slate-400')}>{step.label}</span>
            </div>
            {i < STEPS.length - 1 && <span className={clsx('mb-5 h-0.5 flex-1 rounded-full', i < idx && !cancelled ? 'bg-brand-500' : 'bg-slate-200')} />}
          </li>
        );
      })}
    </ol>
  );
}
