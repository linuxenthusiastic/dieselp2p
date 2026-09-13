import clsx from 'clsx';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={clsx('h-9 w-9', className)} aria-hidden>
      <rect width="64" height="64" rx="14" fill="#178a4a" />
      <path d="M20 14h16a6 6 0 0 1 6 6v6h3a5 5 0 0 1 5 5v13a4 4 0 0 1-8 0V33h-2v17H20z" fill="#fff" />
      <rect x="24" y="19" width="10" height="9" rx="1.5" fill="#f5b400" />
      <path d="M16 50h30" stroke="#f5b400" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className={clsx('text-lg font-extrabold tracking-tight', light ? 'text-white' : 'text-slate-900')}>
        Diesel<span className={light ? 'text-fuel-300' : 'text-brand-600'}>P2P</span>
      </span>
    </span>
  );
}

export function DemoTag({ className }: { className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-md border border-fuel-300 bg-fuel-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fuel-800', className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-fuel-500" />
      MVP demo — datos simulados
    </span>
  );
}
