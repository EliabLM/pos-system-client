'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

import { useStore } from '@/store';
import { getCurrentUser } from '@/actions/auth';

const DashboardLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const router = useRouter();
  const setUser = useStore((state) => state.setUser);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const result = await getCurrentUser();

        // Handle authentication errors
        if (result.status === 401) {
          // Not authenticated or session expired
          setUser(null);
          router.push('/auth/login');
          return;
        }

        // Handle account deactivation
        if (result.status === 403) {
          setUser(null);
          router.push('/auth/login');
          return;
        }

        // Handle success
        if (result.status === 200 && result.data?.user) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setUser(result.data.user as any);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null);
        router.push('/auth/login');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [router, setUser]);

  // Show loading state while fetching user
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
};

export default DashboardLayout;
