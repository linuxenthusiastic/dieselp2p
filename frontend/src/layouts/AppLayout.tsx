import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AlertTriangle, BarChart3, Fuel, Home, LogOut, Map, Menu, Package, Settings, Target, Truck, Users, X, UserCircle, Leaf } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../hooks/useAuth';
import { Logo, DemoTag } from '../components/ui/Logo';
import { ROLE_LABELS } from '../lib/format';
import type { Role } from '../types';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
  roles: Role[];
}

const NAV: NavItem[] = [
  { to: '/app/dashboard', label: 'Dashboard', icon: Home, roles: ['producer', 'supplier', 'carrier', 'admin'] },
  { to: '/app/demands', label: 'Demandas', icon: Package, roles: ['producer', 'supplier', 'admin'] },
  { to: '/app/offers', label: 'Ofertas', icon: Fuel, roles: ['supplier', 'admin'] },
  { to: '/app/matches', label: 'Matches', icon: Target, roles: ['producer', 'supplier', 'admin'] },
  { to: '/app/transport', label: 'Transporte', icon: Truck, roles: ['carrier', 'admin'] },
  { to: '/app/operations', label: 'Operaciones', icon: Leaf, roles: ['producer', 'supplier', 'carrier', 'admin'] },
  { to: '/app/map', label: 'Mapa', icon: Map, roles: ['producer', 'supplier', 'carrier', 'admin'] },
  { to: '/app/impact', label: 'Impacto', icon: BarChart3, roles: ['producer', 'admin'] },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin'] },
  { to: '/app/anomalies', label: 'Anomalías', icon: AlertTriangle, roles: ['admin'] },
  { to: '/app/users', label: 'Usuarios', icon: Users, roles: ['admin'] },
  { to: '/app/profile', label: 'Perfil', icon: UserCircle, roles: ['producer', 'supplier', 'carrier', 'admin'] },
  { to: '/app/settings', label: 'Configuración', icon: Settings, roles: ['admin'] },
];

export function AppLayout() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const role = session?.profile.role ?? 'producer';
  const items = NAV.filter((n) => n.roles.includes(role));
  const orgName = session?.producer?.organization_name ?? session?.supplier?.business_name ?? session?.carrier?.company_name ?? 'DieselP2P';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-5">
        <Logo />
        <button className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mx-4 mb-4 rounded-xl bg-brand-50 px-3 py-2.5">
        <p className="truncate text-sm font-semibold text-brand-900">{orgName}</p>
        <p className="text-xs text-brand-700">{ROLE_LABELS[role]}</p>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 scrollbar-thin">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )
            }
          >
            <item.icon className="h-4.5 w-4.5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-100 p-4">
        <DemoTag className="mb-3" />
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-float animate-fade-in">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100" aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </button>
          <Logo />
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
        <footer className="px-6 py-4 text-center text-xs text-slate-400">DieselP2P · MVP demo con datos simulados · Menos intermediación. Más transparencia. Mejor distribución.</footer>
      </div>
    </div>
  );
}
