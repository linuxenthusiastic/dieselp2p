import { BadgeCheck, ScanLine, AlertTriangle, KeyRound, Lock, FileWarning } from 'lucide-react';

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
      'Toda operación tiene un código único, deja registro de qué proveedor aportó cuántos litros, quién transportó y en qué estado está. El QR permite comprobarlo sin tener cuenta.',
  },
  {
    icon: AlertTriangle,
    titulo: 'Patrones de riesgo marcados',
    texto:
      'Volúmenes muy fuera del historial, solicitudes repetidas en pocas horas, compras encadenadas y demandas dispersas en ubicaciones lejanas generan una alerta con nivel de riesgo para revisión humana.',
  },
  {
    icon: KeyRound,
    titulo: 'Cada rol ve lo suyo',
    texto:
      'Productor, proveedor, transportista y administración tienen permisos separados. El servidor valida el rol en cada operación, no basta con ocultar un botón en la pantalla.',
  },
  {
    icon: Lock,
    titulo: 'Credenciales fuera del navegador',
    texto:
      'Las claves con privilegios viven solo en el servidor. La base de datos aplica seguridad por fila, de modo que un cliente no puede leer lo que no le corresponde aunque lo intente.',
  },
  {
    icon: FileWarning,
    titulo: 'Lo que deliberadamente no hace',
    texto:
      'No mueve dinero, no compra combustible, no se conecta a sistemas oficiales y no ofrece forma alguna de ocultar una operación. Es un MVP de demostración con datos simulados.',
  },
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

        <div className="stagger mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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

        <p className="mt-10 max-w-3xl text-sm text-brand-200">
          Ningún sistema elimina el riesgo por completo. Lo que cambia es que cada operación deja rastro y cada patrón anómalo queda visible para quien
          deba revisarlo, en lugar de perderse en llamadas y planillas sueltas.
        </p>
      </div>
    </section>
  );
}
