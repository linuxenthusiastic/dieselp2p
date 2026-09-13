import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500 shadow-sm',
  accent: 'bg-fuel-400 text-brand-950 hover:bg-fuel-500 focus-visible:ring-fuel-500 shadow-sm font-semibold',
  secondary: 'bg-brand-50 text-brand-800 hover:bg-brand-100 focus-visible:ring-brand-400',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-brand-400',
  ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-300',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});
