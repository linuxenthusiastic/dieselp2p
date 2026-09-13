import { Link } from 'react-router-dom';
import { Truck, Navigation, PackageCheck, Droplets, Route, Inbox, ArrowRight, MapPin } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useMe, useTransport } from '../../hooks/queries';
import { AnimatedStatCard, Card, CardBody, CardHeader, EmptyState, ErrorState, PageHeader, SkeletonCards, StatusBadge } from '../../components/ui';
import { formatBs, formatKm, formatLiters, formatNumber, TRANSPORT_STATUS } from '../../lib/format';
import type { CarrierSummaryStats, TransportView } from '../../types';
import { TransportActions } from './transportActions';

export default function CarrierDashboard() {
  const { session } = useAuth();
  const me = useMe();
  const transport = useTransport();
  const carrier = session?.carrier ?? null;

  if (me.isError) return <ErrorState message="No se pudo cargar tu resumen." retry={() => void me.refetch()} />;
  const stats = me.data?.role === 'carrier' ? (me.data as CarrierSummaryStats).totals : null;
  const orders = transport.data ?? [];
  const mine = orders.filter((t) => t.carrier_id === carrier?.id && t.status !== 'DELIVERED');
  const available = orders.filter((t) => t.status === 'PENDING');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Transportista"
        title={carrier?.company_name ?? 'Mi panel'}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1"><Truck className="h-4 w-4 text-slate-400" />{carrier?.vehicle_type ?? '—'} · {carrier ? formatLiters(carrier.capacity_liters) : '—'}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4 text-slate-400" />{carrier?.coverage_area ?? '—'}</span>
          </span>
        }
      />

      {me.isLoading || !stats ? (
        <SkeletonCards count={6} />
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatedStatCard label="Asignados" value={stats.assigned} format={formatNumber} icon={<Truck className="h-5 w-5" />} tone="blue" />
          <AnimatedStatCard label="En tránsito" value={stats.inTransit} format={formatNumber} icon={<Navigation className="h-5 w-5" />} tone="yellow" />
          <AnimatedStatCard label="Entregados" value={stats.delivered} format={formatNumber} icon={<PackageCheck className="h-5 w-5" />} tone="green" />
          <AnimatedStatCard label="Litros movidos" value={stats.litersMoved} format={formatLiters} icon={<Droplets className="h-5 w-5" />} tone="green" />
          <AnimatedStatCard label="Km recorridos" value={stats.kmDriven} format={formatKm} icon={<Route className="h-5 w-5" />} tone="neutral" />
          <AnimatedStatCard label="Pendientes cercanos" value={stats.pendingNearby} format={formatNumber} icon={<Inbox className="h-5 w-5" />} tone="neutral" />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Transportes asignados / en curso" subtitle="Actualiza el estado de cada entrega" />
          <CardBody>
            {transport.isLoading ? <SkeletonCards count={2} /> : mine.length === 0 ? (
              <EmptyState icon={<Truck className="h-6 w-6" />} title="Sin transportes en curso" description="Acepta un transporte disponible para comenzar." />
            ) : (
              <ul className="space-y-3">{mine.map((t) => <OrderCard key={t.id} order={t} />)}</ul>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Transportes disponibles" subtitle="Órdenes pendientes dentro de tu zona" action={<Link to="/app/transport" className="text-sm font-medium text-brand-700 hover:underline">Ver todos</Link>} />
          <CardBody>
            {transport.isLoading ? <SkeletonCards count={2} /> : available.length === 0 ? (
              <EmptyState icon={<Inbox className="h-6 w-6" />} title="No hay transportes pendientes" description="Cuando se confirme un match cerca de ti aparecerá aquí." />
            ) : (
              <ul className="space-y-3">{available.map((t) => <OrderCard key={t.id} order={t} />)}</ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: TransportView }) {
  return (
    <li className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-mono font-semibold text-brand-700">{order.operation_code ?? 'Sin operación'}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1 text-sm font-medium text-slate-900">
            <span className="truncate">{order.origin_name}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{order.destination_name}</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatLiters(order.liters)} · {formatKm(order.distance_km)} · {formatBs(order.estimated_cost)} estimado
          </p>
        </div>
        <StatusBadge map={TRANSPORT_STATUS} value={order.status} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <Link to={`/app/transport/${order.id}`} className="text-xs font-medium text-brand-700 hover:underline">Ver ruta</Link>
        <TransportActions order={order} />
      </div>
    </li>
  );
}
