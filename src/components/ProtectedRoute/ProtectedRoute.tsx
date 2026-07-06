import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { state } = useAuthStore();

  if (state === 'unknown' || state === 'refreshing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (state === 'unauthenticated') return <Navigate to="/login" replace />;
  return <>{children}</>;
};
