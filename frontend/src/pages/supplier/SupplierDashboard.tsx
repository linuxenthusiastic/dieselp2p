import { Link } from 'react-router-dom';
import { Fuel, Package, Target, Leaf, Droplets, Plus, MapPin, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useDemands, useMe, useOffers } from '../../hooks/queries';
import { AnimatedStatCard, Button, Card, CardBody, CardHeader, EmptyState, ErrorState, PageHeader, SkeletonCards, StatusBadge, Badge } from '../../components/ui';
import { formatDate, formatKm, formatLiters, formatNumber, formatPrice, OFFER_STATUS, VERIFICATION_STATUS } from '../../lib/format';
import type { DemandView, OfferView, SupplierSummaryStats } from '../../types';

export default function SupplierDashboard() {
  const { session } = useAuth();
  const me = useMe();
  const demands = useDemands();
  const offers = useOffers();
  const supplier = session?.supplier ?? null;

  if (me.isError) return <ErrorState message="No se pudo cargar tu resumen." retry={() => void me.refetch()} />;

  const stats = me.data?.role === 'supplier' ? (me.data as SupplierSummaryStats).totals : null;
  const compatible = (demands.data ?? []).slice(0, 5);
  const activeOffers = (offers.data ?? []).filter((o) => o.status === 'ACTIVE' || o.status === 'PARTIALLY_ALLOCATED').slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Proveedor"
        title={supplier?.business_name ?? 'Mi panel'}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-400" />
            {supplier?.location_name ?? '—'} · capacidad {supplier ? formatLiters(supplier.capacity_liters) : '—'}
            {supplier && <StatusBadge map={VERIFICATION_STATUS} value={supplier.verification_status} />}
          </span>
        }
        actions={
          <Link to="/app/offers/new">
            <Button variant="accent" icon={<Plus className="h-4 w-4" />}>Nueva oferta</Button>
          </Link>
        }
      />

      {me.isLoading || !stats ? (
        <SkeletonCards count={5} />
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <AnimatedStatCard label="Litros disponibles" value={stats.litersAvailable} format={formatLiters} icon={<Droplets className="h-5 w-5" />} tone="green" />
          <AnimatedStatCard label="Ofertas activas" value={stats.activeOffers} format={formatNumber} icon={<Fuel className="h-5 w-5" />} tone="yellow" />
          <AnimatedStatCard label="Demandas compatibles" value={stats.compatibleDemands} format={formatNumber} icon={<Target className="h-5 w-5" />} tone="blue" />
          <AnimatedStatCard label="Operaciones" value={stats.operations} format={formatNumber} icon={<Leaf className="h-5 w-5" />} tone="neutral" />
          <AnimatedStatCard label="Volumen colocado" value={stats.litersPlaced} format={formatLiters} icon={<Package className="h-5 w-5" />} tone="green" hint="Litros en matches confirmados" />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Demandas compatibles" subtitle="Ordenadas por cercanía a tu ubicación" action={<Link to="/app/demands" className="text-sm font-medium text-brand-700 hover:underline">Ver todas</Link>} />
          <CardBody>
            {demands.isLoading ? (
              <SkeletonCards count={2} />
            ) : compatible.length === 0 ? (
              <EmptyState title="Sin demandas compatibles" description="Cuando un productor publique una necesidad cerca de ti aparecerá aquí." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {compatible.map((d) => <DemandRow key={d.id} demand={d} />)}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Mis ofertas activas" subtitle="Volumen publicado y disponible" action={<Link to="/app/offers" className="text-sm font-medium text-brand-700 hover:underline">Ver todas</Link>} />
          <CardBody>
            {offers.isLoading ? (
              <SkeletonCards count={2} />
            ) : activeOffers.length === 0 ? (
              <EmptyState
                icon={<Fuel className="h-6 w-6" />}
                title="No tienes ofertas activas"
                description="Publica tu volumen disponible para que el motor de matching lo considere."
                action={
                  <Link to="/app/offers/new">
                    <Button variant="accent" size="sm" icon={<Plus className="h-4 w-4" />}>Nueva oferta</Button>
                  </Link>
                }
              />
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="pb-2">Ubicación</th>
                    <th className="pb-2 text-right">Disponible</th>
                    <th className="pb-2 text-right">Precio</th>
                    <th className="pb-2 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeOffers.map((o) => <OfferRow key={o.id} offer={o} />)}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function DemandRow({ demand }: { demand: DemandView }) {
  return (
    <li>
      <Link to={`/app/demands/${demand.id}`} className="flex items-center gap-3 py-3 transition-colors hover:bg-brand-50/40">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
          <Package className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{demand.producer?.organization_name ?? 'Productor'}</p>
          <p className="text-xs text-slate-500">
            {demand.location_name} · {demand.activity_type} · para {formatDate(demand.required_date)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-brand-700">{formatLiters(demand.remaining_liters)}</p>
          {demand.distance_km !== undefined && <Badge tone="gray">{formatKm(demand.distance_km)}</Badge>}
        </div>
        <ArrowRight className="h-4 w-4 text-slate-300" />
      </Link>
    </li>
  );
}

function OfferRow({ offer }: { offer: OfferView }) {
  return (
    <tr>
      <td className="py-2.5 text-slate-800">{offer.location_name}</td>
      <td className="py-2.5 text-right font-semibold tabular-nums text-slate-900">
        {formatLiters(offer.remaining_liters)}
        <span className="block text-[11px] font-normal text-slate-400">de {formatLiters(offer.available_liters)}</span>
      </td>
      <td className="py-2.5 text-right tabular-nums">{formatPrice(offer.price_per_liter)}</td>
      <td className="py-2.5 text-right"><StatusBadge map={OFFER_STATUS} value={offer.status} /></td>
    </tr>
  );
}
