import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Truck, PlayCircle, PackageCheck, FastForward, Clock, PartyPopper } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAssignCarrier, useCarriers, useOperation, useSimulateNextStep, useUpdateOperation, useUpdateTransportStatus } from '../../hooks/queries';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { ErrorState, Skeleton } from '../../components/ui/Feedback';
import { Field, Select } from '../../components/ui/Field';
import { DieselMap } from '../../components/map/DieselMap';
import { connectionFromMatch } from '../../components/domain/MatchResultPanel';
import { OperationQr } from '../../components/domain/OperationQr';
import { OperationTimeline } from '../../components/domain/OperationTimeline';
import { CostBreakdown, MatchAllocation } from '../../components/domain/MatchSummary';
import { OPERATION_STATUS, TRANSPORT_STATUS, formatBs, formatDateTime, formatKm, formatLiters } from '../../lib/format';
import type { OperationStatus, OperationView } from '../../types';

export default function OperationDetailPage() {
  const { id } = useParams();
  const { role, session } = useAuth();
  const { data: op, isLoading, isError, refetch } = useOperation(id);
  const { data: carriers } = useCarriers();
  const assign = useAssignCarrier();
  const updateTransport = useUpdateTransportStatus();
  const updateOperation = useUpdateOperation();
  const simulate = useSimulateNextStep();
  const [carrierId, setCarrierId] = useState('');

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !op) return <ErrorState retry={() => refetch()} />;

  const liters = op.match?.total_liters ?? 0;
  const eligible = (carriers ?? []).filter((c) => c.capacity_liters * 2 >= liters);
  const canAssign = op.status === 'CREATED' && (role === 'producer' || role === 'admin');
  const isCarrier = role === 'carrier' && session?.carrier?.id === op.carrier?.id;

  const doAssign = async () => {
    if (!carrierId) return toast.error('Selecciona un transportista');
    try {
      await assign.mutateAsync({ match_id: op.match_id, carrier_id: carrierId });
      toast.success('Transportista asignado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo asignar');
    }
  };

  const advanceAll = async (status: 'IN_TRANSIT' | 'DELIVERED') => {
    try {
      for (const t of op.transports) {
        if ((status === 'IN_TRANSIT' && t.status === 'ASSIGNED') || (status === 'DELIVERED' && t.status === 'IN_TRANSIT')) {
          await updateTransport.mutateAsync({ id: t.id, status });
        }
      }
      toast.success(status === 'IN_TRANSIT' ? 'Operación en tránsito' : 'Operación entregada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar');
    }
  };

  return (
    <div>
      <Link to="/app/operations" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Operaciones
      </Link>
      <PageHeader
        eyebrow="Trazabilidad"
        title={op.operation_code}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {op.producer?.organization_name} · {formatLiters(liters)} <StatusBadge map={OPERATION_STATUS} value={op.status} />
            <span className="text-xs">actualizada {formatDateTime(op.updated_at)}</span>
          </span>
        }
        actions={
          <>
            {isCarrier && op.status === 'ASSIGNED' && (
              <Button variant="accent" icon={<PlayCircle className="h-4 w-4" />} loading={updateTransport.isPending} onClick={() => advanceAll('IN_TRANSIT')}>
                Iniciar tránsito
              </Button>
            )}
            {isCarrier && op.status === 'IN_TRANSIT' && (
              <Button icon={<PackageCheck className="h-4 w-4" />} loading={updateTransport.isPending} onClick={() => advanceAll('DELIVERED')}>
                Marcar entregada
              </Button>
            )}
            {role === 'admin' && (
              <Select
                value={op.status}
                className="w-48"
                onChange={async (e) => {
                  try {
                    await updateOperation.mutateAsync({ id: op.id, status: e.target.value as OperationStatus });
                    toast.success('Estado actualizado (demo)');
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Error');
                  }
                }}
              >
                {(Object.keys(OPERATION_STATUS) as OperationStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {OPERATION_STATUS[s].label}
                  </option>
                ))}
              </Select>
            )}
          </>
        }
      />

      <Card className="mb-5 p-5">
        <OperationTimeline status={op.status} />
      </Card>

      <NextStepPanel
        operation={op}
        canSimulate={role === 'producer' || role === 'carrier' || role === 'admin'}
        pending={simulate.isPending}
        onSimulate={async () => {
          try {
            const next = await simulate.mutateAsync(op.id);
            toast.success(`Operación ${OPERATION_STATUS[next.status].label.toLowerCase()}`);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'No se pudo avanzar la operación');
          }
        }}
      />

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-2">
          <OperationQr operation={op} />
          <Card>
            <CardHeader title="Transporte" subtitle={op.carrier ? `${op.carrier.company_name} · ${op.carrier.vehicle_type}` : 'Sin transportista asignado'} />
            <CardBody className="space-y-3">
              {canAssign && (
                <div className="space-y-3 rounded-xl bg-brand-50 p-3">
                  <Field label="Asignar transportista" hint="Se muestran transportistas con capacidad compatible.">
                    <Select value={carrierId} onChange={(e) => setCarrierId(e.target.value)}>
                      <option value="">Selecciona…</option>
                      {eligible.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.company_name} · {formatLiters(c.capacity_liters)} · {c.coverage_area}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Button className="w-full" icon={<Truck className="h-4 w-4" />} loading={assign.isPending} onClick={doAssign}>
                    Asignar transportista
                  </Button>
                </div>
              )}
              {op.carrier && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Info label="Capacidad" value={formatLiters(op.carrier.capacity_liters)} />
                  <Info label="Cobertura" value={op.carrier.coverage_area} />
                </div>
              )}
              <ul className="divide-y divide-slate-100 text-sm">
                {op.transports.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">{t.origin_name}</p>
                      <p className="text-xs text-slate-500">
                        {formatLiters(t.liters)} · {formatKm(t.distance_km)} · {formatBs(t.estimated_cost)}
                      </p>
                    </div>
                    <StatusBadge map={TRANSPORT_STATUS} value={t.status} />
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
        <div className="space-y-5 lg:col-span-3">
          <Card>
            <CardHeader title="Ruta" subtitle="Proveedor(es) → Productor" />
            <CardBody>{op.match && <DieselMap connections={[connectionFromMatch(op.match)]} highlightMatchId={op.match.id} className="h-72" showLegend={false} />}</CardBody>
          </Card>
          {op.match && (
            <div className="grid gap-5 md:grid-cols-2">
              <Card>
                <CardHeader title="Proveedores" />
                <CardBody>
                  <MatchAllocation match={op.match} compact />
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Costos estimados" />
                <CardBody>
                  <CostBreakdown match={op.match} />
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  );
}

/**
 * Explica qué falta para que la operación avance y ofrece un botón para
 * simular ese paso sin cambiar de usuario. Es una ayuda de demostración:
 * en una operación real cada actor ejecuta su propio paso.
 */
function NextStepPanel({
  operation,
  canSimulate,
  pending,
  onSimulate,
}: {
  operation: OperationView;
  canSimulate: boolean;
  pending: boolean;
  onSimulate: () => void;
}) {
  const step = operation.next_step;
  if (!step) return null;

  if (!step.action) {
    return (
      <Card className="mb-5 flex flex-wrap items-center gap-3 border-brand-200 bg-brand-50/60 p-5">
        <PartyPopper className="h-5 w-5 shrink-0 text-brand-600" />
        <p className="text-sm font-medium text-brand-900">
          Operación entregada y trazada de extremo a extremo. El QR sigue siendo verificable públicamente.
        </p>
      </Card>
    );
  }

  const icon =
    step.action === 'ASSIGN_CARRIER' ? <Truck className="h-4 w-4" /> : step.action === 'START_TRANSIT' ? <PlayCircle className="h-4 w-4" /> : <PackageCheck className="h-4 w-4" />;

  return (
    <Card className="mb-5 border-fuel-200 bg-fuel-50/50 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fuel-100 text-fuel-700">
            <Clock className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Siguiente paso: {step.label.toLowerCase()}</p>
            <p className="mt-0.5 text-sm text-slate-600">
              En una operación real lo ejecuta {step.actor}. Aquí puedes simularlo para continuar la demostración.
            </p>
          </div>
        </div>
        {canSimulate && (
          <Button variant="accent" className="shrink-0" loading={pending} icon={<FastForward className="h-4 w-4" />} onClick={onSimulate}>
            Simular siguiente paso
          </Button>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-fuel-200/70 pt-3 text-xs text-slate-500">
        {icon}
        <span>
          {step.label} → la operación pasará a <b className="text-slate-700">{step.nextStatus ? OPERATION_STATUS[step.nextStatus].label : '—'}</b>
        </span>
      </div>
    </Card>
  );
}
