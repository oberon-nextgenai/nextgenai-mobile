import { create } from 'zustand';
import type { PublicUser } from '@/api/services/types';
import {
  clearStoredToken,
  setStoredToken,
  getStoredToken,
  getStoredUser,
  setStoredUser,
  clearStoredUser,
} from '@/api/client/authToken';
import { setInMemoryToken } from '@/api/client/http';

interface AuthState {
  token: string | null;
  user: PublicUser | null;
  hydrated: boolean;
  isAuthenticated: () => boolean;
  hydrate: () => Promise<void>;
  setSession: (token: string, user: PublicUser) => Promise<void>;
  setUser: (user: PublicUser) => Promise<void>;
  clear: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  hydrated: false,
  isAuthenticated: () => Boolean(get().token),

  hydrate: async () => {
    const [token, rawUser] = await Promise.all([getStoredToken(), getStoredUser()]);
    let user: PublicUser | null = null;
    if (rawUser) {
      try {
        user = JSON.parse(rawUser) as PublicUser;
      } catch (err) {
        if (__DEV__) console.warn('[auth] failed to parse stored user; ignoring', err);
        user = null;
      }
    }
    setInMemoryToken(token);
    set({ token, user, hydrated: true });
  },

  setSession: async (token, user) => {
    await Promise.all([setStoredToken(token), setStoredUser(JSON.stringify(user))]);
    setInMemoryToken(token);
    set({ token, user });
  },

  setUser: async (user) => {
    await setStoredUser(JSON.stringify(user));
    set({ user });
  },

  clear: async () => {
    await Promise.all([clearStoredToken(), clearStoredUser()]);
    setInMemoryToken(null);
    set({ token: null, user: null });
  },
}));
