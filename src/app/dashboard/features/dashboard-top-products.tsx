'use client';

import { IconTrophy, IconPackage } from '@tabler/icons-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function DashboardTopProducts() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconTrophy className="h-5 w-5" />
          Productos Más Vendidos
        </CardTitle>
        <CardDescription>Top 10 productos del período</CardDescription>
      </CardHeader>
      <CardContent>
        {/* TODO: Implement table with TanStack Table showing:
          - Product name and image
          - Quantity sold
          - Total revenue
          - Percentage of total sales
        */}
      </CardContent>
    </Card>
  );
}
