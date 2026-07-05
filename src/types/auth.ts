export interface User {
  id: string;
  username: string;
  created_at: string;
}

export interface RegisterFormData {
  username: string;
  password: string;
  repeatPassword: string;
}

export interface AuthResponse {
  user_id: string;
  username: string;
}

export type AuthState = 'unknown' | 'authenticated' | 'unauthenticated' | 'refreshing';