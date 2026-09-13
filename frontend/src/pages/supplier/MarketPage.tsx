import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Fuel, Package, TrendingDown, Target, ArrowRight, Trophy, CircleDot } from 'lucide-react';
import { useMarket } from '../../hooks/queries';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, SkeletonCards } from '../../components/ui/Feedback';
import { DataTable, type Column } from '../../components/ui/Table';
import { formatDate, formatKm, formatLiters, formatPrice } from '../../lib/format';
import type { Oportunidad } from '../../types';

/**
 * Mercado P2P: qué se está pidiendo, a qué precios compite el resto y a cuánto
 * tendría que ofertar este proveedor para llevarse cada demanda.
 */
export default function MarketPage() {
  const { data, isLoading, isError, refetch } = useMarket();
  const navigate = useNavigate();
  const [soloAlcanzables, setSoloAlcanzables] = useState(false);

  const oportunidades = useMemo(() => {
    const lista = data?.oportunidades ?? [];
    return soloAlcanzables ? lista.filter((o) => o.precio_sugerido !== null && !o.ya_compite) : lista;
  }, [data, soloAlcanzables]);

  if (isLoading) return <SkeletonCards count={4} />;
  if (isError || !data) return <ErrorState retry={() => refetch()} />;

  const { referencia: ref, demanda, mi_posicion: mi } = data;

  const ofertar = (o: Oportunidad) => {
    const params = new URLSearchParams({
      liters: String(Math.min(o.cobertura_posible, o.liters)),
      location: o.location_name,
      ...(o.precio_sugerido ? { price: o.precio_sugerido.toFixed(2) } : {}),
    });
    navigate(`/app/offers/new?${params}`);
  };

  const columnas: Column<Oportunidad & { id: string }>[] = [
    {
      key: 'demanda',
      header: 'Demanda',
      render: (o) => (
        <div>
          <p className="font-medium text-slate-900">{o.location_name}</p>
          <p className="text-xs text-slate-500">
            {o.activity_type} · entrega {formatDate(o.required_date)}
          </p>
        </div>
      ),
    },
    { key: 'liters', header: 'Volumen', align: 'right', render: (o) => <span className="font-semibold">{formatLiters(o.liters)}</span> },
    { key: 'dist', header: 'Distancia', align: 'right', render: (o) => <span className="text-slate-600">{formatKm(o.distance_km)}</span> },
    {
      key: 'batir',
      header: 'Costo a batir',
      align: 'right',
      render: (o) =>
        o.precio_a_batir ? (
          <span className="whitespace-nowrap tabular-nums text-slate-700">{formatPrice(o.precio_a_batir)}</span>
        ) : (
          <span className="text-slate-400">sin competencia</span>
        ),
    },
    {
      key: 'sugerido',
      header: 'Oferta por debajo de',
      align: 'right',
      render: (o) =>
        o.ya_compite ? (
          <Badge tone="green" dot>
            Ya compites
          </Badge>
        ) : o.precio_sugerido ? (
          <span className="whitespace-nowrap font-bold tabular-nums text-brand-700">{formatPrice(o.precio_sugerido)}</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: 'accion',
      header: '',
      align: 'right',
      render: (o) => (
        <Button size="sm" variant={o.ya_compite ? 'outline' : 'accent'} onClick={() => ofertar(o)} icon={<ArrowRight className="h-3.5 w-3.5" />}>
          Ofertar
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Proveedor"
        title="Mercado P2P"
        description="Lo que se está pidiendo ahora mismo y a qué precio tendrías que ofertar para llevártelo. Los precios mostrados son de ofertas publicadas en la plataforma."
        actions={
          <Link to="/app/offers/new">
            <Button variant="accent" icon={<Fuel className="h-4 w-4" />}>
              Nueva oferta
            </Button>
          </Link>
        }
      />

      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Demanda abierta" value={formatLiters(demanda.litros_solicitados)} hint={`${demanda.abiertas} demandas sin cubrir`} icon={<Package className="h-5 w-5" />} tone="yellow" />
        <StatCard label="Precio promedio del mercado" value={ref.precio_promedio_mercado ? formatPrice(ref.precio_promedio_mercado) : '—'} hint={ref.precio_minimo ? `desde ${formatPrice(ref.precio_minimo)}` : undefined} icon={<TrendingDown className="h-5 w-5" />} tone="green" />
        <StatCard label="Tu precio promedio" value={mi?.precio_promedio ? formatPrice(mi.precio_promedio) : 'Sin ofertas'} hint={mi?.percentil_precio !== null && mi?.percentil_precio !== undefined ? `más barato que el ${100 - mi.percentil_precio}% del mercado` : undefined} icon={<Target className="h-5 w-5" />} tone="blue" />
        <StatCard label="Oferta disponible total" value={formatLiters(ref.litros_disponibles)} hint={`${ref.ofertas_activas} ofertas activas compitiendo`} icon={<Fuel className="h-5 w-5" />} tone="neutral" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Oportunidades"
            subtitle="El costo a batir es el de la mejor combinación actual sin ti. Ofertar por debajo del precio sugerido te coloca dentro del match."
            action={
              <button
                onClick={() => setSoloAlcanzables((v) => !v)}
                className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${soloAlcanzables ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'}`}
              >
                Solo donde aún no compito
              </button>
            }
          />
          <CardBody>
            {oportunidades.length === 0 ? (
              <EmptyState icon={<Trophy className="h-6 w-6" />} title="Sin oportunidades ahora" description="No hay demandas abiertas dentro de tu radio de reparto, o ya compites en todas." />
            ) : (
              <DataTable columns={columnas} rows={oportunidades.map((o) => ({ ...o, id: o.demand_id }))} className="border-0 shadow-none" />
            )}
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Precios por zona" subtitle="Ofertas activas publicadas" />
            <CardBody className="space-y-3">
              {data.precios_por_zona.slice(0, 6).map((z) => {
                const rango = ref.precio_maximo && ref.precio_minimo ? ref.precio_maximo - ref.precio_minimo : 1;
                const desde = ref.precio_minimo ?? 0;
                const izq = ((z.minimo - desde) / rango) * 100;
                const ancho = Math.max(3, ((z.maximo - z.minimo) / rango) * 100);
                return (
                  <div key={z.zone}>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-medium text-slate-700">{z.zone}</span>
                      <span className="tabular-nums text-slate-500">{formatPrice(z.promedio)}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand-400" style={{ marginLeft: `${izq}%`, width: `${ancho}%` }} />
                    </div>
                  </div>
                );
              })}
              <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">
                Precio de referencia del mercado sin comparación: <b className="text-slate-700">{formatPrice(ref.precio_referencia)}</b>
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Dónde está la demanda" />
            <CardBody className="space-y-2">
              {demanda.por_zona.map((z) => (
                <div key={z.zone} className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 text-slate-600">
                    <CircleDot className="h-3 w-3 text-fuel-500" />
                    {z.zone}
                  </span>
                  <span className="font-semibold tabular-nums text-slate-800">{formatLiters(z.litros)}</span>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
