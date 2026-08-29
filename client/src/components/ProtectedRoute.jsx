import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

// Route protégée : redirige vers /login si l'utilisateur n'est pas connecté
export default function ProtectedRoute({ children }) {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();

  if (!token) {
    // On mémorise la page d'origine pour y revenir après connexion
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}