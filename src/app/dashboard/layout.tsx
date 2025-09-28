'use client';

import React, { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

import { useStore } from '@/store';
import { getUserByClerkId } from '@/actions/user';
import { User } from '@/interfaces';

const DashboardLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const { user } = useUser();
  const setUser = useStore((state) => state.setUser);

  useEffect(() => {
    if (!user) {
      setUser(null);
      return;
    }

    getUserByClerkId(user.id)
      .then((res) => {
        const result = res.data as User;
        setUser(result);
      })
      .catch((error) => {
        console.error('🚀 ~ getUserByClerkId ~ error:', error);
      });
  }, [user]);

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
