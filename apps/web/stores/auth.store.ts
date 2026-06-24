import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '@/lib/api-client';

export type UserRole = 'ADMIN' | 'DEVELOPER' | 'VIEWER';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await apiClient.post<{ data: { access_token: string; user: AuthUser } }>(
            '/api/auth/login',
            { email, password },
          );
          const { access_token, user } = data.data;
          localStorage.setItem('access_token', access_token);
          set({ token: access_token, user, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: () => {
        localStorage.removeItem('access_token');
        set({ user: null, token: null });
        window.location.href = '/login';
      },

      fetchMe: async () => {
        const token = get().token ?? localStorage.getItem('access_token');
        if (!token) return;
        try {
          const { data } = await apiClient.get<{ data: AuthUser }>('/api/auth/me');
          set({ user: data.data });
        } catch {
          set({ user: null, token: null });
        }
      },
    }),
    {
      name: 'hallo-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);
