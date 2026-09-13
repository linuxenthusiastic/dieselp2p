import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { useConfig } from '../../hooks/queries';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select } from '../../components/ui/Field';
import { Logo, DemoTag } from '../../components/ui/Logo';
import { ACTIVITY_TYPES, type Role } from '../../types';

type RegisterRole = Exclude<Role, 'admin'>;

export default function RegisterPage() {
  const { register } = useAuth();
  const { data: config } = useConfig();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'producer' as RegisterRole,
    organization_name: '',
    phone: '',
    location_name: 'Santa Cruz de la Sierra',
    activity_type: 'Agricultura',
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const supabaseOn = config?.supabaseConfigured ?? false;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await register(form);
      if (res.needsConfirmation) {
        toast.success('Cuenta creada. Revisa tu correo para confirmar el acceso.');
        navigate('/login');
      } else {
        toast.success('Cuenta creada');
        navigate('/app/dashboard');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo registrar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/">
            <Logo />
          </Link>
          <DemoTag />
        </div>
        <div className="card p-6 sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Crear cuenta</h1>
          <p className="mt-1 text-sm text-slate-500">Registro con Supabase Auth. Los perfiles se crean como participantes de la simulación.</p>
          {!supabaseOn && (
            <div className="mt-4 rounded-xl border border-fuel-200 bg-fuel-50 px-4 py-3 text-sm text-fuel-800">
              Supabase no está configurado en este entorno. Usa el{' '}
              <Link to="/login" className="font-semibold underline">
                acceso demo por rol
              </Link>
              .
            </div>
          )}
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre completo">
                <Input value={form.full_name} onChange={set('full_name')} required minLength={2} />
              </Field>
              <Field label="Teléfono">
                <Input value={form.phone} onChange={set('phone')} placeholder="+591 …" />
              </Field>
            </div>
            <Field label="Correo">
              <Input type="email" value={form.email} onChange={set('email')} required />
            </Field>
            <Field label="Contraseña" hint="Mínimo 8 caracteres">
              <Input type="password" value={form.password} onChange={set('password')} required minLength={8} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Rol">
                <Select value={form.role} onChange={set('role')}>
                  <option value="producer">Productor / Comprador</option>
                  <option value="supplier">Proveedor / Vendedor</option>
                  <option value="carrier">Transportista</option>
                </Select>
              </Field>
              <Field label="Zona">
                <Select value={form.location_name} onChange={set('location_name')}>
                  {(config?.zones ?? [{ name: 'Santa Cruz de la Sierra', latitude: 0, longitude: 0, department: '' }]).map((z) => (
                    <option key={z.name} value={z.name}>
                      {z.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label={form.role === 'carrier' ? 'Empresa de transporte' : form.role === 'supplier' ? 'Razón social' : 'Organización productiva'}>
              <Input value={form.organization_name} onChange={set('organization_name')} required minLength={2} />
            </Field>
            {form.role === 'producer' && (
              <Field label="Actividad">
                <Select value={form.activity_type} onChange={set('activity_type')}>
                  {ACTIVITY_TYPES.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </Select>
              </Field>
            )}
            <Button type="submit" className="w-full" loading={busy} disabled={!supabaseOn}>
              Crear cuenta
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-semibold text-brand-700 hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
