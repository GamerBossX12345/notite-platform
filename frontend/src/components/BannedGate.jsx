import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

// Banned users pot naviga liber pe site (citi notițe), dar dacă încearcă
// pagini de scriere (/upload, /settings, /admin), îi trimitem la /banned.
const WRITE_ONLY_PATHS = ['/upload', '/settings', '/admin'];

export default function BannedGate() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading || !user) return;
    if (!user.banned) return;
    if (WRITE_ONLY_PATHS.some(p => location.pathname.startsWith(p))) {
      navigate('/banned', { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  return null;
}
