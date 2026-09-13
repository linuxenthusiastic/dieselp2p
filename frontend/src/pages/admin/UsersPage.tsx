import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BadgeCheck, Search, UserX, UserCheck } from 'lucide-react';
import clsx from 'clsx';
import { Badge, Button, DataTable, ErrorState, Input, PageHeader, Select, SkeletonTable, type Column } from '../../components/ui';
import { useUpdateUser, useUsers } from '../../hooks/queries';
import { ROLE_LABELS } from '../../lib/format';
import type { Role, UserRow } from '../../types';

const ROLES: Role[] = ['producer', 'supplier', 'carrier', 'admin'];
const roleTone = { producer: 'green', supplier: 'yellow', carrier: 'blue', admin: 'gray' } as const;

function Actions({ u }: { u: UserRow }) {
  const update = useUpdateUser();
  const toggle = () => {
    const next = u.status === 'active' ? 'suspended' : 'active';
    if (!window.confirm(`¿${next === 'suspended' ? 'Suspender' : 'Reactivar'} a ${u.full_name}?`)) return;
    update.mutate({ id: u.id, status: next }, { onSuccess: () => toast.success(next === 'suspended' ? 'Usuario suspendido' : 'Usuario reactivado'), onError: (e) => toast.error(e.message) });
  };
  const verify = () =>
    update.mutate({ id: u.id, verification_status: 'VERIFIED' }, { onSuccess: () => toast.success('Proveedor verificado'), onError: (e) => toast.error(e.message) });
  return (
    <div className="flex justify-end gap-1.5">
      {u.role === 'supplier' && u.detail.includes('PENDING') && (
        <Button size="sm" variant="secondary" icon={<BadgeCheck className="h-3.5 w-3.5" />} loading={update.isPending} onClick={verify}>
          Verificar
        </Button>
      )}
      {u.role !== 'admin' && (
        <Button size="sm" variant={u.status === 'active' ? 'outline' : 'primary'} icon={u.status === 'active' ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />} loading={update.isPending} onClick={toggle}>
          {u.status === 'active' ? 'Suspender' : 'Reactivar'}
        </Button>
      )}
    </div>
  );
}

const columns: Column<UserRow>[] = [
  {
    key: 'user',
    header: 'Usuario',
    render: (u) => (
      <div>
        <p className="font-medium text-slate-900">{u.full_name}</p>
        <p className="text-xs text-slate-500">{u.email}</p>
      </div>
    ),
  },
  { key: 'role', header: 'Rol', render: (u) => <Badge tone={roleTone[u.role]}>{ROLE_LABELS[u.role]}</Badge> },
  { key: 'org', header: 'Organización', render: (u) => u.organization },
  { key: 'loc', header: 'Ubicación', render: (u) => <span className="text-slate-500">{u.location}</span> },
  { key: 'detail', header: 'Detalle', render: (u) => <span className="text-xs text-slate-500">{u.detail}</span> },
  { key: 'anomalies', header: 'Anomalías', align: 'center', render: (u) => (u.openAnomalies > 0 ? <Badge tone="red">{u.openAnomalies}</Badge> : <span className="text-slate-300">—</span>) },
  { key: 'status', header: 'Estado', render: (u) => <Badge tone={u.status === 'active' ? 'green' : 'red'} dot>{u.status === 'active' ? 'Activo' : 'Suspendido'}</Badge> },
  { key: 'actions', header: '', align: 'right', render: (u) => <Actions u={u} /> },
];

export default function UsersPage() {
  const { data, isLoading, isError, refetch } = useUsers();
  const [role, setRole] = useState<Role | 'ALL'>('ALL');
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter(
      (u) => (role === 'ALL' || u.role === role) && (!needle || [u.full_name, u.email, u.organization].some((s) => s.toLowerCase().includes(needle))),
    );
  }, [data, role, q]);

  return (
    <div>
      <PageHeader title="Usuarios" description="Productores, proveedores, transportistas y administradores de la simulación." />
      {isLoading && <SkeletonTable rows={8} />}
      {isError && <ErrorState retry={() => void refetch()} />}
      {data && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => {
              const n = data.filter((u) => u.role === r).length;
              return (
                <button
                  key={r}
                  onClick={() => setRole(role === r ? 'ALL' : r)}
                  className={clsx('rounded-full border px-3 py-1 text-xs font-medium transition', role === r ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}
                >
                  {ROLE_LABELS[r]} · {n}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="Buscar por nombre, email u organización" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select className="sm:w-52" value={role} onChange={(e) => setRole(e.target.value as Role | 'ALL')}>
              <option value="ALL">Todos los roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </div>
          <DataTable columns={columns} rows={rows} emptyMessage="No se encontraron usuarios" />
        </div>
      )}
    </div>
  );
}
