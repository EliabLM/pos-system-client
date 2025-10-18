'use client';

import * as React from 'react';
import {
  IconCamera,
  IconDashboard,
  IconFileAi,
  IconFileDescription,
  IconCash,
  IconHelp,
  IconInnerShadowTop,
  IconAB2,
  IconSearch,
  IconSettings,
  IconUsers,
  IconCategory,
  IconBuildingStore,
  IconShoppingCart,
  IconBuildingWarehouse,
  IconChartCandle,
  IconUserHeart,
  IconTruck,
} from '@tabler/icons-react';

import { NavParametrization } from '@/components/nav-parametrization';
import { NavMain } from '@/components/nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useStore } from '@/store';
import Link from 'next/link';

const data = {
  navMain: [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: IconDashboard,
    },
    {
      title: 'Ventas',
      url: '/dashboard/sales',
      icon: IconShoppingCart,
    },
    {
      title: 'Clientes',
      url: '/dashboard/customers',
      icon: IconUserHeart,
    },
    {
      title: 'Proveedores',
      url: '/dashboard/suppliers',
      icon: IconTruck,
    },
    {
      title: 'Productos',
      url: '/dashboard/products',
      icon: IconBuildingWarehouse,
    },
    {
      title: 'Movimientos',
      url: '/dashboard/movements',
      icon: IconChartCandle,
    },
    {
      title: 'Usuarios',
      url: '/dashboard/users',
      icon: IconUsers,
    },
  ],
  navClouds: [
    {
      title: 'Capture',
      icon: IconCamera,
      isActive: true,
      url: '#',
      items: [
        {
          title: 'Active Proposals',
          url: '#',
        },
        {
          title: 'Archived',
          url: '#',
        },
      ],
    },
    {
      title: 'Proposal',
      icon: IconFileDescription,
      url: '#',
      items: [
        {
          title: 'Active Proposals',
          url: '#',
        },
        {
          title: 'Archived',
          url: '#',
        },
      ],
    },
    {
      title: 'Prompts',
      icon: IconFileAi,
      url: '#',
      items: [
        {
          title: 'Active Proposals',
          url: '#',
        },
        {
          title: 'Archived',
          url: '#',
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: 'Settings',
      url: '#',
      icon: IconSettings,
    },
    {
      title: 'Get Help',
      url: '#',
      icon: IconHelp,
    },
    {
      title: 'Search',
      url: '#',
      icon: IconSearch,
    },
  ],
  parametrization: [
    {
      name: 'Categorías',
      url: '/dashboard/categories',
      icon: IconCategory,
    },
    {
      name: 'Marcas',
      url: '/dashboard/brands',
      icon: IconAB2,
    },
    {
      name: 'Métodos de pago',
      url: '/dashboard/payment-methods',
      icon: IconCash,
    },
    {
      name: 'Tiendas',
      url: '/dashboard/stores',
      icon: IconBuildingStore,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useStore((state) => state.user);

  // Filter navigation items based on user role
  const isSeller = user?.role === 'SELLER';

  // For SELLER role, show Dashboard, Sales, Customers, and Suppliers
  const filteredNavMain = isSeller
    ? data.navMain.filter((item) =>
        ['/dashboard', '/dashboard/sales', '/dashboard/customers', '/dashboard/suppliers'].includes(item.url)
      )
    : data.navMain;

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/dashboard">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">
                  {user?.organization?.name}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavMain} />
        {/* Hide Parametrization section for SELLER role */}
        {!isSeller && <NavParametrization items={data.parametrization} />}
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
