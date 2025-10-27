'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { toast } from 'sonner';
import SuppliersList from './features/suppliers-list';

const SuppliersPage = () => {
  const router = useRouter();
  const user = useStore((state) => state.user);

  // Verificar que el usuario es ADMIN
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      toast.error('No tienes permisos para acceder a esta sección');
      router.push('/dashboard');
    }
  }, [user, router]);

  // Mostrar loading mientras verifica permisos
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className='flex flex-1 flex-col'>
      <SuppliersList />
    </div>
  );
};

export default SuppliersPage;
