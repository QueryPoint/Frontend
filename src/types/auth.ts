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

export interface RegisterResponse {
  user: User;
}

export type AuthState = 'unknown' | 'authenticated' | 'unauthenticated' | 'refreshing';
