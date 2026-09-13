import { Sparkles, Wrench, HeartHandshake } from 'lucide-react';

/**
 * Cómo DieselP2P responde a cada track del hackathon.
 * Habla de capacidades construidas, no de resultados: los datos son simulados.
 */

const TRACKS = [
  {
    icon: Sparkles,
    track: 'Construye algo sorprendente',
    titulo: 'La demanda se resuelve delante de ti',
    puntos: [
      'Publicas una necesidad y el motor muestra en vivo cómo filtra, compara y combina las ofertas hasta cerrar el volumen.',
      'El resultado aparece repartido entre proveedores, con su puntaje explicado y las rutas dibujadas sobre el mapa.',
      'La operación se cierra con un código y un QR que cualquiera puede verificar sin iniciar sesión.',
    ],
  },
  {
    icon: Wrench,
    track: 'Construye algo que antes no podías',
    titulo: 'Un motor de asignación, no un buscador',
    puntos: [
      'Repartir una demanda entre varios proveedores optimizando costo total exige explorar combinaciones, no ordenar una lista.',
      'Coordinarlo a mano significa llamadas, planillas y decisiones sin comparar. El motor lo resuelve en el momento y deja el criterio por escrito.',
      'Sobre esa base se apoyan la logística, la trazabilidad y la detección de patrones de riesgo.',
    ],
  },
  {
    icon: HeartHandshake,
    track: 'Construye algo que resuelva problemas reales',
    titulo: 'El diésel atraviesa toda la cadena de alimentos',
    puntos: [
      'Sin visibilidad de quién tiene combustible y quién lo necesita, se paga de más y se recorre de más.',
      'Ese sobrecosto no se queda en el surtidor: sube por la cadena hasta la canasta familiar.',
      'La plataforma no promete resolver el desabastecimiento. Ataca una parte concreta: la ineficiencia de información y asignación.',
    ],
  },
];

export function Tracks() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Los tres tracks</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Un mismo motor responde a los tres</h2>
      <p className="mt-3 max-w-2xl text-slate-600">
        La capacidad de repartir una demanda entre varios proveedores es a la vez el momento que sorprende, la pieza técnica difícil y la que ataca el
        problema de fondo.
      </p>
      <div className="stagger mt-10 grid gap-5 lg:grid-cols-3">
        {TRACKS.map((t) => (
          <article key={t.track} className="card flex flex-col p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
              <t.icon className="h-5 w-5" />
            </span>
            {/* min-h reserva dos líneas para que los títulos queden alineados entre tarjetas */}
            <p className="mt-4 min-h-8 text-xs font-semibold uppercase leading-4 tracking-wider text-fuel-700">{t.track}</p>
            <h3 className="mt-1 text-lg font-bold leading-snug text-slate-900">{t.titulo}</h3>
            <ul className="mt-4 flex-1 space-y-2.5">
              {t.puntos.map((p, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-slate-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
