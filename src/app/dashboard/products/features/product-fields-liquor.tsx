import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { NumericFormat } from 'react-number-format';
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
import { IconBottle } from '@tabler/icons-react';

interface ProductFieldsLiquorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  businessType: 'liquor_store' | 'shoe_store' | null;
}

export function ProductFieldsLiquor({ form, businessType }: ProductFieldsLiquorProps) {
  const isLiquorStore = businessType === 'liquor_store';
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <IconBottle className="h-5 w-5" />
          Información de Bebida Alcohólica
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Campo: Grado Alcohólico */}
          <FormField
            control={form.control}
            name="alcoholGrade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Grado Alcohólico (%) {isLiquorStore && <span className="text-destructive">*</span>}
                </FormLabel>
                <FormControl>
                  <NumericFormat
                    id="alcoholGrade"
                    placeholder="Ej: 40"
                    customInput={Input}
                    decimalScale={2}
                    fixedDecimalScale={false}
                    allowNegative={false}
                    value={field.value ?? ''}
                    onValueChange={(values) => {
                      field.onChange(values.floatValue ?? null);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Porcentaje de alcohol por volumen (0-100%). {isLiquorStore ? 'Obligatorio para licoreras.' : 'Opcional.'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campo: Volumen */}
          <FormField
            control={form.control}
            name="volume"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Volumen (ml) {isLiquorStore && <span className="text-destructive">*</span>}
                </FormLabel>
                <FormControl>
                  <NumericFormat
                    id="volume"
                    placeholder="Ej: 750, 1000"
                    customInput={Input}
                    decimalScale={0}
                    fixedDecimalScale={false}
                    allowNegative={false}
                    value={field.value ?? ''}
                    onValueChange={(values) => {
                      field.onChange(values.floatValue ?? null);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Volumen en mililitros (ml). Ejemplos: 200, 330, 750, 1000.
                  {isLiquorStore ? ' Obligatorio para licoreras.' : ' Opcional.'}
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
