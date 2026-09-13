import { Link } from 'react-router-dom';
import { ArrowRight, ArrowDown, Map, Target, ShieldCheck, AlertTriangle, BarChart3, Fuel, Tractor, Truck, Wheat, Network, Layers, Info, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { DemoTag } from '../../components/ui/Logo';
import { MatchingDeepDive } from '../../components/landing/MatchingDeepDive';
import { Tracks } from '../../components/landing/Tracks';

const STEPS = [
  { n: 1, title: 'Publica tu necesidad', text: 'El productor indica litros, ubicación y fecha requerida.' },
  { n: 2, title: 'Encuentra ofertas', text: 'La plataforma localiza proveedores verificados con volumen disponible.' },
  { n: 3, title: 'Optimiza el match', text: 'El motor combina una o varias ofertas al menor costo total.' },
  { n: 4, title: 'Coordina transporte', text: 'Un transportista con capacidad y cobertura recibe la ruta.' },
  { n: 5, title: 'Obtén trazabilidad', text: 'Cada operación tiene código, QR y estados verificables.' },
];

const PILLARS = [
  {
    icon: Target,
    title: 'Matching',
    text: 'Reparte una demanda entre varios proveedores buscando el menor costo total, y explica por qué recomienda esa combinación.',
  },
  {
    icon: Map,
    title: 'Mapa',
    text: 'Ofertas, demandas, transportistas y rutas sobre OpenStreetMap. Ver dónde está el combustible cambia la decisión.',
  },
  {
    icon: ShieldCheck,
    title: 'Trazabilidad',
    text: 'Cada operación tiene código, estados de entrega y un QR verificable sin iniciar sesión. Quien entregó qué queda registrado.',
  },
  {
    icon: AlertTriangle,
    title: 'Anomalías',
    text: 'Volúmenes fuera de patrón, solicitudes repetidas y secuencias sospechosas quedan marcadas con un nivel de riesgo para revisión.',
  },
  {
    icon: BarChart3,
    title: 'Impacto',
    text: 'Volumen conectado, recorrido evitado y operaciones trazadas, agregados para ver el efecto de la plataforma en conjunto.',
  },
];

export default function LandingPage() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 text-white">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-fuel-400/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <div className="animate-fade-up">
            <DemoTag className="mb-6 border-fuel-300/70 bg-fuel-400/15 text-fuel-100" />
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Conectamos el combustible <span className="text-fuel-300">con quienes producen Bolivia.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-brand-100">
              Conectamos oferta y demanda. Optimizamos logística. Generamos trazabilidad.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login">
                <Button size="lg" variant="accent" icon={<ArrowRight className="h-5 w-5" />}>
                  Explorar demo
                </Button>
              </Link>
              <a href="#como-funciona">
                <Button size="lg" variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/10">
                  Ver cómo funciona
                </Button>
              </a>
            </div>
            <p className="mt-6 text-sm font-medium text-brand-200">Menos intermediación. Más transparencia. Mejor distribución.</p>
          </div>

          {/* Visual del match multi-proveedor */}
          <div className="animate-fade-up rounded-3xl border border-white/15 bg-white/10 p-6 shadow-float backdrop-blur" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-200">Match óptimo encontrado</p>
              <span className="rounded-full bg-fuel-400 px-2.5 py-0.5 text-xs font-bold text-brand-950">Score 94/100</span>
            </div>
            <p className="mt-2 text-3xl font-extrabold">10.000 L cubiertos</p>
            <div className="mt-5 space-y-2">
              {[
                { name: 'Proveedor A · Montero', liters: '7.000 L', pct: 70 },
                { name: 'Proveedor B · Warnes', liters: '3.000 L', pct: 30 },
              ].map((r) => (
                <div key={r.name} className="rounded-xl bg-white/10 p-3">
                  <div className="flex justify-between text-sm">
                    <span>{r.name}</span>
                    <span className="font-bold text-fuel-300">{r.liters}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full rounded-full bg-fuel-400" style={{ width: `${r.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-white/10 p-2"><p className="text-brand-200">Combustible</p><p className="font-bold">Bs 37.380</p></div>
              <div className="rounded-lg bg-white/10 p-2"><p className="text-brand-200">Transporte</p><p className="font-bold">Bs 1.128</p></div>
              <div className="rounded-lg bg-fuel-400/20 p-2 ring-1 ring-fuel-300/40"><p className="text-fuel-200">Ahorro est.</p><p className="font-bold text-fuel-200">Bs 4.101</p></div>
            </div>
            <p className="mt-3 text-[11px] text-brand-200">Ejemplo con datos simulados del MVP.</p>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="mx-auto max-w-7xl px-6 py-20">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">¿Cómo funciona?</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Cinco pasos, una operación trazable</h2>
        <div className="stagger mt-10 grid gap-5 md:grid-cols-5">
          {STEPS.map((s) => (
            <div key={s.n} className="card relative p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">{s.n}</span>
              <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EL PROBLEMA */}
      <section id="problema" className="bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">El problema</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">No es solo "no hay diésel"</h2>
            <p className="mt-4 text-slate-600">
              Oferta y demanda están fragmentadas y existe poca visibilidad sobre dónde está disponible el combustible, quién lo necesita, qué combinación de ofertas resulta más eficiente y cuál es el costo logístico real.
            </p>
            <p className="mt-3 text-slate-600">
              El diésel es transversal a agricultura, cosecha, procesamiento, transporte y distribución. Cada ineficiencia termina trasladándose al precio de los alimentos.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {[Tractor, Wheat, Truck, Fuel].map((Icon, i) => (
                <span key={i} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-600 shadow-card">
                  <Icon className="h-5 w-5" />
                </span>
              ))}
            </div>
          </div>
          <div className="card p-6">
            <FlowBox icon={Layers} label="Oferta fragmentada" />
            <PlusRow />
            <FlowBox icon={Network} label="Demanda fragmentada" />
            <PlusRow />
            <FlowBox icon={Info} label="Información limitada" />
            <ArrowRow />
            <FlowBox icon={AlertTriangle} label="Ineficiencia" tone="warn" />
            <ArrowRow />
            <FlowBox icon={BarChart3} label="Mayores costos" tone="danger" />
          </div>
        </div>
      </section>

      {/* SOLUCIÓN */}
      <section id="solucion" className="mx-auto max-w-7xl px-6 py-20">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Nuestra solución</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Un mercado inteligente de combustible productivo</h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          Reducir ineficiencias de información, asignación y logística mediante tecnología. No reemplaza los canales autorizados: los hace visibles, comparables y trazables.
        </p>
        <div className="stagger mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {PILLARS.map((p) => (
            <div key={p.title} className="card p-5 transition-transform hover:-translate-y-0.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <p.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-sm font-bold uppercase tracking-wide text-slate-900">{p.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <MatchingDeepDive />

      <Tracks />

      {/* CONCEPTO */}
      <section className="bg-brand-900 text-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-semibold">
            {['OFERTA + DEMANDA', 'MATCHING', 'LOGÍSTICA', 'TRAZABILIDAD', 'EFICIENCIA', 'CADENA ALIMENTARIA'].map((s, i, arr) => (
              <span key={s} className="flex items-center gap-3">
                <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">{s}</span>
                {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-fuel-300" />}
              </span>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/login">
              <Button size="lg" variant="accent" icon={<ArrowRight className="h-5 w-5" />}>
                Probar la demo end-to-end
              </Button>
            </Link>
            <p className="mt-4 text-xs text-brand-200">Simulación tecnológica de operaciones autorizadas. Sin pagos reales ni compra real de combustible.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function FlowBox({ icon: Icon, label, tone = 'neutral' }: { icon: typeof Layers; label: string; tone?: 'neutral' | 'warn' | 'danger' }) {
  const cls = tone === 'danger' ? 'bg-red-50 text-red-700 ring-red-200' : tone === 'warn' ? 'bg-fuel-50 text-fuel-800 ring-fuel-200' : 'bg-slate-50 text-slate-700 ring-slate-200';
  return (
    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ring-1 ring-inset ${cls}`}>
      <Icon className="h-4 w-4" /> {label}
    </div>
  );
}
const PlusRow = () => (
  <div className="flex justify-center py-1 text-slate-400">
    <Plus className="h-4 w-4" />
  </div>
);
const ArrowRow = () => (
  <div className="flex justify-center py-1 text-brand-500">
    <ArrowDown className="h-4 w-4" />
  </div>
);
