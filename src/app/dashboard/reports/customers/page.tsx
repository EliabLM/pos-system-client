/**
 * Customers Reports Main Page
 *
 * Overview page with navigation cards to different customer reports.
 * STRICT TYPING: Zero `any` types
 */

'use client';

import React from 'react';
import Link from 'next/link';
import {
  IconUsers,
  IconChartBar,
  IconTrendingUp,
  IconArrowRight,
} from '@tabler/icons-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ReportCardProps {
  title: string;
  description: string;
  icon: React.ReactElement;
  href: string;
}

function ReportCard({ title, description, icon, href }: ReportCardProps): React.ReactElement {
  return (
    <Link href={href}>
      <Card className="h-full transition-all hover:shadow-lg hover:border-primary cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                {icon}
              </div>
              <div>
                <CardTitle className="text-lg">{title}</CardTitle>
              </div>
            </div>
            <IconArrowRight className="size-5 text-muted-foreground" />
          </div>
          <CardDescription className="mt-2">{description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}

export default function CustomersReportsPage(): React.ReactElement {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes de Clientes</h1>
        <p className="text-muted-foreground mt-2">
          Análisis y seguimiento del comportamiento y rendimiento de clientes
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ReportCard
          title="Top Clientes"
          description="Listado de los mejores clientes por volumen de compras y frecuencia. Identifica tus clientes más valiosos."
          icon={<IconUsers className="size-6" />}
          href="/dashboard/reports/customers/top"
        />

        <ReportCard
          title="Segmentos de Clientes"
          description="Clasificación de clientes en segmentos (VIP, Premium, Regular, Ocasional) según su nivel de gasto."
          icon={<IconChartBar className="size-6" />}
          href="/dashboard/reports/customers/segments"
        />

        <ReportCard
          title="Retención de Clientes"
          description="Análisis de retención, churn rate, cohortes y segmentos de actividad según recencia de compra."
          icon={<IconTrendingUp className="size-6" />}
          href="/dashboard/reports/customers/retention"
        />
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <IconUsers className="size-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Análisis de Clientes</h3>
              <p className="text-sm text-muted-foreground">
                Utiliza estos reportes para identificar patrones de compra, segmentar tu base de clientes
                y desarrollar estrategias de fidelización más efectivas. Los reportes te ayudarán a:
              </p>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                <li>Identificar tus clientes más valiosos y frecuentes</li>
                <li>Segmentar clientes según su comportamiento de compra</li>
                <li>Calcular el valor de vida del cliente (CLV)</li>
                <li>Medir la frecuencia y recencia de compras</li>
                <li>Diseñar programas de fidelización personalizados</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
