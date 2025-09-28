'use client';
import React from 'react';
import { useState } from 'react';

import { ClerkProvider } from '@clerk/nextjs';
import { esMX } from '@clerk/localizations';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';

const Providers = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ClerkProvider
      localization={esMX}
      appearance={{ variables: { colorPrimary: '#00c950' } }}
      signInUrl="/auth/login"
      signUpUrl="/auth/register"
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster richColors />
        </QueryClientProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
};

export default Providers;
