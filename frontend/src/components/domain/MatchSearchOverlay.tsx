import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Search, Calendar, Map, Layers, Target } from 'lucide-react';
import clsx from 'clsx';

interface Step {
  icon: typeof Search;
  label: (n: number | null) => string;
}

const STEPS: Step[] = [
  { icon: Search, label: () => 'Buscando ofertas…' },
  { icon: Layers, label: (n) => (n === null ? 'Ofertas encontradas' : `${n} ofertas encontradas`) },
  { icon: Calendar, label: () => 'Analizando disponibilidad' },
  { icon: Map, label: () => 'Calculando distancias' },
  { icon: Target, label: () => 'Optimizando combinación' },
];

/**
 * Secuencia visual "wow" durante la búsqueda del match.
 * Avanza los pasos con temporizador y espera a que `ready` sea true para cerrar.
 */
export function MatchSearchOverlay({ open, ready, analyzedOffers, onDone, liters }: { open: boolean; ready: boolean; analyzedOffers: number | null; onDone: () => void; liters: number }) {
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!open) {
      setStep(0);
      setFinished(false);
      return;
    }
    const timers = STEPS.map((_, i) => setTimeout(() => setStep(i + 1), 550 + i * 650));
    return () => timers.forEach(clearTimeout);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (step >= STEPS.length && ready) {
      setFinished(true);
      const t = setTimeout(() => onDoneRef.current(), 900);
      return () => clearTimeout(t);
    }
  }, [open, step, ready]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/85 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md animate-pop">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-fuel-300">Motor de matching</p>
        <h2 className="mt-2 text-center text-2xl font-extrabold text-white">Buscando la mejor combinación para {liters.toLocaleString('es-BO')} L</h2>
        <ol className="mt-8 space-y-3">
          {STEPS.map((s, i) => {
            const state = i < step ? 'done' : i === step ? 'active' : 'pending';
            return (
              <li
                key={i}
                className={clsx(
                  'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-500',
                  state === 'done' && 'border-brand-400/40 bg-brand-500/20 text-white',
                  state === 'active' && 'border-fuel-300/60 bg-white/10 text-white',
                  state === 'pending' && 'border-white/10 text-white/40',
                )}
              >
                <span className={clsx('flex h-7 w-7 items-center justify-center rounded-full', state === 'done' ? 'bg-brand-500 text-white' : state === 'active' ? 'bg-fuel-400 text-brand-950' : 'bg-white/10')}>
                  {state === 'done' ? <Check className="h-4 w-4" /> : state === 'active' ? <Loader2 className="h-4 w-4 animate-spin" /> : <s.icon className="h-3.5 w-3.5" />}
                </span>
                {s.label(i === 1 && state !== 'pending' ? analyzedOffers : null)}
              </li>
            );
          })}
        </ol>
        <div className={clsx('mt-8 text-center transition-all duration-500', finished ? 'scale-100 opacity-100' : 'scale-90 opacity-0')}>
          <span className="inline-flex items-center gap-2 rounded-full bg-fuel-400 px-5 py-2 text-base font-extrabold text-brand-950 shadow-float">
            <Check className="h-5 w-5" /> MATCH ENCONTRADO
          </span>
        </div>
      </div>
    </div>
  );
}
