import { useState, type FormEvent } from 'react';
import { Save, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { useUpdateProfile } from '../../hooks/queries';
import { Badge, Button, Card, CardBody, CardHeader, DemoTag, Field, Input, PageHeader, Select, StatusBadge } from '../../components/ui';
import { LocationPicker, type LocationValue } from '../../components/domain/LocationPicker';
import { ROLE_LABELS, VERIFICATION_STATUS, formatLiters } from '../../lib/format';
import { ACTIVITY_TYPES } from '../../types';

export default function ProfilePage() {
  const { session, refresh } = useAuth();
  const update = useUpdateProfile();

  const role = session?.profile.role ?? 'producer';
  const roleProfile = session?.producer ?? session?.supplier ?? session?.carrier ?? null;
  const initialOrg = session?.producer?.organization_name ?? session?.supplier?.business_name ?? session?.carrier?.company_name ?? '';

  const [fullName, setFullName] = useState(session?.profile.full_name ?? '');
  const [phone, setPhone] = useState(session?.profile.phone ?? '');
  const [org, setOrg] = useState(initialOrg);
  const [activity, setActivity] = useState<string>(session?.producer?.activity_type ?? 'Agricultura');
  // Texto, no número: permite vaciar el campo mientras se escribe (ver NewDemandPage).
  const [capacity, setCapacity] = useState(String(session?.supplier?.capacity_liters ?? session?.carrier?.capacity_liters ?? 10000));
  const [vehicle, setVehicle] = useState(session?.carrier?.vehicle_type ?? '');
  const [coverage, setCoverage] = useState(session?.carrier?.coverage_area ?? '');
  const [location, setLocation] = useState<LocationValue>({
    location_name: session?.producer?.location_name ?? session?.supplier?.location_name ?? 'Santa Cruz de la Sierra',
    latitude: roleProfile?.latitude ?? -17.7833,
    longitude: roleProfile?.longitude ?? -63.1821,
  });

  if (!session) return null;

  const orgLabel = role === 'producer' ? 'Organización productiva' : role === 'supplier' ? 'Razón social' : role === 'carrier' ? 'Empresa de transporte' : 'Organización';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = { full_name: fullName, phone: phone || null };
    if (role !== 'admin') {
      body.organization_name = org;
      body.location_name = location.location_name;
      body.latitude = location.latitude;
      body.longitude = location.longitude;
    }
    if (role === 'producer') body.activity_type = activity;
    if (role === 'supplier' || role === 'carrier') {
      const capacityValue = Number(capacity);
      if (!Number.isFinite(capacityValue) || capacityValue < 100) return toast.error('La capacidad mínima es 100 L');
      body.capacity_liters = Math.round(capacityValue);
    }
    if (role === 'carrier') {
      body.vehicle_type = vehicle;
      body.coverage_area = coverage;
    }
    update.mutate(body, {
      onSuccess: async () => {
        await refresh();
        toast.success('Perfil actualizado');
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div>
      <PageHeader title="Mi perfil" description="Datos de tu cuenta y de tu perfil operativo dentro de la simulación." />
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <UserCircle className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{session.profile.full_name}</p>
              <Badge tone="green">{ROLE_LABELS[role]}</Badge>
            </div>
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</dt>
              <dd className="mt-0.5 break-all text-slate-800">{session.profile.email}</dd>
            </div>
            {session.producer && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">NIT (ficticio)</dt>
                <dd className="mt-0.5 font-mono text-slate-800">{session.producer.nit_demo}</dd>
              </div>
            )}
            {session.supplier && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Verificación</dt>
                <dd className="mt-1">
                  <StatusBadge map={VERIFICATION_STATUS} value={session.supplier.verification_status} />
                </dd>
              </div>
            )}
            {(session.supplier || session.carrier) && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Capacidad declarada</dt>
                <dd className="mt-0.5 text-slate-800">{formatLiters(session.supplier?.capacity_liters ?? session.carrier?.capacity_liters ?? 0)}</dd>
              </div>
            )}
          </dl>
          {session.isDemo && (
            <div className="mt-5 rounded-xl bg-fuel-50 p-3 text-xs text-fuel-800">
              <DemoTag className="mb-1.5" />
              Cuenta demo: los cambios se guardan solo en la simulación.
            </div>
          )}
        </Card>

        <form onSubmit={submit}>
          <Card>
            <CardHeader title="Editar perfil" subtitle="Nombre de contacto, organización y ubicación de referencia." />
            <CardBody className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombre completo">
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
                </Field>
                <Field label="Teléfono">
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+591 7xxxxxxx" />
                </Field>
              </div>
              {role !== 'admin' && (
                <Field label={orgLabel}>
                  <Input value={org} onChange={(e) => setOrg(e.target.value)} required minLength={2} />
                </Field>
              )}
              {role === 'producer' && (
                <Field label="Actividad productiva">
                  <Select value={activity} onChange={(e) => setActivity(e.target.value)}>
                    {ACTIVITY_TYPES.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              {(role === 'supplier' || role === 'carrier') && (
                <Field label="Capacidad (litros)">
                  <Input type="number" inputMode="numeric" min={100} step={100} value={capacity} onChange={(e) => setCapacity(e.target.value)} onFocus={(e) => e.target.select()} />
                </Field>
              )}
              {role === 'carrier' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Tipo de vehículo">
                    <Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="Cisterna 10.000 L" />
                  </Field>
                  <Field label="Zona de cobertura">
                    <Input value={coverage} onChange={(e) => setCoverage(e.target.value)} placeholder="Santa Cruz y Norte Integrado" />
                  </Field>
                </div>
              )}
              {role !== 'admin' && <LocationPicker value={location} onChange={setLocation} color={role === 'supplier' ? 'offer' : 'demand'} />}
              <div className="flex justify-end">
                <Button type="submit" loading={update.isPending} icon={<Save className="h-4 w-4" />}>
                  Guardar cambios
                </Button>
              </div>
            </CardBody>
          </Card>
        </form>
      </div>
    </div>
  );
}
