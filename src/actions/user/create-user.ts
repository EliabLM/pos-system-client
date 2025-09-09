'use server';

import { User, Prisma } from '@/generated/prisma';
import { ActionResponse } from '@/interfaces';
import { prisma } from '../utils';

// CREATE
export const registerUser = async (
  userData: Omit<
    User,
    'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
  >
): Promise<ActionResponse<User | null>> => {
  try {
    // Verificar unicidad de clerkId
    const existingUserByClerkId = await prisma.user.findFirst({
      where: {
        clerkId: userData.clerkId,
        isDeleted: false,
      },
    });

    if (existingUserByClerkId) {
      return {
        status: 409,
        message: 'Ya existe un usuario con ese Clerk ID',
        data: null,
      };
    }

    const newUser = await prisma.user.create({
      data: userData,
    });

    return {
      status: 201,
      message: 'Usuario creado exitosamente',
      data: newUser,
    };
  } catch (error) {
    console.error('Error creating user:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[];
        if (target?.includes('clerkId')) {
          return {
            status: 409,
            message: 'Ya existe un usuario con ese Clerk ID',
            data: null,
          };
        }
        if (target?.includes('email')) {
          return {
            status: 409,
            message: 'Ya existe un usuario con ese email',
            data: null,
          };
        }
        if (target?.includes('username')) {
          return {
            status: 409,
            message: 'Ya existe un usuario con ese nombre de usuario',
            data: null,
          };
        }
      }
      if (error.code === 'P2003') {
        return {
          status: 400,
          message: 'Una de las referencias especificadas no existe',
          data: null,
        };
      }
    }

    return { status: 500, message: 'Error interno del servidor', data: null };
  }
};
