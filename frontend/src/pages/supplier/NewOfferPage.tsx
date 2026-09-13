import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Fuel, Send } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCreateOffer } from '../../hooks/queries';
import { Button, Card, CardBody, CardHeader, Field, Input, PageHeader } from '../../components/ui';
import { LocationPicker, type LocationValue } from '../../components/domain/LocationPicker';
import { ApiError } from '../../lib/api';

const plusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export default function NewOfferPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const create = useCreateOffer();
  const supplier = session?.supplier;

  const [liters, setLiters] = useState('5000');
  const [price, setPrice] = useState('3.75');
  const [date, setDate] = useState(plusDays(2));
  const [location, setLocation] = useState<LocationValue>({
    location_name: supplier?.location_name ?? 'Santa Cruz de la Sierra',
    latitude: supplier?.latitude ?? -17.7833,
    longitude: supplier?.longitude ?? -63.1821,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    const l = Number(liters);
    const p = Number(price);
    if (!Number.isInteger(l) || l < 100) e.liters = 'Mínimo 100 litros (número entero).';
    if (!(p > 0)) e.price = 'El precio debe ser mayor a 0.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) e.date = 'Fecha inválida.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    try {
      await create.mutateAsync({
        available_liters: Number(liters),
        price_per_liter: Number(price),
        available_date: date,
        ...location,
      });
      toast.success('Oferta publicada', { description: `${Number(liters).toLocaleString('es-BO')} L disponibles en ${location.location_name}` });
      navigate('/app/offers');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo publicar la oferta');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Proveedor" title="Nueva oferta" description="Publica el volumen de diésel disponible para que el motor de matching lo combine con demandas cercanas." />
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Volumen y precio" subtitle="Los precios y volúmenes son simulados" />
          <CardBody className="space-y-4">
            <Field label="Litros disponibles" error={errors.liters}>
              <Input type="number" min={100} step={100} value={liters} onChange={(e) => setLiters(e.target.value)} required />
            </Field>
            <Field label="Precio por litro (Bs)" error={errors.price} hint="Precio ficticio de referencia para la demo">
              <Input type="number" min={0.01} step={0.01} value={price} onChange={(e) => setPrice(e.target.value)} required />
            </Field>
            <Field label="Disponible desde" error={errors.date}>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <div className="rounded-xl bg-brand-50 px-3 py-2.5 text-xs text-brand-800">
              <Fuel className="mr-1.5 inline h-3.5 w-3.5" />
              Tu oferta podrá combinarse con otras para cubrir demandas mayores (matching multi-proveedor).
            </div>
          </CardBody>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader title="Ubicación de la oferta" subtitle="Punto de carga aproximado" />
          <CardBody className="space-y-4">
            <LocationPicker value={location} onChange={setLocation} color="offer" />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancelar</Button>
              <Button type="submit" variant="accent" loading={create.isPending} icon={<Send className="h-4 w-4" />}>Publicar oferta</Button>
            </div>
          </CardBody>
        </Card>
      </form>
    </div>
  );
}
