import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

// Route protégée côté ADMIN :
// - non connecté -> redirection vers /login
// - connecté mais rôle user -> redirection vers la page d'accueil
// La fonction fetchMe rafraîchit le rôle depuis le serveur au montage
// (pour refléter une éventuelle promotion ADMIN en cours de session).
export default function AdminRoute({ children }) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const location = useLocation();
  const [checking, setChecking] = useState(!user);

  useEffect(() => {
    if (user) return;
    setChecking(true);
    fetchMe()
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [user, fetchMe]);

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (checking) {
    return <p className="home__message">Vérification des droits...</p>;
  }

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return children;
}