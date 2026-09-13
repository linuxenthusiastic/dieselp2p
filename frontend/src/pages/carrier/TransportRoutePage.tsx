import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Circle, Leaf, MapPin, Truck } from 'lucide-react';
import clsx from 'clsx';
import { useTransport } from '../../hooks/queries';
import { Button, Card, CardBody, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton, StatusBadge } from '../../components/ui';
import { DieselMap } from '../../components/map/DieselMap';
import { formatBs, formatDateTime, formatKm, formatLiters, TRANSPORT_STATUS } from '../../lib/format';
import type { ReactNode } from 'react';
import type { MapConnection, TransportStatus } from '../../types';
import { TransportActions } from './transportActions';

const STEPS: Array<{ status: TransportStatus; label: string }> = [
  { status: 'PENDING', label: 'Pendiente' },
  { status: 'ASSIGNED', label: 'Asignado' },
  { status: 'IN_TRANSIT', label: 'En tránsito' },
  { status: 'DELIVERED', label: 'Entregado' },
];

export default function TransportRoutePage() {
  const { id } = useParams();
  const transport = useTransport();

  if (transport.isLoading) return <Skeleton className="h-[480px]" />;
  if (transport.isError) return <ErrorState retry={() => void transport.refetch()} />;
  const order = transport.data?.find((t) => t.id === id);
  if (!order) return <EmptyState icon={<Truck className="h-6 w-6" />} title="Transporte no encontrado" description="La orden no existe o no tienes acceso." action={<Link to="/app/transport"><Button size="sm" variant="outline">Volver</Button></Link>} />;

  const connection: MapConnection = {
    match_id: order.match_id,
    status: 'CONFIRMED',
    operation_code: order.operation_code,
    total_liters: order.liters,
    score: 0,
    destination: { name: order.destination_name, latitude: order.destination_latitude, longitude: order.destination_longitude },
    origins: [{ name: order.origin_name, liters: order.liters, latitude: order.origin_latitude, longitude: order.origin_longitude, distance_km: order.distance_km }],
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Transporte"
        title={order.operation_code ?? 'Ruta de transporte'}
        description="Ruta aproximada entre el punto de carga del proveedor y el productor."
        actions={
          <>
            <Link to="/app/transport"><Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />}>Volver</Button></Link>
            {order.operation_id && <Link to={`/app/operations/${order.operation_id}`}><Button variant="outline" icon={<Leaf className="h-4 w-4" />}>Ver operación</Button></Link>}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-5">
        <DieselMap connections={[connection]} highlightMatchId={order.match_id} className="h-[420px] lg:col-span-3" showLegend={false} />
        <Card className="lg:col-span-2">
          <CardHeader title="Detalle de la orden" action={<StatusBadge map={TRANSPORT_STATUS} value={order.status} />} />
          <CardBody className="space-y-5">
            <Stepper status={order.status} />
            <dl className="space-y-3 text-sm">
              <Row icon={<MapPin className="h-4 w-4 text-brand-600" />} label="Origen" value={order.origin_name} />
              <Row icon={<MapPin className="h-4 w-4 text-red-600" />} label="Destino" value={order.destination_name} />
              <Row label="Litros" value={formatLiters(order.liters)} />
              <Row label="Distancia" value={formatKm(order.distance_km)} />
              <Row label="Costo logístico estimado" value={formatBs(order.estimated_cost)} />
              <Row icon={<Truck className="h-4 w-4 text-blue-600" />} label="Transportista" value={order.carrier ? `${order.carrier.company_name} · ${order.carrier.vehicle_type}` : 'Sin asignar'} />
              <Row label="Última actualización" value={formatDateTime(order.updated_at)} />
            </dl>
            <div className="flex justify-end"><TransportActions order={order} size="md" /></div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="inline-flex items-center gap-1.5 text-slate-500">{icon}{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function Stepper({ status }: { status: TransportStatus }) {
  const idx = STEPS.findIndex((s) => s.status === status);
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((step, i) => {
        const done = i <= idx;
        return (
          <li key={step.status} className="flex flex-1 items-center gap-2 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <span className={clsx('flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs', done ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white text-slate-400', i === idx && 'ring-4 ring-brand-100')}>
                {done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2 w-2" />}
              </span>
              <span className={clsx('whitespace-nowrap text-[11px] font-medium', done ? 'text-brand-700' : 'text-slate-400')}>{step.label}</span>
            </div>
            {i < STEPS.length - 1 && <span className={clsx('mb-5 h-0.5 flex-1 rounded-full', i < idx ? 'bg-brand-500' : 'bg-slate-200')} />}
          </li>
        );
      })}
    </ol>
  );
}
