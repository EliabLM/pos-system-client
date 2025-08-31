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

import NewCategory from './new-category';
import { useAllCategories } from '@/hooks/useCategories';

const CategoriesList = () => {
  const categories = useAllCategories();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className='@container/main flex flex-1 flex-col gap-2'>
      <div className='flex flex-col gap-4 py-4 md:gap-6 md:py-6'>
        <div className='px-4 lg:px-6'>
          <Card className='@container/card'>
            <CardHeader>
              <CardTitle>Categorías</CardTitle>
              <CardDescription>
                <span className='hidden @[540px]/card:block'>
                  Listado de todas las categorías
                </span>
                <span className='@[540px]/card:hidden'>Last 3 months</span>
              </CardDescription>

              <CardAction>
                <Button onClick={() => setSheetOpen(true)}>
                  Crear nueva categoría
                </Button>
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <NewCategory setSheetOpen={setSheetOpen} />
                </Sheet>
              </CardAction>
            </CardHeader>
            <CardContent>
              <DataTable
                loading={categories.isLoading}
                data={categories.data ?? []}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CategoriesList;
