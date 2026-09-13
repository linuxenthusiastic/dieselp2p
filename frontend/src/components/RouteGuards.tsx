import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '../types';
import { Loader2 } from 'lucide-react';

export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
    </div>
  );
}

export function RequireAuth() {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <Outlet />;
}

export function RequireRole({ roles }: { roles: Role[] }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (!roles.includes(session.profile.role)) return <Navigate to="/app/dashboard" replace />;
  return <Outlet />;
}
