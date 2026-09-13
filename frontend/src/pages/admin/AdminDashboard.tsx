import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, Droplets, Fuel, Leaf, Package, RefreshCw, TrendingDown, ArrowRight } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { AnimatedStatCard, Badge, Button, Card, CardBody, CardHeader, DemoTag, ErrorState, SkeletonCards } from '../../components/ui';
import { useAnomalies, useDashboard, useResetDemo } from '../../hooks/queries';
import { ANOMALY_TYPE, formatBs, formatDate, formatLiters, formatNumber, OPERATION_STATUS, riskTone } from '../../lib/format';
import type { DashboardMetrics } from '../../types';

const GREEN = '#178a4a';
const YELLOW = '#f5b400';
const PIE_COLORS = ['#178a4a', '#f5b400', '#43c07d', '#94a3b8', '#ffd24a', '#0d4729', '#cbd5e1'];
const AXIS = { fontSize: 12, fill: '#64748b' };
const tooltipStyle = { borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 12px 32px -12px rgb(16 40 28 / 0.25)', fontSize: 12 };
const litersFmt = (value: unknown) => `${formatNumber(Number(value ?? 0))} L`;
const shortDate = (d: string) => formatDate(d).slice(0, 5);

function ChartCard({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader title={title} subtitle={subtitle} />
      <CardBody>
        <div className="h-64">{children}</div>
      </CardBody>
    </Card>
  );
}

function Charts({ data }: { data: DashboardMetrics }) {
  const totalActivity = data.byActivity.reduce((s, a) => s + a.litros, 0);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Oferta vs demanda por zona" subtitle="Litros activos en el mercado (simulación)">
        <ResponsiveContainer>
          <BarChart data={data.supplyVsDemand} barGap={4} margin={{ bottom: 28 }}>
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="zone"
              tick={{ ...AXIS, textAnchor: 'end' }}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-30}
              height={52}
              tickFormatter={(z: string) => (z.length > 12 ? `${z.slice(0, 11)}…` : z)}
            />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatNumber(v)} width={56} />
            <Tooltip contentStyle={tooltipStyle} formatter={litersFmt} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="oferta" name="Oferta" fill={GREEN} radius={[6, 6, 0, 0]} />
            <Bar dataKey="demanda" name="Demanda" fill={YELLOW} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Litros conectados por día" subtitle="Matches confirmados">
        <ResponsiveContainer>
          <AreaChart data={data.litersPerDay}>
            <defs>
              <linearGradient id="litersGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GREEN} stopOpacity={0.35} />
                <stop offset="100%" stopColor={GREEN} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={shortDate} minTickGap={24} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatNumber(v)} width={56} />
            <Tooltip contentStyle={tooltipStyle} formatter={litersFmt} labelFormatter={(l) => formatDate(String(l))} />
            <Area type="monotone" dataKey="litros" name="Litros" stroke={GREEN} strokeWidth={2.5} fill="url(#litersGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Ahorro estimado acumulado" subtitle="Bs · comparación vs. costo de referencia ficticio">
        <ResponsiveContainer>
          <LineChart data={data.savingsCumulative}>
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={shortDate} minTickGap={24} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatNumber(v)} width={56} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => formatBs(Number(v ?? 0))} labelFormatter={(l) => formatDate(String(l))} />
            <Line type="monotone" dataKey="ahorro" name="Ahorro estimado" stroke={YELLOW} strokeWidth={3} dot={{ r: 3, fill: YELLOW, strokeWidth: 0 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Distribución por actividad" subtitle="Litros conectados por actividad productiva">
        <div className="flex h-full items-center gap-4">
          <div className="h-full w-1/2">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.byActivity} dataKey="litros" nameKey="activity" innerRadius="55%" outerRadius="85%" paddingAngle={3} stroke="none">
                  {data.byActivity.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={litersFmt} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="w-1/2 space-y-2 text-sm">
            {data.byActivity.map((a, i) => (
              <li key={a.activity} className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {a.activity}
                </span>
                <span className="font-semibold tabular-nums text-slate-800">{totalActivity ? Math.round((a.litros / totalActivity) * 100) : 0}%</span>
              </li>
            ))}
          </ul>
        </div>
      </ChartCard>

      <ChartCard title="Volumen por zona" subtitle="Litros entregados a productores por zona">
        <ResponsiveContainer>
          <BarChart data={data.volumeByZone} layout="vertical" margin={{ left: 8 }}>
            <CartesianGrid stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatNumber(v)} />
            <YAxis type="category" dataKey="zone" tick={AXIS} tickLine={false} axisLine={false} width={120} />
            <Tooltip contentStyle={tooltipStyle} formatter={litersFmt} />
            <Bar dataKey="litros" name="Litros" fill={GREEN} radius={[0, 6, 6, 0]} barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <Card>
        <CardHeader title="Operaciones por estado" subtitle="Trazabilidad de operaciones registradas" />
        <CardBody>
          <ul className="space-y-3">
            {data.operationsByStatus.map((s) => {
              const total = data.cards.operations || 1;
              const meta = OPERATION_STATUS[s.status as keyof typeof OPERATION_STATUS];
              return (
                <li key={s.status}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{meta?.label ?? s.status}</span>
                    <span className="tabular-nums text-slate-500">{s.total}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-500 transition-all duration-700" style={{ width: `${Math.round((s.total / total) * 100)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}

function RecentAnomalies() {
  const { data } = useAnomalies();
  const top = [...(data ?? [])].sort((a, b) => b.risk_score - a.risk_score).slice(0, 3);
  return (
    <Card>
      <CardHeader
        title="Últimas anomalías"
        subtitle="Mayor risk score sobre datos simulados"
        action={
          <Link to="/app/anomalies" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
            Ver todas <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <CardBody>
        {top.length === 0 ? (
          <p className="text-sm text-slate-500">Sin anomalías registradas.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {top.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{ANOMALY_TYPE[a.type]}</p>
                  <p className="truncate text-xs text-slate-500">{a.organization ?? a.profile?.full_name ?? '—'}</p>
                </div>
                <Badge tone={riskTone(a.risk_score)}>Risk {a.risk_score}/100</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data, isLoading, isError, refetch } = useDashboard();
  const reset = useResetDemo();

  const handleReset = () => {
    if (!window.confirm('¿Reiniciar los datos de demostración? Solo funciona con el store en memoria.')) return;
    reset.mutate(undefined, {
      onSuccess: () => toast.success('Datos de demostración reiniciados'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'No se pudo reiniciar (requiere store en memoria)'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2">
            <DemoTag />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">DieselP2P</h1>
          <p className="mt-1 text-sm text-slate-500">Mercado inteligente de combustible productivo · panel de administración</p>
        </div>
        <Button variant="outline" icon={<RefreshCw className="h-4 w-4" />} loading={reset.isPending} onClick={handleReset}>
          Reiniciar datos demo
        </Button>
      </div>

      {isLoading && <SkeletonCards count={6} />}
      {isError && <ErrorState retry={() => void refetch()} />}
      {data && (
        <>
          <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatedStatCard label="Litros conectados" value={data.cards.litersConnected} format={formatLiters} icon={<Droplets className="h-5 w-5" />} tone="green" hint="Matches confirmados" />
            <AnimatedStatCard label="Demanda activa" value={data.cards.activeDemandLiters} format={formatLiters} icon={<Package className="h-5 w-5" />} tone="yellow" hint="Litros pendientes de cubrir" />
            <AnimatedStatCard label="Oferta disponible" value={data.cards.availableOfferLiters} format={formatLiters} icon={<Fuel className="h-5 w-5" />} tone="green" hint="Proveedores verificados (demo)" />
            <AnimatedStatCard label="Operaciones" value={data.cards.operations} format={formatNumber} icon={<Leaf className="h-5 w-5" />} tone="blue" hint="Con trazabilidad y QR" />
            <AnimatedStatCard label="Ahorro estimado" value={data.cards.estimatedSavings} format={(n) => formatBs(n)} icon={<TrendingDown className="h-5 w-5" />} tone="yellow" hint="Vs. costo de referencia ficticio" />
            <AnimatedStatCard label="Anomalías abiertas" value={data.cards.openAnomalies} format={formatNumber} icon={<AlertTriangle className="h-5 w-5" />} tone={data.cards.openAnomalies > 0 ? 'red' : 'neutral'} hint="Pendientes de revisión" />
          </div>
          <Charts data={data} />
          <RecentAnomalies />
        </>
      )}
    </div>
  );
}
