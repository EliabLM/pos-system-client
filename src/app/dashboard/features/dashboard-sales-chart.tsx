'use client';

import { IconChartArea } from '@tabler/icons-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function DashboardSalesChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconChartArea className="h-5 w-5" />
          Gráfico de Ventas
        </CardTitle>
        <CardDescription>Ventas por período de tiempo</CardDescription>
      </CardHeader>
      <CardContent>
        {/* TODO: Implement Recharts area chart with:
          - Period selector (Day/Week/Month/Custom)
          - Sales data visualization
          - Tooltips and legend
        */}
      </CardContent>
    </Card>
  );
}
