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

import { UnitMeasure } from '@/generated/prisma';
import { useAllUnitMeasures } from '@/hooks/useUnitMeasures';

import NewUnitMeasure from './new-unit-measure';

const UnitMeasuresList = () => {
  const unitMeasures = useAllUnitMeasures();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [itemSelected, setItemSelected] = useState<UnitMeasure | null>(null);

  return (
    <div className='@container/main flex flex-1 flex-col gap-2'>
      <div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6'>
        <div className='px-4 lg:px-6'>
          <Card className='@container/card'>
            <CardHeader>
              <CardTitle>Unidades de Medida</CardTitle>
              <CardDescription>
                <span className='hidden @[540px]/card:block'>
                  Listado de todas las unidades de medida
                </span>
                <span className='@[540px]/card:hidden'>Unidades</span>
              </CardDescription>

              <CardAction>
                <Button
                  onClick={() => {
                    setItemSelected(null);
                    setSheetOpen(true);
                  }}
                >
                  Crear nueva unidad
                </Button>
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <NewUnitMeasure
                    setSheetOpen={setSheetOpen}
                    itemSelected={itemSelected}
                    setItemSelected={setItemSelected}
                  />
                </Sheet>
              </CardAction>
            </CardHeader>
            <CardContent>
              <DataTable
                loading={unitMeasures.isLoading}
                data={unitMeasures.data ?? []}
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

export default UnitMeasuresList;
