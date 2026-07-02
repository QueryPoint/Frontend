import { api } from '../api/client';
import type { RegisterResponse } from '../types/auth';

interface Credentials {
  username: string;
  password: string;
}

export const authService = {
  login: (data: Credentials) => api.post<RegisterResponse>('/auth/login', data),
  register: (data: Credentials) => api.post<RegisterResponse>('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<RegisterResponse['user']>('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
};
