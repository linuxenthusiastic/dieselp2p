import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { api } from '../../lib/api';
import type { PublicVerification } from '../../types';
import { formatDateTime, formatLiters, OPERATION_STATUS, VERIFICATION_STATUS } from '../../lib/format';
import { StatusBadge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Feedback';

/** Verificación pública de una operación a partir del token del QR. */
export default function VerifyPage() {
  const { token } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['verify', token],
    queryFn: () => api<PublicVerification>(`/operations/verify/${token}`, { token: null }),
    enabled: Boolean(token),
    retry: false,
  });

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      {isLoading ? (
        <div className="card p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
        </div>
      ) : isError || !data ? (
        <div className="card p-8 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-red-500" />
          <h1 className="mt-3 text-xl font-bold text-slate-900">Operación no encontrada</h1>
          <p className="mt-1 text-sm text-slate-500">El código QR no corresponde a una operación registrada en la simulación.</p>
        </div>
      ) : (
        <div className="card overflow-hidden animate-fade-up">
          <div className="flex items-center gap-3 bg-brand-700 px-6 py-4 text-white">
            <ShieldCheck className="h-6 w-6 text-fuel-300" />
            <div>
              <p className="text-xs uppercase tracking-wider text-brand-200">Operación verificada</p>
              <p className="font-mono text-lg font-bold">{data.operation_code}</p>
            </div>
          </div>
          <div className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-extrabold text-slate-900">{formatLiters(data.total_liters)}</span>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge map={OPERATION_STATUS} value={data.status} />
                <StatusBadge map={VERIFICATION_STATUS} value={data.verification_status} />
              </div>
            </div>
            <dl className="divide-y divide-slate-100 text-sm">
              <Row label="Productor" value={data.producer ?? '—'} />
              {data.suppliers.map((s, i) => (
                <Row key={i} label={`Proveedor ${String.fromCharCode(65 + i)}`} value={`${s.name} · ${formatLiters(s.liters)}`} />
              ))}
              <Row label="Transportista" value={data.carrier ?? 'Pendiente'} ok={Boolean(data.carrier)} />
              <Row label="Creada" value={formatDateTime(data.created_at)} />
              <Row label="Actualizada" value={formatDateTime(data.updated_at)} />
            </dl>
            <p className="rounded-lg bg-fuel-50 px-3 py-2 text-xs text-fuel-800">{data.disclaimer}</p>
          </div>
        </div>
      )}
      <p className="mt-6 text-center text-sm text-slate-500">
        <Link to="/" className="font-semibold text-brand-700 hover:underline">
          Volver a DieselP2P
        </Link>
      </p>
    </div>
  );
}

function Row({ label, value, ok = true }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="inline-flex items-center gap-1.5 font-medium text-slate-800">
        {value} <span className={ok ? 'text-brand-600' : 'text-slate-300'}>✓</span>
      </dd>
    </div>
  );
}
