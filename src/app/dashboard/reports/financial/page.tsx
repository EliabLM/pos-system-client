/**
 * Financial Reports Dashboard Page
 *
 * Overview page displaying all available financial reports as cards.
 * Acts as a navigation hub for the different financial report types.
 *
 * STRICT TYPING: Zero `any` types
 */

import React from 'react';
import Link from 'next/link';
import {
  IconReportMoney,
  IconChartPie,
  IconCashBanknote,
  IconChartLine,
} from '@tabler/icons-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Financial Report Card Configuration
 */
interface FinancialReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const financialReports: FinancialReportCard[] = [
  {
    id: 'profit-loss',
    title: 'Estado de Resultados (P&L)',
    description: 'Análisis de ingresos, costos, ganancia bruta y neta con márgenes de rentabilidad',
    icon: IconReportMoney,
    href: '/dashboard/reports/financial/profit-loss',
  },
  {
    id: 'profitability',
    title: 'Análisis de Rentabilidad',
    description: 'Rentabilidad por producto y categoría con identificación de mejores márgenes',
    icon: IconChartPie,
    href: '/dashboard/reports/financial/profitability',
  },
  {
    id: 'cash-flow',
    title: 'Flujo de Caja',
    description: 'Entradas y salidas de efectivo por método de pago con flujo neto',
    icon: IconCashBanknote,
    href: '/dashboard/reports/financial/cash-flow',
  },
];

/**
 * Financial Report Card Component
 */
function FinancialReportCard({ report }: { report: FinancialReportCard }): React.ReactElement {
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
 * Financial Reports Dashboard Page
 */
export default function FinancialReportsPage(): React.ReactElement {
  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="rounded-lg bg-primary/10 p-3">
          <IconChartLine className="size-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes Financieros</h1>
          <p className="mt-1 text-muted-foreground">
            Análisis de rentabilidad, ganancias, pérdidas y flujo de caja
          </p>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {financialReports.map((report) => (
          <FinancialReportCard key={report.id} report={report} />
        ))}
      </div>

      {/* Info Card */}
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <IconReportMoney className="size-6 shrink-0 text-green-600 dark:text-green-400" />
            <div className="space-y-1">
              <p className="font-semibold text-green-900 dark:text-green-100">
                Reportes Financieros Detallados
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Todos los reportes incluyen filtros por fecha y tienda, exportación a PDF y Excel,
                y visualizaciones interactivas de márgenes, rentabilidad y flujo de caja.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
