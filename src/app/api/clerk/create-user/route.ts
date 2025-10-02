import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Verificar que el usuario esté autenticado
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { firstName, lastName, emailAddress } = body;

    // Validar datos requeridos
    if (!firstName || !lastName || !emailAddress) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    const client = await clerkClient();

    // Obtener la URL base de la aplicación
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUrl = `${baseUrl}/auth/login`;

    // Crear invitación de usuario en Clerk
    const invitation = await client.invitations.createInvitation({
      emailAddress,
      publicMetadata: {
        firstName,
        lastName,
        invitedByAdmin: true,
        invitedBy: userId,
      },
      redirectUrl,
    });

    return NextResponse.json(
      {
        id: invitation.id,
        emailAddress: invitation.emailAddress,
        status: invitation.status,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating Clerk invitation:', error);
    console.error('Error details:', JSON.stringify(error.errors, null, 2));

    // Manejar errores específicos de Clerk
    if (error.errors && error.errors.length > 0) {
      const clerkError = error.errors[0];

      console.log('Clerk error code:', clerkError.code);
      console.log('Clerk error message:', clerkError.message);

      // Error de email duplicado
      if (clerkError.code === 'form_identifier_exists' || clerkError.code === 'duplicate_record') {
        return NextResponse.json(
          { error: 'Ya existe un usuario o invitación con ese email' },
          { status: 409 }
        );
      }

      // Otros errores de validación
      return NextResponse.json(
        { error: clerkError.message || 'Error de validación' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
