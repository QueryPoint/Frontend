// import { useEffect } from 'react';
// import { authService } from '../../services/authService';
// import { useAuthStore } from '../../store/auth';

// export const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
//   const { setState, setUser } = useAuthStore();

//   useEffect(() => {
//     const init = async () => {
//       setState('refreshing');
//       try {
//         const res = await authService.me();
//         setUser(res.data);
//       } catch (err: any) {
//         if (err.response?.status === 401) {
//           try {
//             await authService.refresh();
//             const res = await authService.me();
//             setUser(res.data);
//           } catch {
//             setState('unauthenticated');
//           }
//         } else {
//           setState('unauthenticated');
//         }
//       }
//     };
//     init();
//   }, []);

//   return <>{children}</>;
// };


import { useEffect } from 'react';
import { useAuthStore } from '../../store/auth';

export const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
  const { setUser } = useAuthStore();

  useEffect(() => {
    setUser({ id: '1', username: 'test_user', created_at: new Date().toISOString() });
  }, []);

  return <>{children}</>;
};