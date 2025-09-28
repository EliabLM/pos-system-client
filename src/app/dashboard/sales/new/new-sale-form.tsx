'use client';
import React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { ArrowLeftIcon } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Label } from '@/components/ui/label';

export const NewSaleForm = () => {
  const form = useForm();

  const onSubmit = () => {
    //
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full p-4 space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Link href={'/dashboard/sales'}>
                <ArrowLeftIcon className="mr-2" />
              </Link>
              Crear nueva factura
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <Label className="mb-4 text-lg text-primary">
              Detalle de la factura
            </Label>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4"></div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
};
