import { toast } from 'sonner';
import { Database, KeyRound, RefreshCw, ShieldOff, SlidersHorizontal } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, DemoTag, ErrorState, PageHeader, SkeletonCards } from '../../components/ui';
import { useConfig, useResetDemo } from '../../hooks/queries';
import { formatBs, formatKm, formatLiters, ROLE_LABELS } from '../../lib/format';
import type { AppConfig, Role } from '../../types';

const WEIGHTS = [
  { label: 'Disponibilidad', pts: 35, desc: 'Porcentaje del volumen cubierto por ofertas disponibles a tiempo' },
  { label: 'Distancia', pts: 25, desc: 'Distancia promedio ponderada por litros hasta el punto de entrega' },
  { label: 'Precio', pts: 20, desc: 'Precio promedio vs. precio objetivo o referencia' },
  { label: 'Volumen compatible', pts: 10, desc: 'Cobertura y menor fragmentación entre proveedores' },
  { label: 'Tiempo de entrega', pts: 10, desc: 'Distancia máxima y holgura de fechas' },
];

const NOT_INCLUDED = ['No hay compra real de combustible', 'No hay pagos ni integración bancaria', 'No hay integración con sistemas gubernamentales', 'No hay automatización de adquisición ni scraping de estaciones'];

function paramRows(p: AppConfig['params']) {
  return [
    { key: 'costPerKm', label: 'Costo logístico por km', value: `${formatBs(p.costPerKm)}/km`, desc: 'Costo estimado por km recorrido por una cisterna, por viaje.' },
    { key: 'baseTripCost', label: 'Costo fijo por viaje', value: formatBs(p.baseTripCost), desc: 'Carga, maniobra y peajes estimados de cada viaje, independiente de la distancia.' },
    { key: 'referencePricePerLiter', label: 'Precio de referencia', value: `${formatBs(p.referencePricePerLiter, 2)}/L`, desc: 'Precio de un mercado no optimizado (incluye intermediación estimada). Base del ahorro estimado.' },
    { key: 'truckCapacityLiters', label: 'Capacidad de cisterna', value: formatLiters(p.truckCapacityLiters), desc: 'Para estimar viajes en el escenario de referencia.' },
    { key: 'maxRadiusKm', label: 'Radio máximo de búsqueda', value: formatKm(p.maxRadiusKm), desc: 'Ofertas más lejanas quedan fuera del matching.' },
    { key: 'maxSuppliersPerMatch', label: 'Proveedores máx. por match', value: String(p.maxSuppliersPerMatch), desc: 'Límite de ofertas combinadas en una misma demanda.' },
  ];
}

export default function SettingsPage() {
  const { data, isLoading, isError, refetch } = useConfig();
  const reset = useResetDemo();
  const handleReset = () => {
    if (!window.confirm('¿Reiniciar los datos de demostración?')) return;
    reset.mutate(undefined, { onSuccess: () => toast.success('Datos reiniciados'), onError: (e) => toast.error(e.message) });
  };

  return (
    <div>
      <PageHeader title="Configuración" description="Parámetros del MVP. Todos los valores económicos son ficticios y configurables por variables de entorno del backend." actions={<DemoTag />} />
      {isLoading && <SkeletonCards count={2} />}
      {isError && <ErrorState retry={() => void refetch()} />}
      {data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Entorno" subtitle="Estado del backend" action={<Database className="h-5 w-5 text-slate-400" />} />
            <CardBody className="space-y-3 text-sm">
              <Row label="Almacenamiento">
                <Badge tone={data.storage === 'supabase' ? 'green' : 'yellow'}>{data.storage === 'supabase' ? 'Supabase (PostgreSQL)' : 'Memoria (seed)'}</Badge>
              </Row>
              <Row label="Supabase configurado">
                <Badge tone={data.supabaseConfigured ? 'green' : 'gray'}>{data.supabaseConfigured ? 'Sí' : 'No'}</Badge>
              </Row>
              <Row label="Modo demo">
                <Badge tone={data.demoMode ? 'yellow' : 'gray'}>{data.demoMode ? 'Activo' : 'Inactivo'}</Badge>
              </Row>
              <Row label="Disclaimer">
                <span className="text-slate-600">{data.disclaimer}</span>
              </Row>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Cuentas demo" subtitle="Acceso por rol sin contraseña (ficticio)" action={<KeyRound className="h-5 w-5 text-slate-400" />} />
            <CardBody>
              {data.demoAccounts ? (
                <ul className="divide-y divide-slate-100 text-sm">
                  {(Object.entries(data.demoAccounts) as [Role, string][]).map(([role, email]) => (
                    <li key={role} className="flex items-center justify-between py-2">
                      <span className="font-medium text-slate-700">{ROLE_LABELS[role]}</span>
                      <code className="text-xs text-slate-500">{email}</code>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">El modo demo está deshabilitado.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Parámetros del motor" subtitle="Ficticios · configurables por variables de entorno" action={<SlidersHorizontal className="h-5 w-5 text-slate-400" />} />
            <CardBody>
              <ul className="divide-y divide-slate-100">
                {paramRows(data.params).map((p) => (
                  <li key={p.key} className="flex items-start justify-between gap-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.label}</p>
                      <p className="text-xs text-slate-500">{p.desc}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-brand-700">{p.value}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Pesos del score de matching" subtitle="Total 100 puntos" />
            <CardBody>
              <ul className="space-y-2.5">
                {WEIGHTS.map((w) => (
                  <li key={w.label}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{w.label}</span>
                      <span className="font-semibold tabular-nums text-slate-900">{w.pts} pts</span>
                    </div>
                    <p className="text-xs text-slate-500">{w.desc}</p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${w.pts}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Fuera del alcance del MVP" subtitle="Simulación tecnológica de operaciones autorizadas" action={<ShieldOff className="h-5 w-5 text-slate-400" />} />
            <CardBody>
              <ul className="space-y-1.5 text-sm text-slate-600">
                {NOT_INCLUDED.map((n) => (
                  <li key={n} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    {n}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Datos de demostración" subtitle="Vuelve al estado inicial del seed (solo store en memoria)" />
            <CardBody>
              <Button variant="outline" icon={<RefreshCw className="h-4 w-4" />} loading={reset.isPending} onClick={handleReset}>
                Reiniciar datos demo
              </Button>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      {children}
    </div>
  );
}
