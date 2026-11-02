import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { PageLoader } from './components/ui';
import { useAuth } from './lib/auth';
import Login from './pages/Login';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clientes = lazy(() => import('./pages/Clientes'));
const ClienteDetalle = lazy(() => import('./pages/ClienteDetalle'));
const Membresias = lazy(() => import('./pages/Membresias'));
const Planes = lazy(() => import('./pages/Planes'));
const Productos = lazy(() => import('./pages/Productos'));
const Vender = lazy(() => import('./pages/Vender'));
const Deudas = lazy(() => import('./pages/Deudas'));
const Caja = lazy(() => import('./pages/Caja'));
const CajaFuerte = lazy(() => import('./pages/CajaFuerte'));
const Reportes = lazy(() => import('./pages/Reportes'));
const Empleados = lazy(() => import('./pages/Empleados'));
const Usuarios = lazy(() => import('./pages/Usuarios'));
const Kiosko = lazy(() => import('./pages/Kiosko'));

function Protected({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && !isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/kiosko" element={<Kiosko />} />
        <Route
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="clientes/:id" element={<ClienteDetalle />} />
          <Route path="membresias" element={<Membresias />} />
          <Route path="planes" element={<Planes />} />
          <Route path="productos" element={<Productos />} />
          <Route path="vender" element={<Vender />} />
          <Route path="deudas" element={<Deudas />} />
          <Route path="caja" element={<Caja />} />
          <Route path="caja-fuerte" element={<CajaFuerte />} />
          <Route path="reportes" element={<Reportes />} />
          <Route
            path="empleados"
            element={
              <Protected admin>
                <Empleados />
              </Protected>
            }
          />
          <Route
            path="usuarios"
            element={
              <Protected admin>
                <Usuarios />
              </Protected>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
