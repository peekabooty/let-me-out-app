import { create } from 'zustand';

export type UserRole = 'EMPLOYEE' | 'VALIDATOR' | 'AUDITOR' | 'ADMIN';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

interface AuthState {
  user: SessionUser | null;
  isLoading: boolean;
  setUser: (user: SessionUser | null) => void;
  setLoading: (loading: boolean) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  clearSession: () => set({ user: null, isLoading: false }),
}));
