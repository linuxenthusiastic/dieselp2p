import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { useOperations, useUpdateOperation } from '../../hooks/queries';
import { Badge, DataTable, EmptyState, ErrorState, PageHeader, Select, SkeletonTable, StatusBadge } from '../../components/ui';
import type { Column } from '../../components/ui';
import { OPERATION_STATUS, VERIFICATION_STATUS, formatDateTime, formatLiters } from '../../lib/format';
import type { OperationStatus, OperationView } from '../../types';

const STATUSES = Object.keys(OPERATION_STATUS) as OperationStatus[];

function AdminStatusSelect({ op }: { op: OperationView }) {
  const update = useUpdateOperation();
  return (
    <Select
      value={op.status}
      disabled={update.isPending}
      className="h-8 w-44 py-1 text-xs"
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation();
        update.mutate(
          { id: op.id, status: e.target.value },
          { onSuccess: () => toast.success(`${op.operation_code} → ${OPERATION_STATUS[e.target.value as OperationStatus].label}`), onError: (err) => toast.error(err.message) },
        );
      }}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {OPERATION_STATUS[s].label}
        </option>
      ))}
    </Select>
  );
}

export default function OperationsPage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useOperations();
  const [filter, setFilter] = useState<OperationStatus | 'ALL'>('ALL');

  const rows = useMemo(() => (data ?? []).filter((o) => filter === 'ALL' || o.status === filter), [data, filter]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: data?.length ?? 0 };
    for (const o of data ?? []) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [data]);

  const title = role === 'admin' ? 'Operaciones' : role === 'carrier' ? 'Mis entregas' : 'Mis operaciones';

  const columns: Column<OperationView>[] = [
    { key: 'code', header: 'Código', render: (o) => <span className="font-mono text-sm font-bold text-brand-800">{o.operation_code}</span> },
    { key: 'producer', header: 'Productor', render: (o) => o.producer?.organization_name ?? '—' },
    {
      key: 'suppliers',
      header: 'Proveedores',
      render: (o) => {
        const names = o.match?.items.map((it) => it.supplier?.business_name ?? 'Proveedor') ?? [];
        return (
          <div className="flex items-center gap-2">
            <span className="max-w-56 truncate">{names.join(', ') || '—'}</span>
            {names.length > 1 && <Badge tone="yellow">{names.length}</Badge>}
          </div>
        );
      },
    },
    { key: 'liters', header: 'Litros', align: 'right', render: (o) => <span className="font-semibold text-slate-900">{formatLiters(o.match?.total_liters ?? 0)}</span> },
    { key: 'carrier', header: 'Transportista', render: (o) => (o.carrier ? o.carrier.company_name : <span className="text-slate-400">Sin asignar</span>) },
    { key: 'status', header: 'Estado', render: (o) => (role === 'admin' ? <AdminStatusSelect op={o} /> : <StatusBadge map={OPERATION_STATUS} value={o.status} />) },
    { key: 'verification', header: 'Verificación', render: (o) => <StatusBadge map={VERIFICATION_STATUS} value={o.verification_status} /> },
    { key: 'updated', header: 'Actualizada', render: (o) => <span className="text-slate-500">{formatDateTime(o.updated_at)}</span> },
  ];

  return (
    <div>
      <PageHeader title={title} description="Cada operación agrupa demanda, proveedores y transporte con un código trazable y QR de verificación." />
      {isLoading ? (
        <SkeletonTable />
      ) : isError ? (
        <ErrorState retry={() => void refetch()} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon={<Leaf className="h-6 w-6" />} title="Aún no hay operaciones" description="Confirma un match para generar la primera operación trazable." />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {(['ALL', ...STATUSES] as Array<OperationStatus | 'ALL'>).map((s) => {
              const n = counts[s] ?? 0;
              if (s !== 'ALL' && n === 0) return null;
              return (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={clsx(
                    'rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition',
                    filter === s ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
                  )}
                >
                  {s === 'ALL' ? 'Todas' : OPERATION_STATUS[s].label} <span className="opacity-70">({n})</span>
                </button>
              );
            })}
          </div>
          <DataTable columns={columns} rows={rows} onRowClick={(o) => navigate(`/app/operations/${o.id}`)} emptyMessage="No hay operaciones con este estado" />
        </>
      )}
    </div>
  );
}
