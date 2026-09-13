import { BadgeCheck, ScanLine, AlertTriangle, QrCode, ArrowRight } from 'lucide-react';

/**
 * Por qué un mercado de combustible puede operarse con confianza.
 * Se describen los controles implementados, sin prometer garantías absolutas.
 */

const CONTROLES = [
  {
    icon: BadgeCheck,
    titulo: 'Solo proveedores verificados',
    texto:
      'Una oferta no entra en ningún match si el proveedor no tiene estado verificado. La verificación la administra la plataforma, no el propio proveedor.',
  },
  {
    icon: ScanLine,
    titulo: 'Cada litro queda trazado',
    texto:
      'Toda operación tiene un código único y deja registro de qué proveedor aportó cuántos litros, quién transportó y en qué estado está la entrega.',
  },
  {
    icon: AlertTriangle,
    titulo: 'Patrones de riesgo marcados',
    texto:
      'Volúmenes muy fuera del historial, solicitudes repetidas en pocas horas, compras encadenadas y demandas dispersas en ubicaciones lejanas generan una alerta con nivel de riesgo para revisión humana.',
  },
];

const PASOS_QR = [
  { titulo: 'Se genera al confirmar', texto: 'Al cerrarse el match, la operación recibe un código y un identificador aleatorio propio.' },
  { titulo: 'Viaja con la entrega', texto: 'El QR acompaña a la operación: productor, proveedores y transportista ven el mismo.' },
  { titulo: 'Cualquiera lo comprueba', texto: 'Al escanearlo se abre una página pública con litros, participantes y estado. Sin cuenta ni contraseña.' },
];

export function Seguridad() {
  return (
    <section id="seguridad" className="bg-brand-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <p className="text-xs font-semibold uppercase tracking-wider text-fuel-300">Confianza</p>
        <h2 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight">
          Un mercado de combustible solo sirve si se puede auditar
        </h2>
        <p className="mt-4 max-w-3xl text-lg text-brand-100">
          Conectar oferta y demanda sin control abre la puerta justo al problema que se quiere evitar. Por eso la trazabilidad y la revisión no son
          añadidos: están en el mismo flujo que el matching.
        </p>

        <div className="stagger mt-12 grid gap-5 md:grid-cols-3">
          {CONTROLES.map((c) => (
            <div key={c.titulo} className="rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors hover:border-fuel-300/30 hover:bg-white/10">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuel-400 text-brand-950">
                <c.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold">{c.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-100">{c.texto}</p>
            </div>
          ))}
        </div>

        {/* Cómo funciona la verificación por QR */}
        <div className="mt-6 rounded-2xl border border-fuel-300/25 bg-fuel-400/10 p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="flex shrink-0 items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-fuel-400 text-brand-950">
                <QrCode className="h-7 w-7" />
              </span>
              <div>
                <h3 className="text-lg font-bold">El QR de cada operación</h3>
                <p className="text-sm text-brand-200">Cómo funciona la verificación</p>
              </div>
            </div>

            <ol className="grid flex-1 gap-3 sm:grid-cols-3">
              {PASOS_QR.map((paso, i) => (
                <li key={paso.titulo} className="relative rounded-xl bg-brand-950/40 p-4">
                  <span className="text-xs font-bold text-fuel-300">{i + 1}</span>
                  <p className="mt-1 text-sm font-semibold">{paso.titulo}</p>
                  <p className="mt-1 text-xs leading-relaxed text-brand-100">{paso.texto}</p>
                  {i < PASOS_QR.length - 1 && (
                    <ArrowRight className="absolute -right-2.5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-fuel-300/60 sm:block" />
                  )}
                </li>
              ))}
            </ol>
          </div>
          <p className="mt-5 border-t border-white/10 pt-4 text-xs text-brand-200">
            El enlace solo permite leer. No expone teléfonos ni correos, no deja modificar nada y el identificador es aleatorio, así que no se puede
            adivinar el de otra operación.
          </p>
        </div>

        <p className="mt-8 max-w-3xl text-sm text-brand-200">
          Ningún sistema elimina el riesgo por completo. Lo que cambia es que cada operación deja rastro y cada patrón anómalo queda visible para quien
          deba revisarlo, en lugar de perderse en llamadas y planillas sueltas.
        </p>
      </div>
    </section>
  );
}
