'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { authApi, setAccessToken } from '@/lib/api';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};

export const useAuthProvider = (): AuthContextValue => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // On mount: try to restore session via /auth/me
  // The interceptor will NOT retry this with /auth/refresh — it fails silently on 401
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const { data } = await authApi.me();
        if (data.data?.user) setUser(data.data.user);
      } catch {
        // No valid session — user must log in
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    if (data.data) {
      setAccessToken(data.data.accessToken);
      setUser(data.data.user);
      router.push('/dashboard');
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const { data } = await authApi.register(name, email, password);
    if (data.data) {
      setAccessToken(data.data.accessToken);
      setUser(data.data.user);
      router.push('/dashboard');
    }
  };

  const logout = async () => {
    await authApi.logout();
    setAccessToken(null);
    setUser(null);
    router.push('/login');
  };

  return { user, isLoading, login, register, logout };
};
