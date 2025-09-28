'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useSignIn } from '@clerk/nextjs';
import { Loader2Icon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import Swal from 'sweetalert2';
import { isClerkAPIResponseError } from '@clerk/nextjs/errors';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const schema = yup.object().shape({
  email: yup
    .string()
    .email('Correo electrónico inválido')
    .required('El correo electrónico es obligatorio'),
  password: yup
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .required('La contraseña es obligatoria'),
});

type LoginFormData = yup.InferType<typeof schema>;

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { signOut } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormData>({
    criteriaMode: 'firstError',
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'all',
    reValidateMode: 'onChange',
    resolver: yupResolver(schema),
  });

  if (!isLoaded) return null;

  const handleLoginWithEmailAndPassword = async (data: LoginFormData) => {
    try {
      setIsLoading(true);

      const result = await signIn.create({
        identifier: data.email,
        password: data.password,
      });

      if (result.status !== 'complete') {
        Swal.fire({
          icon: 'error',
          text: 'Ha ocurrido un error, por favor intente de nuevo.',
        });

        return;
      }

      if (result.status === 'complete') {
        console.log('Login exitoso');
        await setActive({
          session: result.createdSessionId,
        });

        router.replace('/dashboard');
      }
    } catch (error) {
      console.error('🚀 ~ handleLoginWithEmailAndPassword ~ error:', error);
      if (isClerkAPIResponseError(error) && error.errors) {
        const firstError = error.errors?.[0];

        if (
          firstError.code === 'form_password_incorrect' ||
          firstError.code === 'form_identifier_not_found'
        ) {
          Swal.fire({
            icon: 'error',
            text: 'El usuario o la contraseña son incorrectos',
          });

          return;
        }

        if (firstError.code === 'session_exists') {
          Swal.fire({
            icon: 'error',
            text: 'Ya existe una sesión activa',
          }).then(() => {
            signOut({ redirectUrl: '/auth/login' });
          });

          return;
        }

        return;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginWithGoogle = async (e: React.FormEvent) => {
    try {
      e.preventDefault();
      setIsLoading(true);

      const result = await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback', // ruta definida en Clerk
        redirectUrlComplete: '/dashboard',
      });
    } catch (error) {
      console.error('🚀 ~ handleLoginWithGoogle ~ error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Bienvenido</CardTitle>
          <CardDescription>
            Inicia sesión con tu cuenta de google
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleLoginWithEmailAndPassword)}>
              <div className="grid gap-6">
                <div className="flex flex-col gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleLoginWithGoogle}
                  >
                    {isLoading ? (
                      <>
                        <Loader2Icon className="animate-spin" /> Cargando
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                            fill="currentColor"
                          />
                        </svg>
                        Login with Google
                      </>
                    )}
                  </Button>
                </div>
                <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                  <span className="bg-card text-muted-foreground relative z-10 px-2">
                    O continua con
                  </span>
                </div>
                <div className="grid gap-6">
                  <div className="grid gap-3">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correo electrónico</FormLabel>
                          <FormControl>
                            <Input
                              id="email"
                              type="email"
                              placeholder="m@example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-3">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center">
                            <FormLabel>Contraseña</FormLabel>
                            <a
                              href="#"
                              className="ml-auto text-sm underline-offset-4 hover:underline"
                            >
                              ¿Olvidaste tu contraseña?
                            </a>
                          </div>
                          <FormControl>
                            <Input id="password" type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2Icon className="animate-spin" /> Cargando
                      </>
                    ) : (
                      'Iniciar sesión'
                    )}
                  </Button>
                </div>
                <div className="text-center text-sm">
                  ¿No tienes una cuenta?{' '}
                  <Link
                    href={'/auth/register'}
                    className="underline underline-offset-4"
                  >
                    Registrarse
                  </Link>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        Al dar click en continuar, usted acepta los{' '}
        <a href="#">Términos y condiciones </a> y la{' '}
        <a href="#">Política de privacidad</a>.
      </div>
    </div>
  );
}
