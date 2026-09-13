import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('card', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex items-start justify-between gap-4 px-5 pt-5 pb-3', className)}>
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('px-5 pb-5', className)}>{children}</div>;
}
