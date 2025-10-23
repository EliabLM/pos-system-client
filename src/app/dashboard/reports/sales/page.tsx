/**
 * Sales Reports Dashboard Page
 *
 * Overview page displaying all available sales reports as cards.
 * Acts as a navigation hub for the different sales report types.
 *
 * STRICT TYPING: Zero `any` types
 */

import React from 'react';
import Link from 'next/link';
import {
  IconChartLine,
  IconPackage,
  IconCategory,
  IconCreditCard,
  IconUsers,
  IconFileAnalytics,
} from '@tabler/icons-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Sales Report Card Configuration
 */
interface SalesReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const salesReports: SalesReportCard[] = [
  {
    id: 'detailed',
    title: 'Ventas Detalladas',
    description: 'Reporte completo de todas las ventas con tendencias y métricas clave',
    icon: IconChartLine,
    href: '/dashboard/reports/sales/detailed',
  },
  {
    id: 'by-product',
    title: 'Ventas por Producto',
    description: 'Análisis de ventas agrupadas por producto con ranking de los más vendidos',
    icon: IconPackage,
    href: '/dashboard/reports/sales/by-product',
  },
  {
    id: 'by-category',
    title: 'Ventas por Categoría',
    description: 'Distribución de ventas por categorías de productos con porcentajes',
    icon: IconCategory,
    href: '/dashboard/reports/sales/by-category',
  },
  {
    id: 'by-payment',
    title: 'Ventas por Método de Pago',
    description: 'Análisis de ventas según método de pago utilizado por los clientes',
    icon: IconCreditCard,
    href: '/dashboard/reports/sales/by-payment',
  },
  {
    id: 'by-seller',
    title: 'Ventas por Vendedor',
    description: 'Performance de ventas y ranking de cada vendedor del equipo',
    icon: IconUsers,
    href: '/dashboard/reports/sales/by-seller',
  },
];

/**
 * Sales Report Card Component
 */
function SalesReportCard({ report }: { report: SalesReportCard }): React.ReactElement {
  const Icon = report.icon;

  return (
    <Link href={report.href}>
      <Card className="transition-all hover:shadow-md hover:border-primary/50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-3">
                <Icon className="size-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{report.title}</CardTitle>
                <CardDescription className="mt-1.5 text-sm">
                  {report.description}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}

/**
 * Sales Reports Dashboard Page
 */
export default function SalesReportsPage(): React.ReactElement {
  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="rounded-lg bg-primary/10 p-3">
          <IconFileAnalytics className="size-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes de Ventas</h1>
          <p className="mt-1 text-muted-foreground">
            Análisis detallado de ventas, productos, categorías y métodos de pago
          </p>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {salesReports.map((report) => (
          <SalesReportCard key={report.id} report={report} />
        ))}
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <IconFileAnalytics className="size-6 shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="space-y-1">
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                Reportes Interactivos
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Todos los reportes incluyen filtros por fecha y tienda, exportación a PDF y Excel,
                y visualizaciones interactivas. Selecciona un reporte para comenzar el análisis.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
