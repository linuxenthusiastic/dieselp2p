import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from './layouts/PublicLayout';
import { AppLayout } from './layouts/AppLayout';
import { FullScreenLoader, RequireAuth, RequireRole } from './components/RouteGuards';

// Públicas
const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const LoginPage = lazy(() => import('./pages/public/LoginPage'));
const RegisterPage = lazy(() => import('./pages/public/RegisterPage'));
const VerifyPage = lazy(() => import('./pages/public/VerifyPage'));

// Compartidas (contenido según rol)
const DashboardPage = lazy(() => import('./pages/shared/DashboardPage'));
const MapPage = lazy(() => import('./pages/shared/MapPage'));
const ImpactPage = lazy(() => import('./pages/shared/ImpactPage'));
const ProfilePage = lazy(() => import('./pages/shared/ProfilePage'));
const OperationsPage = lazy(() => import('./pages/shared/OperationsPage'));
const OperationDetailPage = lazy(() => import('./pages/shared/OperationDetailPage'));
const MatchesPage = lazy(() => import('./pages/shared/MatchesPage'));
const MatchDetailPage = lazy(() => import('./pages/shared/MatchDetailPage'));
const DemandsPage = lazy(() => import('./pages/shared/DemandsPage'));
const DemandDetailPage = lazy(() => import('./pages/shared/DemandDetailPage'));
const OffersPage = lazy(() => import('./pages/shared/OffersPage'));
const TransportPage = lazy(() => import('./pages/shared/TransportPage'));

// Productor
const NewDemandPage = lazy(() => import('./pages/producer/NewDemandPage'));
// Proveedor
const NewOfferPage = lazy(() => import('./pages/supplier/NewOfferPage'));
// Transportista
const TransportRoutePage = lazy(() => import('./pages/carrier/TransportRoutePage'));
// Admin
const AnomaliesPage = lazy(() => import('./pages/admin/AnomaliesPage'));
const UsersPage = lazy(() => import('./pages/admin/UsersPage'));
const AnalyticsPage = lazy(() => import('./pages/admin/AnalyticsPage'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'));

export default function App() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/verify/:token" element={<VerifyPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="operations" element={<OperationsPage />} />
            <Route path="operations/:id" element={<OperationDetailPage />} />

            <Route element={<RequireRole roles={['producer', 'admin']} />}>
              <Route path="impact" element={<ImpactPage />} />
              <Route path="demands/new" element={<NewDemandPage />} />
            </Route>
            <Route element={<RequireRole roles={['producer', 'supplier', 'admin']} />}>
              <Route path="demands" element={<DemandsPage />} />
              <Route path="demands/:id" element={<DemandDetailPage />} />
              <Route path="matches" element={<MatchesPage />} />
              <Route path="matches/:id" element={<MatchDetailPage />} />
            </Route>
            <Route element={<RequireRole roles={['supplier', 'admin']} />}>
              <Route path="offers" element={<OffersPage />} />
              <Route path="offers/new" element={<NewOfferPage />} />
            </Route>
            <Route element={<RequireRole roles={['carrier', 'admin']} />}>
              <Route path="transport" element={<TransportPage />} />
              <Route path="transport/:id" element={<TransportRoutePage />} />
            </Route>
            <Route element={<RequireRole roles={['admin']} />}>
              <Route path="anomalies" element={<AnomaliesPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
