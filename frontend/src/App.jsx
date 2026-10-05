import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { CollectorRoute, TahsildarRoute, StateGovtRoute } from './components/OfficerRoute';

import Home      from './pages/Home';
import Login     from './pages/Login';
import Register  from './pages/Register';
import Upload    from './pages/Upload';
import Apply     from './pages/Apply';
import Track     from './pages/Track';
import CertificatePage from './pages/CertificatePage';

import TahsildarLogin     from './pages/tahsildar/TahsildarLogin';
import TahsildarDashboard from './pages/tahsildar/TahsildarDashboard';
import TahsildarDetail    from './pages/tahsildar/TahsildarDetail';

import CollectorLogin from './pages/collector/CollectorLogin';
import { CollectorDashboard, CollectorDetail } from './pages/collector/Collector';
import StateGovtLogin from './pages/StateGovt/StateGovtLogin';
import StateGovtPortal from './pages/StateGovt/StateGovtPortal';

import './index.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/"         element={<Home />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/track"           element={<Track />} />
          <Route path="/track/:ref"      element={<Track />} />
          <Route path="/dashboard"      element={<Track />} />
          <Route path="/certificate/:ref" element={<CertificatePage />} />

          {/* Maharashtra State Government Portal (Visa Design System) */}
          <Route path="/maharashtra-govt/login" element={<StateGovtLogin />} />
          <Route path="/state-govt/login"       element={<StateGovtLogin />} />
          <Route path="/maharashtra-govt"       element={<StateGovtRoute><StateGovtPortal /></StateGovtRoute>} />
          <Route path="/state-govt"             element={<StateGovtRoute><StateGovtPortal /></StateGovtRoute>} />

          {/* Citizen – protected */}
          <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
          <Route path="/apply"  element={<ProtectedRoute><Apply  /></ProtectedRoute>} />

          {/* Tahsildar */}
          <Route path="/tahsildar/login"              element={<TahsildarLogin />} />
          <Route path="/tahsildar/dashboard"          element={<TahsildarRoute><TahsildarDashboard /></TahsildarRoute>} />
          <Route path="/tahsildar/application/:id"    element={<TahsildarRoute><TahsildarDetail /></TahsildarRoute>} />

          {/* Collector */}
          <Route path="/collector/login"              element={<CollectorLogin />} />
          <Route path="/collector/dashboard"          element={<CollectorRoute><CollectorDashboard /></CollectorRoute>} />
          <Route path="/collector/application/:id"    element={<CollectorRoute><CollectorDetail /></CollectorRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
