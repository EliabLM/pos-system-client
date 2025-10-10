'use client';

import { IconTrendingUp, IconCash, IconReceipt, IconShoppingCart } from '@tabler/icons-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function DashboardKpis() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* TODO: Implement KPI cards for:
        - Total sales amount (today)
        - Number of transactions (today)
        - Average ticket value (today)
      */}
      <Card>
        <CardHeader>
          <CardTitle>Ventas del Día</CardTitle>
        </CardHeader>
        <CardContent>
          {/* KPI content will go here */}
        </CardContent>
      </Card>
    </div>
  );
}
