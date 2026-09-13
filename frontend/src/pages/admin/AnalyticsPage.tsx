import { Award, Layers, Route, TrendingDown } from 'lucide-react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, BarChart } from 'recharts';
import clsx from 'clsx';
import { Card, CardBody, CardHeader, DataTable, DemoTag, ErrorState, PageHeader, SkeletonCards, StatCard, type Column } from '../../components/ui';
import { useDashboard, useImpact } from '../../hooks/queries';
import { formatBs, formatDate, formatKm, formatLiters, formatNumber } from '../../lib/format';

const GREEN = '#178a4a';
const YELLOW = '#f5b400';
const AXIS = { fontSize: 12, fill: '#64748b' };
const tooltipStyle = { borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 };

interface ZoneRow {
  id: string;
  zone: string;
  oferta: number;
  demanda: number;
  balance: number;
}

const zoneColumns: Column<ZoneRow>[] = [
  { key: 'zone', header: 'Zona', render: (r) => <span className="font-medium text-slate-900">{r.zone}</span> },
  { key: 'oferta', header: 'Oferta', align: 'right', render: (r) => formatLiters(r.oferta) },
  { key: 'demanda', header: 'Demanda', align: 'right', render: (r) => formatLiters(r.demanda) },
  {
    key: 'balance',
    header: 'Balance',
    align: 'right',
    render: (r) => (
      <span className={clsx('font-semibold tabular-nums', r.balance > 0 ? 'text-brand-700' : r.balance < 0 ? 'text-red-600' : 'text-slate-500')}>
        {r.balance > 0 ? '+' : ''}
        {formatLiters(r.balance)}
      </span>
    ),
  },
];

export default function AnalyticsPage() {
  const dashboard = useDashboard();
  const impact = useImpact();
  const isLoading = dashboard.isLoading || impact.isLoading;
  const isError = dashboard.isError || impact.isError;
  const d = dashboard.data;
  const im = impact.data;
  const totalActivity = d?.byActivity.reduce((s, a) => s + a.litros, 0) ?? 0;
  const zoneRows: ZoneRow[] = (d?.supplyVsDemand ?? []).map((z) => ({ id: z.zone, zone: z.zone, oferta: z.oferta, demanda: z.demanda, balance: z.oferta - z.demanda }));

  return (
    <div>
      <PageHeader eyebrow="Simulación del MVP" title="Analytics" description="Métricas agregadas del mercado simulado: matching, logística y ahorro estimado." actions={<DemoTag />} />
      {isLoading && <SkeletonCards />}
      {isError && (
        <ErrorState
          retry={() => {
            void dashboard.refetch();
            void impact.refetch();
          }}
        />
      )}
      {d && im && (
        <div className="space-y-6">
          <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Score promedio" value={`${im.avgScore}/100`} icon={<Award className="h-5 w-5" />} tone="green" hint="Matches confirmados" />
            <StatCard label="Matches multi-proveedor" value={formatNumber(im.multiSupplierMatches)} icon={<Layers className="h-5 w-5" />} tone="blue" hint="Demandas cubiertas por 2+ ofertas" />
            <StatCard label="Km optimizados" value={formatKm(im.kmOptimized)} icon={<Route className="h-5 w-5" />} tone="green" hint="Vs. ruta de referencia estimada" />
            <StatCard label="Ahorro logístico estimado" value={formatBs(im.logisticSavings)} icon={<TrendingDown className="h-5 w-5" />} tone="yellow" hint="Simulación del MVP" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Litros y operaciones por día" subtitle="Simulación del MVP" />
              <CardBody>
                <div className="h-72">
                  <ResponsiveContainer>
                    <ComposedChart data={d.litersPerDay}>
                      <CartesianGrid stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: string) => formatDate(v).slice(0, 5)} minTickGap={24} />
                      <YAxis yAxisId="l" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatNumber(v)} width={56} />
                      <YAxis yAxisId="r" orientation="right" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                      <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => formatDate(String(l))} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                      <Bar yAxisId="l" dataKey="litros" name="Litros" fill={GREEN} radius={[6, 6, 0, 0]} />
                      <Line yAxisId="r" type="monotone" dataKey="operaciones" name="Operaciones" stroke={YELLOW} strokeWidth={2.5} dot={{ r: 3, fill: YELLOW, strokeWidth: 0 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Volumen por zona" subtitle="Litros entregados · Simulación del MVP" />
              <CardBody>
                <div className="h-72">
                  <ResponsiveContainer>
                    <BarChart data={d.volumeByZone} layout="vertical" margin={{ left: 8 }}>
                      <CartesianGrid stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatNumber(v)} />
                      <YAxis type="category" dataKey="zone" tick={AXIS} tickLine={false} axisLine={false} width={120} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => `${formatNumber(Number(v ?? 0))} L`} />
                      <Bar dataKey="litros" name="Litros" fill={GREEN} radius={[0, 6, 6, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader title="Distribución por actividad" subtitle="Participación en litros conectados" />
              <CardBody>
                <ul className="space-y-3">
                  {d.byActivity.map((a) => {
                    const pct = totalActivity ? Math.round((a.litros / totalActivity) * 100) : 0;
                    return (
                      <li key={a.activity}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">{a.activity}</span>
                          <span className="tabular-nums text-slate-500">
                            {formatLiters(a.litros)} · <span className="font-semibold text-slate-800">{pct}%</span>
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                  {d.byActivity.length === 0 && <li className="text-sm text-slate-500">Sin datos.</li>}
                </ul>
              </CardBody>
            </Card>
            <div className="lg:col-span-3">
              <h3 className="mb-3 text-base font-semibold text-slate-900">Zonas: oferta vs demanda</h3>
              <DataTable columns={zoneColumns} rows={zoneRows} emptyMessage="Sin zonas con actividad" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
