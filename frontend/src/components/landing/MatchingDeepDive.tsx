import { Filter, Layers, Split, Trophy, Scale, Route, Eye, Ban } from 'lucide-react';

/**
 * Explicación en profundidad del motor de matching para la landing.
 * Describe el mecanismo, no resultados: los datos de la plataforma son simulados.
 */

const PASOS = [
  {
    icon: Filter,
    titulo: 'Filtrar candidatas',
    texto: 'Descarta lo que no puede cumplir: proveedores sin verificar, ofertas que llegan después de la fecha requerida, volumen ya comprometido y ubicaciones fuera del radio de reparto.',
    detalle: 'De todas las ofertas activas quedan solo las viables.',
  },
  {
    icon: Split,
    titulo: 'Combinar ofertas',
    texto: 'Aquí está la diferencia. En vez de buscar un proveedor que cubra todo, explora combinaciones de varias ofertas y descarta las que añaden un proveedor sin aportar volumen.',
    detalle: 'Una demanda puede resolverse con dos, tres o cuatro proveedores.',
  },
  {
    icon: Layers,
    titulo: 'Asignar litros',
    texto: 'Dentro de cada combinación reparte el volumen empezando por la oferta más barata, hasta cubrir la demanda o agotar lo disponible.',
    detalle: 'Nadie entrega más de lo que tiene ni el productor recibe de más.',
  },
  {
    icon: Trophy,
    titulo: 'Elegir y explicar',
    texto: 'Ordena las combinaciones por cobertura, luego por costo total y luego por score. Devuelve la mejor y guarda las alternativas para que el productor compare.',
    detalle: 'Cada recomendación viene con el porqué en lenguaje claro.',
  },
];

const CRITERIOS = [
  { peso: 35, nombre: 'Disponibilidad', mide: 'Qué porcentaje del volumen queda realmente cubierto a tiempo' },
  { peso: 25, nombre: 'Distancia', mide: 'Recorrido promedio ponderado por litros hasta el punto de entrega' },
  { peso: 20, nombre: 'Precio', mide: 'Precio promedio frente al precio objetivo del productor' },
  { peso: 10, nombre: 'Volumen', mide: 'Penaliza fragmentar la entrega entre demasiados proveedores' },
  { peso: 10, nombre: 'Tiempo', mide: 'Trayecto más largo de la combinación y holgura hasta la fecha' },
];

export function MatchingDeepDive() {
  return (
    <section id="motor" className="bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">El motor de matching</p>
        <h2 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-slate-900">
          Una demanda no es una búsqueda. Es un problema de asignación.
        </h2>
        <p className="mt-4 max-w-3xl text-lg text-slate-600">
          Buscar "quién tiene 10.000 litros" casi siempre no devuelve nada, porque el volumen está repartido. La pregunta correcta es otra:{' '}
          <b className="text-slate-900">qué combinación de ofertas disponibles cubre esa necesidad al menor costo total</b>. Eso no se resuelve con un
          filtro ni con una lista ordenada.
        </p>

        {/* El salto conceptual */}
        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <div className="card border-slate-200 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Búsqueda tradicional</p>
            <p className="mt-3 text-sm text-slate-600">Un proveedor tiene que cubrir el 100% o no hay resultado.</p>
            <div className="mt-4 space-y-2 font-mono text-sm">
              <div className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-slate-500">
                <span>Necesito 10.000 L</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-dashed border-slate-300 px-3 py-2 text-slate-400">
                <span>Proveedor A · 7.000 L</span>
                <span className="text-xs">insuficiente</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-dashed border-slate-300 px-3 py-2 text-slate-400">
                <span>Proveedor B · 3.000 L</span>
                <span className="text-xs">insuficiente</span>
              </div>
              <div className="rounded-lg bg-slate-200/70 px-3 py-2 text-center text-slate-500">Sin resultados</div>
            </div>
          </div>

          <div className="card border-brand-200 bg-white p-6 ring-1 ring-brand-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Asignación combinada</p>
            <p className="mt-3 text-sm text-slate-600">La demanda se reparte entre las ofertas que sí existen.</p>
            <div className="mt-4 space-y-2 font-mono text-sm">
              <div className="rounded-lg bg-brand-50 px-3 py-2 text-brand-900">Necesito 10.000 L</div>
              <div className="flex items-center justify-between rounded-lg bg-brand-600 px-3 py-2 text-white">
                <span>Proveedor A</span>
                <span className="font-bold">7.000 L</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-brand-600 px-3 py-2 text-white">
                <span>Proveedor B</span>
                <span className="font-bold">3.000 L</span>
              </div>
              <div className="rounded-lg bg-fuel-400 px-3 py-2 text-center font-bold text-brand-950">Demanda cubierta</div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              También resuelve repartos de tres o cuatro proveedores, y coberturas parciales cuando el mercado no alcanza.
            </p>
          </div>
        </div>

        {/* Pipeline */}
        <h3 className="mt-16 text-xl font-bold tracking-tight text-slate-900">Cómo decide, paso a paso</h3>
        <div className="stagger mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PASOS.map((p, i) => (
            <div key={p.titulo} className="card flex flex-col p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
                <p.icon className="h-5 w-5 text-brand-600" />
              </div>
              <h4 className="mt-4 font-semibold text-slate-900">{p.titulo}</h4>
              <p className="mt-1.5 flex-1 text-sm text-slate-600">{p.texto}</p>
              <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">{p.detalle}</p>
            </div>
          ))}
        </div>

        {/* Score y costo */}
        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-brand-600" />
              <h3 className="text-lg font-bold text-slate-900">El score no es una nota, es un argumento</h3>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Cinco criterios ponderados producen un puntaje de 0 a 100. El productor ve cuánto aportó cada uno, así que puede discutir la recomendación
              en lugar de aceptarla a ciegas.
            </p>
            <div className="mt-5 space-y-3">
              {CRITERIOS.map((c) => (
                <div key={c.nombre}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-800">{c.nombre}</span>
                    <span className="shrink-0 text-xs font-bold tabular-nums text-brand-700">{c.peso}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${(c.peso / 35) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{c.mide}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="card p-6">
              <div className="flex items-center gap-2">
                <Route className="h-5 w-5 text-brand-600" />
                <h3 className="text-lg font-bold text-slate-900">El litro más barato no es el más barato</h3>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Un proveedor lejano con mejor precio puede salir más caro que uno cercano, porque mover una cisterna cuesta. El motor decide sobre el
                costo total, no sobre el precio por litro.
              </p>
              <div className="mt-4 rounded-xl bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-300">
                <span className="text-fuel-300">costo total</span> = combustible + logística
                <br />
                <span className="text-brand-300">logística</span> = costo fijo del viaje + distancia × costo por km
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Los parámetros de costo son configurables. En esta demo tienen valores ficticios.
              </p>
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-brand-600" />
                <h3 className="text-lg font-bold text-slate-900">Determinista y auditable</h3>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                No hay un modelo opaco decidiendo. Con los mismos datos, el motor devuelve siempre la misma combinación y puede justificar cada punto del
                score. En un mercado sensible como el combustible, eso importa más que la sofisticación.
              </p>
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-fuel-50 p-3 text-xs text-fuel-900 ring-1 ring-inset ring-fuel-200">
                <Ban className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Toda asignación queda registrada con sus proveedores, litros y ruta, lista para ser revisada.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
