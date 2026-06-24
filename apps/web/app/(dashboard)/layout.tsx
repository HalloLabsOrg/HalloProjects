'use client';

import { Sidebar } from '@/components/shared/sidebar';
import { useAuth } from '@/hooks/use-auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useAuth({ requireAuth: true });

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
