import { api } from '../services/api';
import type { AuthResponse, User } from '../types/auth';

interface Credentials {
  username: string;
  password: string;
}

export const authService = {
  login: (data: Credentials) => api.post<AuthResponse>('/login', data),
  register: (data: Credentials) => api.post<AuthResponse>('/registration', data),
  logout: () => api.post('/logout'),
  me: () => api.get<User>('/me'),
  refresh: () => api.post('/refresh'),
};