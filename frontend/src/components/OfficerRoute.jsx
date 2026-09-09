import { Navigate, useLocation } from 'react-router-dom';

/**
 * Route guard for Collector dashboard & details.
 * Redirects to /collector/login if collector_token is absent.
 */
export function CollectorRoute({ children }) {
  const token = localStorage.getItem('collector_token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/collector/login" state={{ from: location }} replace />;
  }
  return children;
}

/**
 * Route guard for Tahsildar dashboard & details.
 * Redirects to /tahsildar/login if tahsildar_token is absent.
 */
export function TahsildarRoute({ children }) {
  const token = localStorage.getItem('tahsildar_token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/tahsildar/login" state={{ from: location }} replace />;
  }
  return children;
}
