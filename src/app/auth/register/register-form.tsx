'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { IconEye, IconEyeOff, IconLoader2 } from '@tabler/icons-react';
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
import { cn } from '@/lib/utils';
import { registerUser } from '@/actions/auth';

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
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/,
      'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&#)'
    ),
  confirmPassword: yup
    .string()
    .required('Confirma tu contraseña')
    .oneOf([yup.ref('password')], 'Las contraseñas no coinciden'),
});

type SignUpFormData = yup.InferType<typeof signUpSchema>;

export const RegisterForm = ({
  className,
  ...props
}: React.ComponentProps<'div'>) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignUpFormData>({
    resolver: yupResolver(signUpSchema),
    criteriaMode: 'firstError',
    defaultValues: {
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'all',
    reValidateMode: 'onChange',
  });

  const onSubmit = async (data: SignUpFormData) => {
    try {
      setIsLoading(true);

      // Crear FormData para enviar al server action
      const formData = new FormData();
      formData.append('username', data.username);
      formData.append('firstName', data.firstName);
      formData.append('lastName', data.lastName);
      formData.append('email', data.email);
      formData.append('password', data.password);
      formData.append('confirmPassword', data.confirmPassword);

      // Llamar al server action de registro
      const result = await registerUser(formData);

      if (result.status === 201) {
        // Registro exitoso
        await Swal.fire({
          icon: 'success',
          title: '¡Cuenta creada!',
          text: 'Tu cuenta ha sido creada exitosamente. Ahora vamos a configurar tu organización.',
          confirmButtonText: 'Continuar',
        });

        // Pequeño delay para que la cookie se propague
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Redirigir al onboarding usando window.location.href
        window.location.href = '/onboarding';
      } else if (result.status === 409) {
        // Email o username ya existe
        await Swal.fire({
          icon: 'error',
          title: 'Usuario existente',
          text:
            result.message ||
            'El correo electrónico o el nombre de usuario ya existen.',
        });
      } else {
        // Otro error
        await Swal.fire({
          icon: 'error',
          title: 'Error al registrar',
          text:
            result.message ||
            'Ocurrió un error al crear tu cuenta. Por favor intenta nuevamente.',
        });
      }
    } catch (error) {
      console.error('🚀 ~ onSubmit ~ error:', error);

      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error inesperado. Por favor intenta nuevamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Crear cuenta</CardTitle>
          <CardDescription>Completa tus datos para comenzar</CardDescription>
        </CardHeader>
        <CardContent className="max-w-md">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-6">
                {/* Username y Email en una fila */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de usuario</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="usuario123"
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correo electrónico</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="m@example.com"
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Nombre y Apellido en una fila */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Juan"
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apellido</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Pérez"
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Contraseñas */}
                <div className="grid gap-3">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              {...field}
                              disabled={isLoading}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                              disabled={isLoading}
                              aria-label={
                                showPassword
                                  ? 'Ocultar contraseña'
                                  : 'Mostrar contraseña'
                              }
                            >
                              {showPassword ? (
                                <IconEyeOff className="h-4 w-4" />
                              ) : (
                                <IconEye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-3">
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar contraseña</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              {...field}
                              disabled={isLoading}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                              disabled={isLoading}
                              aria-label={
                                showConfirmPassword
                                  ? 'Ocultar contraseña'
                                  : 'Mostrar contraseña'
                              }
                            >
                              {showConfirmPassword ? (
                                <IconEyeOff className="h-4 w-4" />
                              ) : (
                                <IconEye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando cuenta...
                    </>
                  ) : (
                    'Crear cuenta'
                  )}
                </Button>

                <div className="text-center text-sm">
                  ¿Ya tienes una cuenta?{' '}
                  <Link
                    href="/auth/login"
                    className="underline underline-offset-4"
                  >
                    Iniciar sesión
                  </Link>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <div className="text-muted-foreground text-center text-xs text-balance">
        Al crear una cuenta, aceptas nuestros{' '}
        <Link
          href="#"
          className="underline underline-offset-4 hover:text-primary"
        >
          Términos de servicio
        </Link>{' '}
        y{' '}
        <Link
          href="#"
          className="underline underline-offset-4 hover:text-primary"
        >
          Política de privacidad
        </Link>
        .
      </div>
    </div>
  );
};
