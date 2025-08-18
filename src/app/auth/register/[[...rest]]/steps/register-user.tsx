import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useSignUp, useUser } from '@clerk/nextjs';
import { isClerkAPIResponseError } from '@clerk/nextjs/errors';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Eye, EyeOff, GalleryVerticalEnd, Loader2 } from 'lucide-react';
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
import { useRegister } from '@/hooks/auth/useRegister';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { createUserAction } from '@/actions/user/create-user';
import { GENERIC_ERROR_MESSAGE } from '@/constants';
import { deleteUserByClerkId } from '@/actions/user/delete-clerk-user';

// Schema de validación con Yup
const signUpSchema = yup.object({
  username: yup
    .string()
    .required('El nombre de usuario es requerido')
    .min(3, 'El nombre de usuario debe tener al menos 3 caracteres')
    .max(20, 'El nombre de usuario no puede tener más de 20 caracteres')
    .matches(
      /^[a-zA-Z0-9_]+$/,
      'El nombre de usuario solo puede contener letras, números y guiones bajos'
    ),
  firstName: yup
    .string()
    .required('El nombre es requerido')
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede tener más de 50 caracteres')
    .matches(
      /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
      'El nombre solo puede contener letras'
    ),
  lastName: yup
    .string()
    .required('El apellido es requerido')
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(50, 'El apellido no puede tener más de 50 caracteres')
    .matches(
      /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
      'El apellido solo puede contener letras'
    ),
  email: yup
    .string()
    .required('El email es requerido')
    .email('Ingresa un email válido'),
  password: yup
    .string()
    .required('La contraseña es requerida')
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
    ),
  confirmPassword: yup
    .string()
    .required('Confirma tu contraseña')
    .oneOf([yup.ref('password')], 'Las contraseñas no coinciden'),
});

type SignUpFormData = yup.InferType<typeof signUpSchema>;

const RegisterUserPage = ({
  className,
  ...props
}: React.ComponentProps<'div'>) => {
  const { tempUser, handleNext, setTempUser } = useRegister();
  const { signUp, isLoaded, setActive } = useSignUp();
  const { user } = useUser();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  const form = useForm<SignUpFormData>({
    resolver: yupResolver(signUpSchema),
    defaultValues: {
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  });

  const onSubmit = async (data: SignUpFormData) => {
    debugger;
    if (!isLoaded) return;

    try {
      setIsLoading(true);

      const createdUser = await signUp.create({
        username: data.username,
        emailAddress: data.email,
        password: data.password,
      });
      console.log('🚀 ~ onSubmit ~ createdUser:', createdUser);

      if (!createdUser.id) {
        Swal.fire({
          icon: 'error',
          text: GENERIC_ERROR_MESSAGE,
        });

        return;
      }

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

      setTempUser({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        clerkId: createdUser.id,
        id: '',
        organizationId: '',
      });

      setVerificationStep(true);
      setVerificationCode('');
    } catch (error) {
      console.error('🚀 ~ onSubmit ~ error:', error);

      if (isClerkAPIResponseError(error) && error.errors) {
        const firstError = error.errors?.[0];

        if (firstError.code === 'form_identifier_exists') {
          await Swal.fire({
            icon: 'error',
            text: 'El correo electrónico o el nombre de usuario ya existen, por favor intente con uno nuevo.',
          });

          return;
        } else if (firstError.code === 'session_exists') {
          await Swal.fire({
            icon: 'error',
            text: 'Ya existe una sesión activa para este usuario',
          });

          deleteClerkUserAuth();

          return;
        }

        return;
      }

      Swal.fire({
        icon: 'error',
        text: GENERIC_ERROR_MESSAGE,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    debugger;
    e.preventDefault();
    if (!isLoaded) return;

    try {
      setIsLoading(true);

      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });
      console.log('🚀 ~ handleVerification ~ completeSignUp:', completeSignUp);

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });

        if (!tempUser || !completeSignUp.createdUserId) {
          await Swal.fire({
            icon: 'error',
            text: GENERIC_ERROR_MESSAGE,
          });

          await deleteUserByClerkId(completeSignUp.createdUserId ?? '');
          setVerificationStep(false);
          setVerificationCode('');

          return;
        }

        const result = await createUserAction({
          clerkId: completeSignUp.createdUserId,
          email: tempUser.email,
          firstName: tempUser.firstName,
          lastName: tempUser.lastName,
          role: 'ADMIN',
          username: tempUser.username,
        });

        if (result.status === 'ERROR' || !result.data) {
          await Swal.fire({
            icon: 'error',
            text: GENERIC_ERROR_MESSAGE,
          });

          await deleteUserByClerkId(completeSignUp.createdUserId);
          setVerificationStep(false);
          setVerificationCode('');

          return;
        }

        setTempUser({
          ...tempUser,
          clerkId: completeSignUp.createdUserId,
          id: result.data.id,
        });

        handleNext();
      }
    } catch (error) {
      console.error('🚀 ~ handleVerification ~ error:', error);

      if (isClerkAPIResponseError(error) && error.errors) {
        const firstError = error.errors?.[0];

        if (firstError.code === 'form_code_incorrect') {
          Swal.fire({
            icon: 'error',
            text: 'El código ingresado es incorrecto o ha expirado.',
          });

          return;
        }

        return;
      }

      await Swal.fire({
        icon: 'error',
        text: GENERIC_ERROR_MESSAGE,
      });

      await deleteUserByClerkId(tempUser?.clerkId ?? '');
      setVerificationStep(false);
      setVerificationCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteClerkUserAuth = async () => {
    try {
      if (!user) return;
      const result = await user.delete();
    } catch (error) {
      console.error('🚀 ~ deleteClerkUser ~ error:', error);
    }
  };

  if (verificationStep) {
    return (
      <div className='bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10'>
        <div className='flex w-full max-w-sm flex-col gap-6'>
          <Link
            href='/'
            className='flex items-center gap-2 self-center font-medium'
          >
            <div className='bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md'>
              <GalleryVerticalEnd className='size-4' />
            </div>
            Sistema POS
          </Link>
          <div className={cn('flex flex-col gap-6', className)} {...props}>
            <Card className='w-full max-w-md'>
              <CardHeader className='text-center'>
                <CardTitle className='text-2xl font-bold'>
                  Verifica tu email
                </CardTitle>
                <CardDescription>
                  Hemos enviado un código de verificación a tu email. Ingrésalo
                  para completar tu registro.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVerification} className='space-y-4'>
                  <div>
                    <Label htmlFor='verification-code'>
                      Código de verificación
                    </Label>
                    <Input
                      id='verification-code'
                      type='text'
                      placeholder='Ingresa el código de 6 dígitos'
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      maxLength={6}
                      className='text-center text-lg tracking-wider mt-1'
                      required
                    />
                  </div>

                  <Button
                    type='submit'
                    className='w-full'
                    disabled={isLoading || verificationCode.length !== 6}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Verificando...
                      </>
                    ) : (
                      'Verificar y crear cuenta'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10'>
      <div className='flex w-full max-w-sm flex-col gap-6'>
        <Link
          href='/'
          className='flex items-center gap-2 self-center font-medium'
        >
          <div className='bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md'>
            <GalleryVerticalEnd className='size-4' />
          </div>
          Sistema POS
        </Link>
        <div className={cn('flex flex-col gap-6', className)} {...props}>
          <Card className='w-full max-w-md'>
            <CardHeader className='text-center'>
              <CardTitle className='text-2xl font-bold'>Crear cuenta</CardTitle>
              <CardDescription>
                Completa tus datos para registrarte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className='space-y-4'
                >
                  {/* Username */}
                  <FormField
                    control={form.control}
                    name='username'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de usuario</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='usuario123'
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* First Name */}
                  <FormField
                    control={form.control}
                    name='firstName'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='Juan'
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Last Name */}
                  <FormField
                    control={form.control}
                    name='lastName'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apellido</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='Pérez'
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Email */}
                  <FormField
                    control={form.control}
                    name='email'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type='email'
                            placeholder='juan@ejemplo.com'
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Password */}
                  <FormField
                    control={form.control}
                    name='password'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña</FormLabel>
                        <FormControl>
                          <div className='relative'>
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder='Contraseña'
                              {...field}
                              disabled={isLoading}
                            />
                            <Button
                              type='button'
                              variant='ghost'
                              size='sm'
                              className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                              onClick={() => setShowPassword(!showPassword)}
                              disabled={isLoading}
                            >
                              {showPassword ? (
                                <EyeOff className='h-4 w-4' />
                              ) : (
                                <Eye className='h-4 w-4' />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Confirm Password */}
                  <FormField
                    control={form.control}
                    name='confirmPassword'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar contraseña</FormLabel>
                        <FormControl>
                          <div className='relative'>
                            <Input
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder='Contraseña'
                              {...field}
                              disabled={isLoading}
                            />
                            <Button
                              type='button'
                              variant='ghost'
                              size='sm'
                              className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                              disabled={isLoading}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className='h-4 w-4' />
                              ) : (
                                <Eye className='h-4 w-4' />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type='submit'
                    className='w-full'
                    disabled={isLoading || !form.formState.isValid}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Creando cuenta...
                      </>
                    ) : (
                      'Crear cuenta'
                    )}
                  </Button>
                </form>
              </Form>

              <div className='mt-6 text-center'>
                <p className='text-sm text-gray-600'>
                  ¿Ya tienes cuenta?{' '}
                  <Link
                    href='/auth/login'
                    className='font-medium text-blue-600 hover:text-blue-500'
                  >
                    Inicia sesión
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RegisterUserPage;
