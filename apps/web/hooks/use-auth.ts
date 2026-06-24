'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

export function useAuth({ requireAuth = true } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, fetchMe } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
      fetchMe();
    }
  }, [token, user, fetchMe]);

  useEffect(() => {
    if (requireAuth && !token && pathname !== '/login') {
      router.replace('/login');
    }
  }, [token, requireAuth, pathname, router]);

  return { user, token, isAuthenticated: !!token };
}

export function useRequireAdmin() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  return { isAdmin: user?.role === 'ADMIN' };
}
