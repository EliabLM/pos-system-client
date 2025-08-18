import { useState, useEffect } from 'react';
import { useOrganizationList, useUser } from '@clerk/nextjs';
import { redirect, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Building2,
  Phone,
  MapPin,
  FileText,
  Globe,
  Loader2,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { useStore } from '@/store';
import { useRegister } from '@/hooks/auth/useRegister';
import { createOrgAction } from '@/actions/organization/create-org';
import Swal from 'sweetalert2';
import { GENERIC_ERROR_MESSAGE } from '@/constants';
import { deleteOrgByClerkId } from '@/actions/organization/delete-clerk-org';
import { updateUserOrgAction } from '@/actions/user/update-org';
import { createSlug } from '@/utils/createSlug';

// Schema de validación con Yup
const onboardingSchema = yup.object({
  companyName: yup
    .string()
    .required('El nombre de la empresa es requerido')
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(80, 'El nombre no puede tener más de 80 caracteres')
    .matches(
      /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s&.-]+$/,
      'El nombre contiene caracteres no válidos'
    ),
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
  nit: yup
    .string()
    .required('El NIT es requerido')
    .matches(
      /^[\d\-\.]+$/,
      'El NIT solo puede contener números, guiones y puntos'
    )
    .min(8, 'El NIT debe tener al menos 8 caracteres')
    .max(15, 'El NIT no puede tener más de 15 caracteres'),
  subdomain: yup
    .string()
    .required('El subdominio es requerido')
    .min(3, 'El subdominio debe tener al menos 3 caracteres')
    .max(30, 'El subdominio no puede tener más de 30 caracteres')
    .matches(
      /^[a-z0-9-]+$/,
      'El subdominio solo puede contener letras minúsculas, números y guiones'
    ),
});

type SignUpFormData = yup.InferType<typeof onboardingSchema>;

const RegisterOrganizationPage = () => {
  const { handleNext } = useRegister();
  const { tempUser, setTempUser } = useStore();
  const { createOrganization, isLoaded } = useOrganizationList();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSubdomain, setIsCheckingSubdomain] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(
    null
  );

  const form = useForm<SignUpFormData>({
    resolver: yupResolver(onboardingSchema),
    defaultValues: {
      address: '',
      companyName: '',
      nit: '',
      phone: '',
      subdomain: '',
    },
    mode: 'onChange',
  });

  const onSubmit = async (data: SignUpFormData) => {
    debugger;
    if (!isLoaded) return;

    try {
      setIsSubmitting(true);
      console.log('🚀 ~ onSubmit ~ data:', data);

      //todo - check subdomain

      const resOrgClerk = await createOrganization({
        name: data.companyName,
        slug: data.subdomain,
      });
      console.log('🚀 ~ onSubmit ~ result:', resOrgClerk);

      const resOrgDb = await createOrgAction({
        clerkOrgId: resOrgClerk.id,
        email: tempUser?.email ?? '',
        name: data.companyName,
        address: data.address,
        phone: data.phone,
      });

      if (resOrgDb.status === 'ERROR' || !resOrgDb.data || !tempUser) {
        await Swal.fire({
          icon: 'error',
          text: GENERIC_ERROR_MESSAGE,
        });

        await deleteOrgByClerkId(resOrgClerk.id);

        return;
      }

      setTempUser({ ...tempUser, organizationId: resOrgDb.data.id });

      await updateUserOrgAction(tempUser.id, resOrgDb.data.id);

      // todo - crear categorias y configuraciones iniciales de la organización

      handleNext();
    } catch (error) {
      console.error('🚀 ~ onSubmit ~ error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const watchedCompanyName = form.watch('companyName');
  const watchedSubdomain = form.watch('subdomain');

  // Actualizar subdominio automáticamente cuando cambia el nombre de la empresa
  useEffect(() => {
    if (watchedCompanyName && watchedCompanyName.length >= 2) {
      const newSubdomain = createSlug(watchedCompanyName);
      if (newSubdomain !== watchedSubdomain) {
        form.setValue('subdomain', newSubdomain, { shouldValidate: true });
      }
    }
  }, [watchedCompanyName, form, watchedSubdomain]);

  return (
    <div className='min-h-screen flex items-center justify-center  py-12 px-4 sm:px-6 lg:px-8'>
      <Card className='w-full max-w-2xl'>
        <CardHeader className='text-center'>
          <div className='flex justify-center mb-4'>
            <div className='bg-blue-100 p-3 rounded-full'>
              <Building2 className='h-8 w-8 text-blue-600' />
            </div>
          </div>
          <CardTitle className='text-3xl font-bold text-gray-900'>
            ¡Bienvenido, {tempUser?.firstName} {tempUser?.lastName}! 👋
          </CardTitle>
          <CardDescription className='text-lg text-gray-600 mt-2'>
            Vamos a configurar los datos de tu empresa para comenzar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              {/* Nombre de la empresa */}
              <FormField
                control={form.control}
                name='companyName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='flex items-center gap-2'>
                      <Building2 className='h-4 w-4' />
                      Nombre de la empresa
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Ej: Tecnología Innovadora S.A.S'
                        {...field}
                        disabled={isSubmitting}
                        className='text-lg'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Subdominio (solo lectura) */}
              <FormField
                control={form.control}
                name='subdomain'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='flex items-center gap-2'>
                      <Globe className='h-4 w-4' />
                      Subdominio de tu empresa
                    </FormLabel>
                    <FormControl>
                      <div className='relative'>
                        <Input
                          {...field}
                          readOnly
                          disabled
                          className='bg-gray-50 text-gray-700 pr-20'
                        />
                        <div className='absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2'>
                          {isCheckingSubdomain && (
                            <Loader2 className='h-4 w-4 animate-spin text-gray-400' />
                          )}
                          {!isCheckingSubdomain &&
                            subdomainAvailable === true && (
                              <Badge
                                variant='outline'
                                className='bg-green-50 text-green-700 border-green-200'
                              >
                                <Check className='h-3 w-3 mr-1' />
                                Disponible
                              </Badge>
                            )}
                          {!isCheckingSubdomain &&
                            subdomainAvailable === false && (
                              <Badge
                                variant='outline'
                                className='bg-red-50 text-red-700 border-red-200'
                              >
                                No disponible
                              </Badge>
                            )}
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Tu empresa será accesible en:{' '}
                      <strong>{field.value}.pos-system.com</strong>
                      <br />
                      <span className='text-xs text-gray-500'>
                        Este campo se genera automáticamente desde el nombre de
                        la empresa
                      </span>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Teléfono */}
              <FormField
                control={form.control}
                name='phone'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='flex items-center gap-2'>
                      <Phone className='h-4 w-4' />
                      Teléfono
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='tel'
                        placeholder='Ej: +57 300 123 4567'
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
                name='address'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='flex items-center gap-2'>
                      <MapPin className='h-4 w-4' />
                      Dirección
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Ej: Calle 123 #45-67, Cartagena, Colombia'
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* NIT */}
              <FormField
                control={form.control}
                name='nit'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='flex items-center gap-2'>
                      <FileText className='h-4 w-4' />
                      NIT
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Ej: 900.123.456-7'
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      Número de Identificación Tributaria de la empresa
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type='submit'
                className='w-full text-lg py-6'
                disabled={
                  isSubmitting ||
                  !form.formState.isValid ||
                  subdomainAvailable === false
                }
                size='lg'
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                    Creando tu empresa...
                  </>
                ) : (
                  <>
                    <Building2 className='mr-2 h-5 w-5' />
                    Crear mi empresa
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className='mt-8 p-4 bg-blue-50 rounded-lg'>
            <p className='text-sm text-blue-800 text-center'>
              🔒 Tus datos están seguros y protegidos. Una vez creada tu
              empresa, podrás acceder a todas las funcionalidades de la
              plataforma.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterOrganizationPage;
