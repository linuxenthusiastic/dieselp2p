import { useCallback, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Fuel, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useConfirmMatch, useCreateDemand, useFindMatch } from '../../hooks/queries';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Field, Input, Select } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { LocationPicker, type LocationValue } from '../../components/domain/LocationPicker';
import { MatchSearchOverlay } from '../../components/domain/MatchSearchOverlay';
import { MatchResultPanel } from '../../components/domain/MatchResultPanel';
import { ACTIVITY_TYPES, type ActivityType, type MatchingResponse } from '../../types';
import { formatLiters } from '../../lib/format';

const plusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Paso 1 de la demo: el productor publica una demanda y el motor busca el match óptimo. */
export default function NewDemandPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const producer = session?.producer;
  // Los campos numéricos se guardan como texto: permite borrarlos por completo
  // sin que un Number('') los deje pegados en 0 mientras se escribe.
  const [liters, setLiters] = useState('10000');
  const [targetPrice, setTargetPrice] = useState('19.30');
  const [date, setDate] = useState(plusDays(7));
  const [activity, setActivity] = useState<ActivityType>(producer?.activity_type ?? 'Agricultura');
  const [location, setLocation] = useState<LocationValue>({
    location_name: producer?.location_name ?? 'Santa Cruz de la Sierra',
    latitude: producer?.latitude ?? -17.7833,
    longitude: producer?.longitude ?? -63.1821,
  });
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<MatchingResponse | null>(null);
  const [pending, setPending] = useState<MatchingResponse | null>(null);
  const createDemand = useCreateDemand();
  const findMatch = useFindMatch();
  const confirmMatch = useConfirmMatch();

  const litersValue = Number(liters);
  const priceValue = targetPrice.trim() === '' ? null : Number(targetPrice);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!Number.isFinite(litersValue) || litersValue < 100) return toast.error('El volumen mínimo es 100 L');
    if (priceValue !== null && (!Number.isFinite(priceValue) || priceValue <= 0)) return toast.error('El precio objetivo debe ser mayor que 0');
    if (!date) return toast.error('Indica la fecha requerida');
    setSearching(true);
    setResult(null);
    setPending(null);
    try {
      const created = await createDemand.mutateAsync({
        requested_liters: Math.round(litersValue),
        target_price: priceValue,
        required_date: date,
        location_name: location.location_name,
        latitude: location.latitude,
        longitude: location.longitude,
        activity_type: activity,
      });
      if (created.anomalies.length > 0) toast.warning(`Se registró una alerta de revisión: ${created.anomalies[0].description}`);
      const res = await findMatch.mutateAsync(created.demand.id);
      setPending(res);
    } catch (err) {
      setSearching(false);
      toast.error(err instanceof Error ? err.message : 'No se pudo publicar la demanda');
    }
  };

  const onSearchDone = useCallback(() => {
    setSearching(false);
    setResult(pending);
    if (pending?.match) toast.success(`Match encontrado: ${formatLiters(pending.match.total_liters)} con ${pending.match.items.length} proveedor(es)`);
    else toast.info('No se encontraron ofertas compatibles');
  }, [pending]);

  const onConfirm = async (matchId: string) => {
    try {
      const op = await confirmMatch.mutateAsync(matchId);
      toast.success(`Operación ${op.operation_code} creada`);
      navigate(`/app/operations/${op.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo confirmar el match');
    }
  };

  return (
    <div>
      <MatchSearchOverlay open={searching} ready={pending !== null} analyzedOffers={pending?.analyzedOffers ?? null} onDone={onSearchDone} liters={Number.isFinite(litersValue) ? litersValue : 0} />
      <PageHeader eyebrow="Productor" title="Nueva demanda" description="Publica tu necesidad de diésel y deja que el motor combine las mejores ofertas verificadas." />

      {result ? (
        <div className="space-y-5">
          <MatchResultPanel result={result} onConfirm={onConfirm} confirming={confirmMatch.isPending} canConfirm={Boolean(result.match)} />
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setResult(null)}>
              Publicar otra demanda
            </Button>
            <Button variant="outline" onClick={() => navigate('/app/demands')}>
              Ir a mis demandas
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-5 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader title="¿Qué necesitas?" subtitle={producer ? `${producer.organization_name} · ${producer.activity_type}` : undefined} />
            <CardBody className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Volumen requerido (litros)" hint="El motor puede combinar varios proveedores para cubrirlo.">
                  <div className="relative">
                    <Fuel className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={100}
                      step={100}
                      value={liters}
                      onChange={(e) => setLiters(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="pl-9 text-lg font-semibold"
                      required
                    />
                  </div>
                </Field>
                <Field label="Precio objetivo (Bs/L)" hint="Opcional. Déjalo vacío para comparar contra el precio de referencia.">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0.01}
                    step={0.01}
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder="Sin precio objetivo"
                  />
                </Field>
                <Field label="Fecha requerida">
                  <Input type="date" value={date} min={plusDays(0)} onChange={(e) => setDate(e.target.value)} required />
                </Field>
                <Field label="Actividad">
                  <Select value={activity} onChange={(e) => setActivity(e.target.value as ActivityType)}>
                    {ACTIVITY_TYPES.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="flex flex-wrap gap-2">
                {[5000, 10000, 20000].map((v) => (
                  <button key={v} type="button" onClick={() => setLiters(String(v))} className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${litersValue === v ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'}`}>
                    {formatLiters(v)}
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader title="¿Dónde?" subtitle="Punto de entrega" />
            <CardBody>
              <LocationPicker value={location} onChange={setLocation} />
            </CardBody>
          </Card>
          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end lg:col-span-5">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button type="submit" size="lg" variant="accent" loading={createDemand.isPending || findMatch.isPending} icon={<Sparkles className="h-5 w-5" />}>
              Publicar y buscar ofertas
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
