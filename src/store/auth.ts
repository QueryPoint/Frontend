import { create } from 'zustand';
import { type User, type AuthState } from '../types/auth';

interface AuthStore {
  user: User | null;
  state: AuthState;
  setUser: (user: User) => void;
  setState: (state: AuthState) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  state: 'unknown',
  setUser: (user) => set({ user, state: 'authenticated' }),
  setState: (state) => set({ state }),
  logout: () => set({ user: null, state: 'unauthenticated' }),
}));
