/**
 * Reports Main Page
 *
 * Dashboard-style index page showing all available reports organized by category.
 *
 * STRICT TYPING: Zero `any` types
 */

import React from 'react';
import Link from 'next/link';
import {
  IconShoppingCart,
  IconBuildingWarehouse,
  IconCash,
  IconUserHeart,
  IconTruck,
  IconFileAnalytics,
  IconChartBar,
  IconCreditCard,
  IconUsers,
  IconBoxMultiple,
  IconChartLine,
  IconReportMoney,
  IconWallet,
  IconArrowsSort,
  IconTrendingUp,
} from '@tabler/icons-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ReportCard, ReportCategory } from '@/interfaces/reports';

/**
 * Report Categories Configuration
 */
const reportCategories: ReportCategory[] = [
  {
    id: 'sales',
    title: 'Reportes de Ventas',
    description: 'Análisis detallado de ventas, productos y métodos de pago',
    icon: IconShoppingCart,
    reports: [
      {
        id: 'sales-detailed',
        title: 'Ventas Detalladas',
        description: 'Reporte completo de todas las ventas con filtros avanzados',
        icon: IconFileAnalytics,
        href: '/dashboard/reports/sales/detailed',
        category: 'sales',
        enabled: false, // Phase 2
      },
      {
        id: 'sales-by-product',
        title: 'Ventas por Producto',
        description: 'Análisis de ventas agrupadas por producto',
        icon: IconBoxMultiple,
        href: '/dashboard/reports/sales/by-product',
        category: 'sales',
        enabled: false, // Phase 2
      },
      {
        id: 'sales-by-category',
        title: 'Ventas por Categoría',
        description: 'Distribución de ventas por categorías de productos',
        icon: IconArrowsSort,
        href: '/dashboard/reports/sales/by-category',
        category: 'sales',
        enabled: false, // Phase 2
      },
      {
        id: 'sales-by-payment',
        title: 'Ventas por Método de Pago',
        description: 'Análisis de ventas según método de pago utilizado',
        icon: IconCreditCard,
        href: '/dashboard/reports/sales/by-payment',
        category: 'sales',
        enabled: false, // Phase 2
      },
      {
        id: 'sales-by-seller',
        title: 'Ventas por Vendedor',
        description: 'Performance de ventas por cada vendedor',
        icon: IconUsers,
        href: '/dashboard/reports/sales/by-seller',
        category: 'sales',
        enabled: false, // Phase 2
      },
    ],
  },
  {
    id: 'inventory',
    title: 'Reportes de Inventario',
    description: 'Estado de stock, movimientos y valorización',
    icon: IconBuildingWarehouse,
    reports: [
      {
        id: 'stock-status',
        title: 'Estado de Stock',
        description: 'Inventario actual por producto con alertas de stock',
        icon: IconBuildingWarehouse,
        href: '/dashboard/reports/inventory/stock-status',
        category: 'inventory',
        enabled: false, // Phase 3
      },
      {
        id: 'stock-movements',
        title: 'Movimientos de Inventario',
        description: 'Historial detallado de entradas y salidas de inventario',
        icon: IconArrowsSort,
        href: '/dashboard/reports/inventory/movements',
        category: 'inventory',
        enabled: false, // Phase 3
      },
      {
        id: 'inventory-valuation',
        title: 'Inventario Valorizado',
        description: 'Valorización del inventario al costo actual',
        icon: IconReportMoney,
        href: '/dashboard/reports/inventory/valuation',
        category: 'inventory',
        enabled: false, // Phase 3
      },
      {
        id: 'inventory-rotation',
        title: 'Rotación de Inventario',
        description: 'Análisis de rotación y clasificación ABC de productos',
        icon: IconChartLine,
        href: '/dashboard/reports/inventory/rotation',
        category: 'inventory',
        enabled: false, // Phase 3
      },
    ],
  },
  {
    id: 'financial',
    title: 'Reportes Financieros',
    description: 'Estado de resultados, rentabilidad y flujo de caja',
    icon: IconCash,
    reports: [
      {
        id: 'profit-loss',
        title: 'Estado de Resultados (P&L)',
        description: 'Ingresos, costos y ganancias del período',
        icon: IconChartBar,
        href: '/dashboard/reports/financial/profit-loss',
        category: 'financial',
        enabled: false, // Phase 4
      },
      {
        id: 'profitability',
        title: 'Análisis de Rentabilidad',
        description: 'Márgenes de ganancia por producto y categoría',
        icon: IconTrendingUp,
        href: '/dashboard/reports/financial/profitability',
        category: 'financial',
        enabled: false, // Phase 4
      },
      {
        id: 'cash-flow',
        title: 'Flujo de Caja',
        description: 'Ingresos y egresos de efectivo',
        icon: IconWallet,
        href: '/dashboard/reports/financial/cash-flow',
        category: 'financial',
        enabled: false, // Phase 4
      },
    ],
  },
  {
    id: 'customer',
    title: 'Reportes de Clientes',
    description: 'Análisis de clientes, segmentación y retención',
    icon: IconUserHeart,
    reports: [
      {
        id: 'top-customers',
        title: 'Top Clientes',
        description: 'Clientes con mayor volumen de compras',
        icon: IconUserHeart,
        href: '/dashboard/reports/customers/top-customers',
        category: 'customer',
        enabled: false, // Phase 5
      },
      {
        id: 'customer-segmentation',
        title: 'Segmentación de Clientes',
        description: 'Análisis RFM y segmentación geográfica',
        icon: IconArrowsSort,
        href: '/dashboard/reports/customers/segmentation',
        category: 'customer',
        enabled: false, // Phase 5
      },
      {
        id: 'customer-retention',
        title: 'Retención de Clientes',
        description: 'Análisis de cohortes y tasa de retención',
        icon: IconTrendingUp,
        href: '/dashboard/reports/customers/retention',
        category: 'customer',
        enabled: false, // Phase 5
      },
    ],
  },
  {
    id: 'supplier',
    title: 'Reportes de Proveedores',
    description: 'Compras y performance de proveedores',
    icon: IconTruck,
    reports: [
      {
        id: 'supplier-purchases',
        title: 'Compras por Proveedor',
        description: 'Total de compras realizadas a cada proveedor',
        icon: IconShoppingCart,
        href: '/dashboard/reports/suppliers/purchases',
        category: 'supplier',
        enabled: false, // Phase 6
      },
      {
        id: 'supplier-performance',
        title: 'Performance de Proveedores',
        description: 'Evaluación de cumplimiento y calidad de proveedores',
        icon: IconChartLine,
        href: '/dashboard/reports/suppliers/performance',
        category: 'supplier',
        enabled: false, // Phase 6
      },
    ],
  },
];

/**
 * Report Card Component
 */
function ReportCardComponent({ report }: { report: ReportCard }): React.ReactElement {
  const Icon = report.icon;
  const isEnabled = report.enabled;

  const content = (
    <Card className={`transition-all hover:shadow-md ${!isEnabled ? 'opacity-60' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Icon className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{report.title}</CardTitle>
              <CardDescription className="mt-1 text-xs">
                {report.description}
              </CardDescription>
            </div>
          </div>
          {!isEnabled && (
            <Badge variant="secondary" className="text-xs">
              Próximamente
            </Badge>
          )}
        </div>
      </CardHeader>
    </Card>
  );

  if (!isEnabled) {
    return content;
  }

  return <Link href={report.href}>{content}</Link>;
}

/**
 * Main Reports Page
 */
export default function ReportsPage(): React.ReactElement {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
        <p className="mt-2 text-muted-foreground">
          Análisis detallados de ventas, inventario, finanzas, clientes y
          proveedores
        </p>
      </div>

      {/* Report Categories */}
      {reportCategories.map((category) => {
        const CategoryIcon = category.icon;

        return (
          <div key={category.id} className="space-y-4">
            {/* Category Header */}
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <CategoryIcon className="size-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{category.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {category.description}
                </p>
              </div>
            </div>

            {/* Reports Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {category.reports.map((report) => (
                <ReportCardComponent key={report.id} report={report} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <IconFileAnalytics className="size-6 shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="space-y-1">
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                Fase 1: Infraestructura Completa
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                La infraestructura base de reportes está lista. Los reportes
                individuales se implementarán en las siguientes fases según el
                plan de desarrollo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
