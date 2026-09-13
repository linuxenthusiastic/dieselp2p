import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck } from 'lucide-react';
import type { OperationView } from '../../types';
import { formatLiters, OPERATION_STATUS } from '../../lib/format';
import { StatusBadge } from '../ui/Badge';

/** Tarjeta de trazabilidad con QR que enlaza a la verificación pública. */
export function OperationQr({ operation }: { operation: OperationView }) {
  const url = `${window.location.origin}/verify/${operation.qr_token}`;
  const parties = [
    { label: 'Productor', name: operation.producer?.organization_name ?? '—', ok: true },
    ...(operation.match?.items.map((it) => ({ label: 'Proveedor', name: it.supplier?.business_name ?? '—', ok: true })) ?? []),
    { label: 'Transportista', name: operation.carrier?.company_name ?? 'Pendiente', ok: Boolean(operation.carrier) },
  ];
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between bg-brand-700 px-5 py-3 text-white">
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-fuel-300" /> Trazabilidad
        </span>
        <span className="font-mono text-sm font-bold tracking-wider">{operation.operation_code}</span>
      </div>
      <div className="flex flex-col gap-5 p-5 sm:flex-row">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <div className="rounded-xl border border-slate-200 bg-white p-2">
            <QRCodeSVG value={url} size={132} level="M" fgColor="#0d4729" />
          </div>
          <span className="text-[11px] text-slate-500">Escanea para verificar</span>
        </div>
        <div className="flex-1 space-y-3">
          <ul className="space-y-1.5">
            {parties.map((p, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{p.label}</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                  {p.name}
                  <span className={p.ok ? 'text-brand-600' : 'text-slate-300'}>✓</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-2xl font-extrabold text-slate-900">{formatLiters(operation.match?.total_liters ?? 0)}</span>
            <StatusBadge map={OPERATION_STATUS} value={operation.status} />
          </div>
        </div>
      </div>
    </div>
  );
}
