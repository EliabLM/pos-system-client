'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sale } from '@/generated/prisma';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from '@/components/ui/card';
import { useSales } from '@/hooks/useSales';
import { DataTable } from './data-table';

export const SaleList = () => {
  const sales = useSales();
  const router = useRouter();

  const [itemSelected, setItemSelected] = useState<Sale | null>(null);

  // Extraer el array de ventas del objeto de respuesta
  const salesData = sales.data?.sales ?? [];

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <Card className="@container/card">
            <CardHeader>
              <CardTitle>Ventas</CardTitle>
              <CardDescription>
                <span className="hidden @[540px]/card:block">
                  Listado de todas las ventas
                </span>
              </CardDescription>

              <CardAction>
                <Button
                  onClick={() => {
                    setItemSelected(null);
                    router.push('/dashboard/sales/new');
                  }}
                >
                  Crear nueva venta
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <DataTable
                loading={sales.isLoading}
                data={salesData}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
