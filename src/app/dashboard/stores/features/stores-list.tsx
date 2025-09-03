'use client';

import React, { useState } from 'react';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataTable } from '../features/data-table';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';

import { Store } from '@/generated/prisma';
import { useAllStores } from '@/hooks/useStores';

import NewStore from './new-store';

const StoresList = () => {
  const stores = useAllStores();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [itemSelected, setItemSelected] = useState<Store | null>(null);

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <Card className="@container/card">
            <CardHeader>
              <CardTitle>Tiendas</CardTitle>
              <CardDescription>
                <span className="hidden @[540px]/card:block">
                  Listado de todas las tiendas
                </span>
                {/* <span className='@[540px]/card:hidden'>Last 3 months</span> */}
              </CardDescription>

              <CardAction>
                <Button
                  onClick={() => {
                    setItemSelected(null);
                    setSheetOpen(true);
                  }}
                >
                  Crear nuevo método de pago
                </Button>
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <NewStore
                    setSheetOpen={setSheetOpen}
                    itemSelected={itemSelected}
                    setItemSelected={setItemSelected}
                  />
                </Sheet>
              </CardAction>
            </CardHeader>
            <CardContent>
              <DataTable
                loading={stores.isLoading}
                data={stores.data ?? []}
                setSheetOpen={setSheetOpen}
                setItemSelected={setItemSelected}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StoresList;
