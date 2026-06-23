import { api } from './api';
import { type User } from '../types/auth';

export interface LoginData { username: string; password: string; }
export interface RegisterData { username: string; password: string; }
export interface AuthResponse { user: User; }

export const authService = {
  me: () => api.get<User>('/auth/me'),
  login: (data: LoginData) => api.post<AuthResponse>('/auth/login', data),
  register: (data: RegisterData) => api.post<AuthResponse>('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh'),
};
