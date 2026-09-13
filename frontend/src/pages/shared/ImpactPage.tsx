import { ArrowDown, ArrowRight, Award, Droplets, Fuel, Layers, Leaf, Route, ShoppingBasket, Tractor, TrendingDown, Truck, Users, Warehouse, Wheat } from 'lucide-react';
import { AnimatedStatCard, Card, CardBody, CardHeader, ErrorState, PageHeader, SkeletonCards, StatCard } from '../../components/ui';
import { useImpact } from '../../hooks/queries';
import { formatBs, formatKm, formatLiters, formatNumber } from '../../lib/format';

const ICONS = [Fuel, Tractor, Truck, Warehouse, Wheat, ShoppingBasket];

const NARRATIVE = [
  'Con información visible, el productor elige la combinación de ofertas más cercana y barata en lugar de la primera disponible.',
  'Menos kilómetros y cisternas mejor aprovechadas reducen el costo logístico por litro entregado.',
  'Un menor costo del diésel en campo, cosecha y transporte se traslada a un menor costo de producir y distribuir alimentos.',
  'La trazabilidad de cada operación reduce intermediación innecesaria y da confianza a productores y proveedores.',
];

export default function ImpactPage() {
  const { data, isLoading, isError, refetch } = useImpact();
  return (
    <div>
      <PageHeader
        eyebrow="Impacto económico"
        title="Del combustible a la canasta familiar"
        description="Cómo una asignación más eficiente del diésel productivo se traslada a lo largo de la cadena alimentaria."
        actions={
          data && (
            <span className="inline-flex items-center gap-2 rounded-full border border-fuel-300 bg-fuel-50 px-3 py-1 text-xs font-semibold text-fuel-800">
              <span className="h-2 w-2 rounded-full bg-fuel-500" />
              {data.label}
            </span>
          )
        }
      />
      {isLoading && <SkeletonCards />}
      {isError && <ErrorState retry={() => void refetch()} />}
      {data && (
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardBody className="pt-6">
              <ol className="stagger flex flex-col items-stretch gap-2 lg:flex-row lg:items-start">
                {data.chain.map((stage, i) => {
                  const Icon = ICONS[i % ICONS.length];
                  const last = i === data.chain.length - 1;
                  return (
                    <li key={stage.stage} className="flex flex-1 flex-col items-center lg:flex-row">
                      <div className="flex w-full flex-col items-center rounded-2xl border border-brand-100 bg-brand-50/60 px-3 py-4 text-center">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
                          <Icon className="h-5 w-5" />
                        </span>
                        <p className="mt-2 text-xs font-bold uppercase tracking-wider text-brand-900">{stage.stage}</p>
                        <p className="mt-1 text-xs text-slate-600">{stage.description}</p>
                      </div>
                      {!last && (
                        <span className="my-1 shrink-0 text-fuel-500 lg:mx-1 lg:my-0 lg:mt-8">
                          <ArrowDown className="h-5 w-5 lg:hidden" />
                          <ArrowRight className="hidden h-5 w-5 lg:block" />
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </CardBody>
          </Card>

          <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AnimatedStatCard label="Litros optimizados" value={data.litersOptimized} format={formatLiters} icon={<Droplets className="h-5 w-5" />} tone="green" />
            <AnimatedStatCard label="Productores beneficiados" value={data.producersBenefited} format={formatNumber} icon={<Users className="h-5 w-5" />} tone="green" />
            <AnimatedStatCard label="Km logísticos optimizados" value={data.kmOptimized} format={formatKm} icon={<Route className="h-5 w-5" />} tone="blue" />
            <AnimatedStatCard label="Ahorro logístico estimado" value={data.logisticSavings} format={(n) => formatBs(n)} icon={<TrendingDown className="h-5 w-5" />} tone="yellow" />
            <AnimatedStatCard label="Operaciones conectadas" value={data.operationsConnected} format={formatNumber} icon={<Leaf className="h-5 w-5" />} tone="green" />
            <StatCard label="Score promedio" value={`${data.avgScore}/100`} icon={<Award className="h-5 w-5" />} tone="green" hint="Matches confirmados" />
            <AnimatedStatCard label="Matches multi-proveedor" value={data.multiSupplierMatches} format={formatNumber} icon={<Layers className="h-5 w-5" />} tone="blue" hint="Una demanda, varias ofertas" />
            <AnimatedStatCard label="Ahorro total estimado" value={data.totalSavings} format={(n) => formatBs(n)} icon={<TrendingDown className="h-5 w-5" />} tone="yellow" hint="Combustible + logística" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Cómo se traslada el ahorro" subtitle="Menor ineficiencia logística → menor costo → cadena alimentaria" />
              <CardBody>
                <ul className="space-y-2.5 text-sm text-slate-700">
                  {NARRATIVE.map((n, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fuel-100 text-xs font-bold text-fuel-800">{i + 1}</span>
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
            <Card className="border-fuel-200 bg-fuel-50/40">
              <CardHeader title="Alcance" subtitle="Simulación del MVP" />
              <CardBody>
                <p className="text-sm text-slate-700">
                  DieselP2P no pretende resolver por sí sola la crisis nacional de combustible. La propuesta es reducir ineficiencias de <strong>información</strong>, <strong>asignación</strong> y{' '}
                  <strong>logística</strong> mediante tecnología. Los indicadores de esta pantalla provienen de datos ficticios y no representan cifras oficiales de Bolivia.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
