/**
 * Inventory Reports Dashboard
 *
 * Main page displaying all available inventory reports:
 * - Stock Status Report
 * - Stock Movements Report
 * - Inventory Valuation Report
 * - Inventory Rotation Report
 */

'use client';

import React from 'react';
import Link from 'next/link';
import {
  IconPackage,
  IconTransfer,
  IconCurrencyDollar,
  IconRefresh,
  IconChartBar,
} from '@tabler/icons-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Report card interface
 */
interface ReportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
}

/**
 * Report card component
 */
function ReportCard({ title, description, icon, href }: ReportCardProps): React.ReactElement {
  return (
    <Card className="group hover:shadow-lg transition-all duration-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="rounded-lg bg-primary/10 p-3 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            {icon}
          </div>
        </div>
        <CardTitle className="mt-4">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href={href}>
          <Button className="w-full" variant="outline">
            Ver Reporte
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * Inventory Reports Dashboard Page
 */
export default function InventoryReportsPage(): React.ReactElement {
  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <IconPackage className="size-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Reportes de Inventario</h1>
        </div>
        <p className="text-muted-foreground">
          Analiza y gestiona tu inventario con reportes detallados de estado, movimientos,
          valoración y rotación de productos.
        </p>
      </div>

      {/* Report Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {/* Stock Status Report */}
        <ReportCard
          title="Estado de Inventario"
          description="Visualiza el estado actual de tu inventario con niveles de stock, alertas de productos con bajo stock y valoración total."
          icon={<IconPackage className="size-6" />}
          href="/dashboard/reports/inventory/stock-status"
        />

        {/* Stock Movements Report */}
        <ReportCard
          title="Movimientos de Inventario"
          description="Consulta el historial completo de movimientos de inventario: entradas, salidas y ajustes con detalle de usuario y fecha."
          icon={<IconTransfer className="size-6" />}
          href="/dashboard/reports/inventory/movements"
        />

        {/* Inventory Valuation Report */}
        <ReportCard
          title="Valoración de Inventario"
          description="Analiza el valor total de tu inventario distribuido por categorías y marcas para una mejor gestión financiera."
          icon={<IconCurrencyDollar className="size-6" />}
          href="/dashboard/reports/inventory/valuation"
        />

        {/* Inventory Rotation Report */}
        <ReportCard
          title="Rotación de Inventario"
          description="Identifica productos de alta, media y baja rotación con clasificación ABC para optimizar tu inventario."
          icon={<IconRefresh className="size-6" />}
          href="/dashboard/reports/inventory/rotation"
        />
      </div>

      {/* Info Section */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-start gap-3">
            <IconChartBar className="size-5 text-primary mt-0.5" />
            <div>
              <CardTitle className="text-base">Análisis de Inventario</CardTitle>
              <CardDescription className="mt-2">
                Los reportes de inventario te permiten:
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Monitorear niveles de stock y prevenir quiebres de inventario</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Rastrear todos los movimientos de entrada y salida de productos</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Conocer el valor total de tu inventario por categoría y marca</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Identificar productos de alta y baja rotación para optimizar compras</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Exportar todos los reportes a PDF y Excel para análisis externo</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
