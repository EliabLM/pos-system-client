'use server';

import { SystemConfig } from '@/generated/prisma';
import { ActionResponse } from '@/interfaces';
import { prisma, checkAdminRole, unauthorizedResponse } from '../utils';

// CREATE - Crear configuración del sistema
export async function createSystemConfig(
  organizationId: string,
  key: string,
  value: string,
  type: string = 'STRING',
  description?: string
): Promise<ActionResponse<SystemConfig | null>> {
  try {
    const config = await prisma.systemConfig.create({
      data: {
        organizationId,
        key,
        value,
        type,
        description,
        isDeleted: false,
      },
    });

    return {
      status: 201,
      message: 'Configuración creada exitosamente',
      data: config,
    };
  } catch (error) {
    console.error('Error creating system config:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
}

// GET - Obtener configuración por key
export async function getSystemConfig(
  organizationId: string,
  key: string
): Promise<ActionResponse<SystemConfig | null>> {
  try {
    const config = await prisma.systemConfig.findFirst({
      where: {
        organizationId,
        key,
        isDeleted: false,
      },
    });

    if (!config) {
      return {
        status: 404,
        message: 'Configuración no encontrada',
        data: null,
      };
    }

    return {
      status: 200,
      message: 'Configuración obtenida exitosamente',
      data: config,
    };
  } catch (error) {
    console.error('Error fetching system config:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
}

// GET ALL - Obtener todas las configuraciones
export async function getAllSystemConfigs(
  organizationId: string
): Promise<ActionResponse<SystemConfig[] | null>> {
  try {
    const configs = await prisma.systemConfig.findMany({
      where: {
        organizationId,
        isDeleted: false,
      },
      orderBy: { key: 'asc' },
    });

    return {
      status: 200,
      message: 'Configuraciones obtenidas exitosamente',
      data: configs,
    };
  } catch (error) {
    console.error('Error fetching system configs:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
}

// UPDATE - Actualizar configuración
export async function updateSystemConfig(
  organizationId: string,
  adminUserId: string,
  key: string,
  value: string
): Promise<ActionResponse<SystemConfig | null>> {
  try {
    const isAdmin = await checkAdminRole(adminUserId);
    if (!isAdmin) return unauthorizedResponse();

    // ⚠️ PREVENIR cambio de business_type
    if (key === 'business_type') {
      return {
        status: 403,
        message: 'No se puede cambiar el tipo de negocio después del onboarding',
        data: null,
      };
    }

    const config = await prisma.systemConfig.findFirst({
      where: {
        organizationId,
        key,
        isDeleted: false,
      },
    });

    if (!config) {
      return {
        status: 404,
        message: 'Configuración no encontrada',
        data: null,
      };
    }

    const updatedConfig = await prisma.systemConfig.update({
      where: { id: config.id },
      data: {
        value,
        updatedAt: new Date(),
      },
    });

    return {
      status: 200,
      message: 'Configuración actualizada exitosamente',
      data: updatedConfig,
    };
  } catch (error) {
    console.error('Error updating system config:', error);
    return { status: 500, message: 'Error interno del servidor', data: null };
  }
}

// Helper: Obtener tipo de negocio
export async function getBusinessType(
  organizationId: string
): Promise<'liquor_store' | 'shoe_store' | null> {
  try {
    const config = await prisma.systemConfig.findFirst({
      where: {
        organizationId,
        key: 'business_type',
        isDeleted: false,
      },
    });

    if (!config) return null;

    const value = config.value as 'liquor_store' | 'shoe_store';
    return value;
  } catch (error) {
    console.error('Error fetching business type:', error);
    return null;
  }
}

// Helper: Establecer tipo de negocio
export async function setBusinessType(
  organizationId: string,
  businessType: 'liquor_store' | 'shoe_store'
): Promise<ActionResponse<SystemConfig | null>> {
  return createSystemConfig(
    organizationId,
    'business_type',
    businessType,
    'STRING',
    'Tipo de negocio de la organización'
  );
}
