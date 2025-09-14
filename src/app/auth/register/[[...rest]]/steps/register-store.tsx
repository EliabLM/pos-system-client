import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Building2, Phone, MapPin, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

import { useRegister } from '@/hooks/auth/useRegister';
import { createStore } from '@/actions/store';
import { createSlug } from '@/utils/createSlug';

// Schema de validación con Yup
const onboardingSchema = yup.object({
  storeName: yup
    .string()
    .required('El nombre de la empresa es requerido')
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(80, 'El nombre no puede tener más de 80 caracteres')
    .matches(
      /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s&.-]+$/,
      'El nombre contiene caracteres no válidos'
    ),
  description: yup.string().default(''),
  phone: yup
    .string()
    .required('El teléfono es requerido')
    .matches(/^\+?[\d\s\-\(\)]+$/, 'Formato de teléfono inválido')
    .min(7, 'El teléfono debe tener al menos 7 dígitos')
    .max(20, 'El teléfono no puede tener más de 20 caracteres'),
  address: yup
    .string()
    .required('La dirección es requerida')
    .min(10, 'La dirección debe tener al menos 10 caracteres')
    .max(200, 'La dirección no puede tener más de 200 caracteres'),
});

type SignUpFormData = yup.InferType<typeof onboardingSchema>;

const RegisterStorePage = () => {
  const { tempUser, setTempUser, setStepIndex } = useRegister();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SignUpFormData>({
    resolver: yupResolver(onboardingSchema),
    defaultValues: {
      address: '',
      storeName: '',
      phone: '',
      description: '',
    },
    mode: 'onChange',
  });

  const onSubmit = async (data: SignUpFormData) => {
    try {
      setIsSubmitting(true);

      if (!tempUser) {
        return;
      }

      const resStoreDb = await createStore(
        tempUser.organizationId,
        tempUser.id,
        {
          address: data.address,
          name: data.storeName,
          phone: data.phone,
          description: data.description,
          city: 'Cartagena',
          department: 'Bolívar',
          saleNumberPrefix: createSlug(data.storeName),
          isActive: true,
        }
      );

      if (resStoreDb.status !== 201) {
        Swal.fire({
          icon: 'error',
          text: resStoreDb.message,
        });

        return;
      }

      setStepIndex(0);
      setTempUser(null);

      router.push('/dashboard');
    } catch (error) {
      console.error('🚀 ~ onSubmit ~ error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center  py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">
            ¡Bienvenido, {tempUser?.firstName} {tempUser?.lastName}! 👋
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 mt-2">
            Vamos a configurar los datos de tu primera tienda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Nombre de la empresa */}
              <FormField
                control={form.control}
                name="storeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Nombre de la tienda
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Tecnología Innovadora S.A.S"
                        {...field}
                        disabled={isSubmitting}
                        className="text-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Descripción
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ej: Ubicada en la entrada de..."
                        {...field}
                        disabled={isSubmitting}
                        className="text-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Teléfono */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Teléfono
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="Ej: +57 300 123 4567"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Dirección */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Dirección
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Calle 123 #45-67, Cartagena, Colombia"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full text-lg py-6"
                disabled={isSubmitting || !form.formState.isValid}
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creando tu tienda...
                  </>
                ) : (
                  <>
                    <Building2 className="mr-2 h-5 w-5" />
                    Crear mi tienda
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterStorePage;
