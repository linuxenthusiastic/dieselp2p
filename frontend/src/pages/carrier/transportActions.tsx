import { toast } from 'sonner';
import { CheckCircle2, Navigation, PackageCheck } from 'lucide-react';
import { Button } from '../../components/ui';
import { useAssignCarrier, useUpdateTransportStatus } from '../../hooks/queries';
import { useAuth } from '../../hooks/useAuth';
import { ApiError } from '../../lib/api';
import type { TransportView } from '../../types';

/** Botones de acción sobre una orden de transporte según su estado y el rol. */
export function TransportActions({ order, size = 'sm' }: { order: TransportView; size?: 'sm' | 'md' }) {
  const { session, role } = useAuth();
  const assign = useAssignCarrier();
  const update = useUpdateTransportStatus();
  const carrierId = session?.carrier?.id ?? null;
  const isMine = order.carrier_id !== null && order.carrier_id === carrierId;
  const canAct = role === 'admin' || isMine;
  const busy = (assign.isPending && assign.variables?.match_id === order.match_id) || (update.isPending && update.variables?.id === order.id);

  const fail = (err: unknown) => toast.error(err instanceof ApiError ? err.message : 'No se pudo actualizar el transporte');

  const accept = async () => {
    if (!carrierId) return;
    try {
      await assign.mutateAsync({ match_id: order.match_id, carrier_id: carrierId });
      toast.success('Transporte aceptado', { description: `${order.origin_name} → ${order.destination_name}` });
    } catch (e) {
      fail(e);
    }
  };
  const setStatus = async (status: 'IN_TRANSIT' | 'DELIVERED') => {
    try {
      await update.mutateAsync({ id: order.id, status });
      toast.success(status === 'IN_TRANSIT' ? 'Transporte en tránsito' : 'Entrega registrada');
    } catch (e) {
      fail(e);
    }
  };

  if (order.status === 'PENDING' && role === 'carrier' && carrierId) {
    return <Button size={size} variant="accent" loading={busy} onClick={() => void accept()} icon={<CheckCircle2 className="h-4 w-4" />}>Aceptar transporte</Button>;
  }
  if (order.status === 'ASSIGNED' && canAct) {
    return <Button size={size} loading={busy} onClick={() => void setStatus('IN_TRANSIT')} icon={<Navigation className="h-4 w-4" />}>Iniciar tránsito</Button>;
  }
  if (order.status === 'IN_TRANSIT' && canAct) {
    return <Button size={size} variant="secondary" loading={busy} onClick={() => void setStatus('DELIVERED')} icon={<PackageCheck className="h-4 w-4" />}>Marcar entregado</Button>;
  }
  return null;
}
