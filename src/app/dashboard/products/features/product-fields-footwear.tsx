import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IconShoe } from '@tabler/icons-react';

interface ProductFieldsFootwearProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
}

export function ProductFieldsFootwear({ form }: ProductFieldsFootwearProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <IconShoe className="h-5 w-5" />
          Información de Calzado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Campo: Talla */}
          <FormField
            control={form.control}
            name="size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Talla</FormLabel>
                <FormControl>
                  <Input
                    id="size"
                    placeholder="Ej: 42, 9.5, M"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormDescription>
                  Talla del calzado (numérica o alfanumérica). Opcional.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campo: Color */}
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl>
                  <Input
                    id="color"
                    placeholder="Ej: Negro, Blanco, Rojo"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormDescription>
                  Color principal del calzado. Opcional.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campo: Modelo */}
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modelo</FormLabel>
                <FormControl>
                  <Input
                    id="model"
                    placeholder="Ej: Air Max 90, Superstar"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormDescription>
                  Modelo o línea del producto. Opcional.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
