'use client';

import { IconAlertTriangle, IconPackageOff } from '@tabler/icons-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function DashboardStockAlerts() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconAlertTriangle className="h-5 w-5 text-orange-500" />
          Alertas de Stock Bajo
        </CardTitle>
        <CardDescription>Productos que requieren reabastecimiento</CardDescription>
      </CardHeader>
      <CardContent>
        {/* TODO: Implement low stock alerts list showing:
          - Product name
          - Current stock vs minimum stock
          - Alert severity badge
          - Quick action to view product details
        */}
      </CardContent>
    </Card>
  );
}
