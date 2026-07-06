import { useEffect } from 'react';
import axios from 'axios';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/auth';

export const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
  const { setState, setUser } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      setState('refreshing');
      try {
        const res = await authService.me();
        setUser(res.data);
      } catch (err: unknown) {
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        if (status === 401) {
          try {
            await authService.refresh();
            const res = await authService.me();
            setUser(res.data);
          } catch (refreshErr) {
            console.error('Session refresh failed', refreshErr);
            setState('unauthenticated');
          }
        } else {
          console.error('Auth check failed', err);
          setState('unauthenticated');
        }
      }
    };
    init();
  }, []);

  return <>{children}</>;
};
