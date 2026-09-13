import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Inbox } from 'lucide-react';

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-lg bg-slate-200/70', className)} />;
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-32" />
          <Skeleton className="mt-2 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/5" />
          <Skeleton className="ml-auto h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">{icon ?? <Inbox className="h-6 w-6" />}</div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, retry }: { message?: string; retry?: () => void }) {
  return (
    <div className="card border-red-200 bg-red-50/50 px-6 py-8 text-center">
      <p className="text-sm font-medium text-red-700">{message ?? 'Ocurrió un error al cargar los datos.'}</p>
      {retry && (
        <button onClick={retry} className="mt-3 text-sm font-medium text-red-700 underline underline-offset-2">
          Reintentar
        </button>
      )}
    </div>
  );
}
