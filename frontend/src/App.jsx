import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Home      from './pages/Home';
import Login     from './pages/Login';
import Register  from './pages/Register';
import Upload    from './pages/Upload';
import Apply     from './pages/Apply';

import TahsildarLogin     from './pages/tahsildar/TahsildarLogin';
import TahsildarDashboard from './pages/tahsildar/TahsildarDashboard';
import TahsildarDetail    from './pages/tahsildar/TahsildarDetail';

import CollectorLogin from './pages/collector/CollectorLogin';
import { CollectorDashboard, CollectorDetail } from './pages/collector/Collector';

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

          {/* Citizen – protected */}
          <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
          <Route path="/apply"  element={<ProtectedRoute><Apply  /></ProtectedRoute>} />

          {/* Tahsildar */}
          <Route path="/tahsildar/login"              element={<TahsildarLogin />} />
          <Route path="/tahsildar/dashboard"          element={<TahsildarDashboard />} />
          <Route path="/tahsildar/application/:id"    element={<TahsildarDetail />} />

          {/* Collector */}
          <Route path="/collector/login"              element={<CollectorLogin />} />
          <Route path="/collector/dashboard"          element={<CollectorDashboard />} />
          <Route path="/collector/application/:id"    element={<CollectorDetail />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
