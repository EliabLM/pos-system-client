'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataTable } from '../features/data-table';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';

import { Supplier } from '@/generated/prisma';
import { useAllSuppliers } from '@/hooks/useSuppliers';

import SupplierForm from './supplier-form';

const SuppliersList = () => {
  const { data: suppliersData, isLoading } = useAllSuppliers();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [itemSelected, setItemSelected] = useState<Supplier | null>(null);

  const suppliers = suppliersData?.suppliers || [];

  return (
    <div className='@container/main flex flex-1 flex-col gap-2'>
      <div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6'>
        <div className='px-4 lg:px-6'>
          <Card className='@container/card'>
            <CardHeader>
              <CardTitle>Proveedores</CardTitle>
              <CardDescription>
                <span className='hidden @[540px]/card:block'>
                  Listado de todos los proveedores
                </span>
              </CardDescription>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setItemSelected(null);
                    setSheetOpen(true);
                  }}
                >
                  Crear nuevo proveedor
                </Button>
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <SupplierForm
                    setSheetOpen={setSheetOpen}
                    itemSelected={itemSelected}
                    setItemSelected={setItemSelected}
                  />
                </Sheet>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                loading={isLoading}
                data={suppliers}
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

export default SuppliersList;
