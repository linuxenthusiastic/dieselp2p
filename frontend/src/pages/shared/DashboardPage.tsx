import { lazy, Suspense } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { SkeletonCards } from '../../components/ui/Feedback';

const ProducerDashboard = lazy(() => import('../producer/ProducerDashboard'));
const SupplierDashboard = lazy(() => import('../supplier/SupplierDashboard'));
const CarrierDashboard = lazy(() => import('../carrier/CarrierDashboard'));
const AdminDashboard = lazy(() => import('../admin/AdminDashboard'));

/** Dashboard según rol del usuario autenticado. */
export default function DashboardPage() {
  const { role } = useAuth();
  const Dashboard = role === 'admin' ? AdminDashboard : role === 'supplier' ? SupplierDashboard : role === 'carrier' ? CarrierDashboard : ProducerDashboard;
  return (
    <Suspense fallback={<SkeletonCards />}>
      <Dashboard />
    </Suspense>
  );
}
