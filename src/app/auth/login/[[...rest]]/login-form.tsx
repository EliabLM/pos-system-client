'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSignIn, useUser } from '@clerk/nextjs';
import { Loader2Icon } from 'lucide-react';

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
import { Label } from '@/components/ui/label';

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useUser();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isSignedIn) {
      router.replace('/dashboard');
    }
  }, [isSignedIn]);

  if (!isLoaded) return null;

  const handleLoginWithEmailAndPassword = async (e: React.FormEvent) => {
    try {
      e.preventDefault();
      setIsLoading(true);

      const result = await signIn.create({
        identifier: 'eliablopez@hotmail.com',
        password: 'Asdf1234$$',
      });
      console.log('🚀 ~ handleLoginWithEmailAndPassword ~ result:', result);

      if (result.status !== 'complete') {
        //TODO - Agregar SWAL2 o componentes de Shadcn
        alert('Ha ocurrido un error, revisar logs');
        console.error('Error iniciando sesión', result);
        return;
      }

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.push('/dashboard');
      }
    } catch (error: any) {
      if (error.errors && Array.isArray(error.errors)) {
        // Generalmente viene un arreglo con mensajes

        console.error('Clerk error:', error.errors);
      } else {
        console.error('🚀 ~ handleLoginWithEmailAndPassword ~ error:', error);
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
      console.log('🚀 ~ handleLoginWithGoogle ~ result:', result);
    } catch (error) {
      console.error('🚀 ~ handleLoginWithGoogle ~ error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className='text-center'>
          <CardTitle className='text-xl'>Bienvenido</CardTitle>
          <CardDescription>
            Inicia sesión con tu cuenta de google
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLoginWithEmailAndPassword}>
            <div className='grid gap-6'>
              <div className='flex flex-col gap-4'>
                <Button
                  type='button'
                  variant='outline'
                  className='w-full'
                  onClick={handleLoginWithGoogle}
                >
                  {isLoading ? (
                    <>
                      <Loader2Icon className='animate-spin' /> Cargando
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        viewBox='0 0 24 24'
                      >
                        <path
                          d='M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z'
                          fill='currentColor'
                        />
                      </svg>
                      Login with Google
                    </>
                  )}
                </Button>
              </div>
              <div className='after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t'>
                <span className='bg-card text-muted-foreground relative z-10 px-2'>
                  O continua con
                </span>
              </div>
              <div className='grid gap-6'>
                <div className='grid gap-3'>
                  <Label htmlFor='email'>Correo electrónico</Label>
                  <Input id='email' type='email' placeholder='m@example.com' />
                </div>
                <div className='grid gap-3'>
                  <div className='flex items-center'>
                    <Label htmlFor='password'>Contraseña</Label>
                    <a
                      href='#'
                      className='ml-auto text-sm underline-offset-4 hover:underline'
                    >
                      ¿Olvidaste tu contraseña?
                    </a>
                  </div>
                  <Input id='password' type='password' />
                </div>
                <Button type='submit' className='w-full' disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2Icon className='animate-spin' /> Cargando
                    </>
                  ) : (
                    'Iniciar sesión'
                  )}
                </Button>
              </div>
              <div className='text-center text-sm'>
                ¿No tienes una cuenta?{' '}
                <Link
                  href={'/auth/register'}
                  className='underline underline-offset-4'
                >
                  Registrarse
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className='text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4'>
        Al dar click en continuar, usted acepta los{' '}
        <a href='#'>Términos y condiciones </a> y la{' '}
        <a href='#'>Política de privacidad</a>.
      </div>
    </div>
  );
}
