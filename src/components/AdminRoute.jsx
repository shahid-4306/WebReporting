import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function AdminRoute({ children }) {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  // Admin check - simple and direct
  const isAdminUser = user && (
    user.role === 'admin' || 
    user.role === 'ADMIN' || 
    user.username === 'ADMIN' || 
    user.id === 'ADMIN'
  );

  if (!isAdminUser) {
    return <Navigate to="/" replace />;
  }

  return children;
}