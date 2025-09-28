'use client';

import React, { useState } from 'react';
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
import { useRouter } from 'next/navigation';

export const SaleList = () => {
  const sales = useSales();
  const router = useRouter();
  console.log('🚀 ~ SaleList ~ sales:', sales);

  const [itemSelected, setItemSelected] = useState<Sale | null>(null);

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
                {/* <span className='@[540px]/card:hidden'>Last 3 months</span> */}
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
              {/* <DataTable
                loading={sales.isLoading}
                data={sales.data ?? []}
                setSheetOpen={setSheetOpen}
                setItemSelected={setItemSelected}
              /> */}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
