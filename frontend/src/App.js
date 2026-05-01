// =============================================================================
// src/App.js — Point d'entrée React avec routage
// =============================================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Equipements from './pages/Equipements';
import OrdresTravail from './pages/OrdresTravail';
import Capteurs from './pages/Capteurs';
import AlertesIA from './pages/AlertesIA';
import Stock from './pages/Stock';
import Simulateur from './pages/Simulateur';
import './index.css';

// Guard : redirige vers login si non connecté
function PrivateRoute({ children }) {
  const { utilisateur } = useAuth();
  return utilisateur ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { utilisateur } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={
        utilisateur ? <Navigate to="/dashboard" replace /> : <Login />
      } />
      <Route path="/dashboard"      element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/equipements"    element={<PrivateRoute><Equipements /></PrivateRoute>} />
      <Route path="/ordres-travail" element={<PrivateRoute><OrdresTravail /></PrivateRoute>} />
      <Route path="/capteurs"       element={<PrivateRoute><Capteurs /></PrivateRoute>} />
      <Route path="/alertes-ia"     element={<PrivateRoute><AlertesIA /></PrivateRoute>} />
      <Route path="/stock"          element={<PrivateRoute><Stock /></PrivateRoute>} />
      <Route path="/simulateur"     element={<PrivateRoute><Simulateur /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
