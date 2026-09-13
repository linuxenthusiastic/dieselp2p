import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Truck } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../hooks/useAuth';
import { useTransport } from '../../hooks/queries';
import { DataTable, EmptyState, ErrorState, PageHeader, SkeletonTable, StatusBadge, type Column } from '../../components/ui';
import { formatBs, formatKm, formatLiters, TRANSPORT_STATUS } from '../../lib/format';
import type { TransportStatus, TransportView } from '../../types';
import { TransportActions } from '../carrier/transportActions';

const FILTERS: Array<{ key: TransportStatus | 'ALL'; label: string }> = [
  { key: 'ALL', label: 'Todos' },
  { key: 'PENDING', label: 'Pendiente' },
  { key: 'ASSIGNED', label: 'Asignado' },
  { key: 'IN_TRANSIT', label: 'En tránsito' },
  { key: 'DELIVERED', label: 'Entregado' },
];

export default function TransportPage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const transport = useTransport();
  const [filter, setFilter] = useState<TransportStatus | 'ALL'>('ALL');
  const rows = (transport.data ?? []).filter((t) => filter === 'ALL' || t.status === filter);

  const columns: Column<TransportView>[] = [
    { key: 'op', header: 'Operación', render: (t) => <span className="font-mono text-xs font-semibold text-brand-700">{t.operation_code ?? '—'}</span> },
    {
      key: 'route',
      header: 'Origen → Destino',
      render: (t) => (
        <span className="flex items-center gap-1 text-slate-800">
          <span className="max-w-[180px] truncate">{t.origin_name}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="max-w-[180px] truncate">{t.destination_name}</span>
        </span>
      ),
    },
    { key: 'liters', header: 'Litros', align: 'right', render: (t) => <span className="font-semibold tabular-nums">{formatLiters(t.liters)}</span> },
    { key: 'km', header: 'Distancia', align: 'right', render: (t) => formatKm(t.distance_km) },
    { key: 'cost', header: 'Costo est.', align: 'right', render: (t) => <span className="tabular-nums">{formatBs(t.estimated_cost)}</span> },
    { key: 'carrier', header: 'Transportista', render: (t) => t.carrier?.company_name ?? <span className="text-slate-400">Sin asignar</span> },
    { key: 'status', header: 'Estado', render: (t) => <StatusBadge map={TRANSPORT_STATUS} value={t.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (t) => (
        <span onClick={(e) => e.stopPropagation()}>
          <TransportActions order={t} />
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={role === 'admin' ? 'Administración' : 'Transportista'}
        title="Transporte"
        description={role === 'admin' ? 'Todas las órdenes de transporte generadas por matches confirmados.' : 'Tus transportes y órdenes pendientes cerca de tu zona.'}
      />
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={clsx('rounded-full px-3 py-1 text-xs font-medium transition', filter === f.key ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50')}
          >
            {f.label}
          </button>
        ))}
      </div>
      {transport.isLoading ? (
        <SkeletonTable />
      ) : transport.isError ? (
        <ErrorState retry={() => void transport.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Truck className="h-6 w-6" />} title="Sin órdenes de transporte" description="No hay transportes con este filtro." />
      ) : (
        <DataTable columns={columns} rows={rows} onRowClick={(t) => navigate(`/app/transport/${t.id}`)} />
      )}
    </div>
  );
}
