import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Eye, RotateCcw, ScanSearch, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { Badge, Button, Card, CardBody, EmptyState, ErrorState, PageHeader, SkeletonCards, StatCard, StatusBadge } from '../../components/ui';
import { useAnomalies, useScanAnomalies, useUpdateAnomaly } from '../../hooks/queries';
import { ANOMALY_STATUS, ANOMALY_TYPE, relativeTime, riskTone, ROLE_LABELS } from '../../lib/format';
import type { AnomalyStatus, AnomalyType, AnomalyView } from '../../types';

const STATUSES: AnomalyStatus[] = ['OPEN', 'REVIEWED', 'DISMISSED'];
const TYPES = Object.keys(ANOMALY_TYPE) as AnomalyType[];
const barColor = { red: 'bg-red-500', yellow: 'bg-fuel-400', green: 'bg-brand-500', blue: 'bg-sky-500', gray: 'bg-slate-400' };

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx('rounded-full border px-3 py-1 text-xs font-medium transition', active ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}
    >
      {children}
    </button>
  );
}

function AnomalyCard({ a }: { a: AnomalyView }) {
  const update = useUpdateAnomaly();
  const tone = riskTone(a.risk_score);
  const setStatus = (status: AnomalyStatus, label: string) =>
    update.mutate({ id: a.id, status }, { onSuccess: () => toast.success(`Anomalía ${label}`), onError: (e) => toast.error(e.message) });
  return (
    <Card className="animate-fade-up">
      <CardBody className="pt-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <AlertTriangle className={clsx('h-4 w-4', tone === 'red' ? 'text-red-500' : tone === 'yellow' ? 'text-fuel-500' : 'text-brand-500')} />
                {ANOMALY_TYPE[a.type]}
              </span>
              <StatusBadge map={ANOMALY_STATUS} value={a.status} />
              {a.operation_code && <Badge tone="blue">{a.operation_code}</Badge>}
            </div>
            <p className="mt-1 text-sm text-slate-600">
              <span className="font-medium text-slate-800">{a.organization ?? '—'}</span>
              {a.profile && (
                <span className="text-slate-500">
                  {' '}· {a.profile.full_name} · {ROLE_LABELS[a.profile.role]}
                </span>
              )}
            </p>
            <p className="mt-2 text-sm text-slate-700">{a.description}</p>
            <p className="mt-2 text-xs text-slate-400">{relativeTime(a.created_at)}</p>
          </div>
          <div className="w-full shrink-0 lg:w-56">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Risk Score</p>
            <p className={clsx('text-2xl font-extrabold tabular-nums', tone === 'red' ? 'text-red-600' : tone === 'yellow' ? 'text-fuel-700' : 'text-brand-700')}>
              {a.risk_score}
              <span className="text-sm font-medium text-slate-400">/100</span>
            </p>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={clsx('h-full rounded-full transition-all duration-700', barColor[tone])} style={{ width: `${a.risk_score}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {a.status !== 'REVIEWED' && (
                <Button size="sm" variant="secondary" icon={<Eye className="h-3.5 w-3.5" />} loading={update.isPending} onClick={() => setStatus('REVIEWED', 'marcada como revisada')}>
                  Marcar revisada
                </Button>
              )}
              {a.status !== 'DISMISSED' && (
                <Button size="sm" variant="outline" icon={<XCircle className="h-3.5 w-3.5" />} loading={update.isPending} onClick={() => setStatus('DISMISSED', 'descartada')}>
                  Descartar
                </Button>
              )}
              {a.status !== 'OPEN' && (
                <Button size="sm" variant="ghost" icon={<RotateCcw className="h-3.5 w-3.5" />} loading={update.isPending} onClick={() => setStatus('OPEN', 'reabierta')}>
                  Reabrir
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default function AnomaliesPage() {
  const { data, isLoading, isError, refetch } = useAnomalies();
  const scan = useScanAnomalies();
  const [status, setStatus] = useState<AnomalyStatus | 'ALL'>('ALL');
  const [type, setType] = useState<AnomalyType | 'ALL'>('ALL');

  const list = useMemo(() => (data ?? []).filter((a) => (status === 'ALL' || a.status === status) && (type === 'ALL' || a.type === type)), [data, status, type]);
  const count = (s: AnomalyStatus) => (data ?? []).filter((a) => a.status === s).length;
  const avgRisk = data && data.length ? Math.round(data.reduce((s, a) => s + a.risk_score, 0) / data.length) : 0;

  return (
    <div>
      <PageHeader
        title="Anomalías"
        description="Patrones detectados sobre datos simulados; no implica conducta real. Cada evento puede revisarse o descartarse."
        actions={
          <Button
            icon={<ScanSearch className="h-4 w-4" />}
            loading={scan.isPending}
            onClick={() => scan.mutate(undefined, { onSuccess: (r) => toast.success(`Análisis completado: ${r.created} evento(s) nuevo(s)`), onError: (e) => toast.error(e.message) })}
          >
            Ejecutar análisis
          </Button>
        }
      />
      {isLoading && <SkeletonCards />}
      {isError && <ErrorState retry={() => void refetch()} />}
      {data && (
        <div className="space-y-5">
          <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Abiertas" value={count('OPEN')} icon={<AlertTriangle className="h-5 w-5" />} tone={count('OPEN') > 0 ? 'red' : 'neutral'} />
            <StatCard label="Revisadas" value={count('REVIEWED')} icon={<Eye className="h-5 w-5" />} tone="blue" />
            <StatCard label="Descartadas" value={count('DISMISSED')} icon={<CheckCircle2 className="h-5 w-5" />} tone="neutral" />
            <StatCard label="Risk promedio" value={`${avgRisk}/100`} tone={riskTone(avgRisk) === 'red' ? 'red' : riskTone(avgRisk) === 'yellow' ? 'yellow' : 'green'} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Chip active={status === 'ALL'} onClick={() => setStatus('ALL')}>Todas</Chip>
            {STATUSES.map((s) => (
              <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
                {ANOMALY_STATUS[s].label}
              </Chip>
            ))}
            <span className="mx-1 h-5 w-px bg-slate-200" />
            <Chip active={type === 'ALL'} onClick={() => setType('ALL')}>Todos los tipos</Chip>
            {TYPES.map((t) => (
              <Chip key={t} active={type === t} onClick={() => setType(t)}>
                {ANOMALY_TYPE[t]}
              </Chip>
            ))}
          </div>
          {list.length === 0 ? (
            <EmptyState title="Sin anomalías" description="No hay eventos que coincidan con los filtros seleccionados." />
          ) : (
            <div className="space-y-3">
              {list.map((a) => (
                <AnomalyCard key={a.id} a={a} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
