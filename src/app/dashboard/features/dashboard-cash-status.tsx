'use client';

import { IconCash, IconCreditCard, IconWallet } from '@tabler/icons-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function DashboardCashStatus() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconCash className="h-5 w-5" />
          Estado de Caja
        </CardTitle>
        <CardDescription>Resumen por método de pago</CardDescription>
      </CardHeader>
      <CardContent>
        {/* TODO: Implement cash status table showing:
          - Payment method name
          - Number of transactions
          - Total amount collected
          - Percentage of total
        */}
      </CardContent>
    </Card>
  );
}
