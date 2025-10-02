import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/actions/utils';

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      'Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local'
    );
  }

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400,
    });
  }

  const eventType = evt.type;

  console.log(`Webhook event type: ${eventType}`);

  // Manejar el evento cuando un usuario acepta una invitación
  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, public_metadata } = evt.data;

    console.log('User created event:', { id, email_addresses, first_name, last_name, public_metadata });

    // Obtener el email principal
    const primaryEmail = email_addresses.find((email: any) => email.id === evt.data.primary_email_address_id);
    const email = primaryEmail?.email_address;

    if (!email) {
      console.error('No email found for user');
      return NextResponse.json({ error: 'No email found' }, { status: 400 });
    }

    try {
      // Buscar el usuario en la base de datos por email
      const user = await prisma.user.findFirst({
        where: {
          email: email,
          clerkId: {
            startsWith: 'pending_',
          },
          isDeleted: false,
        },
      });

      if (user) {
        // Actualizar el clerkId con el ID real de Clerk
        await prisma.user.update({
          where: { id: user.id },
          data: {
            clerkId: id,
            emailVerified: true,
            updatedAt: new Date(),
          },
        });

        console.log(`Updated user ${user.id} with Clerk ID ${id}`);
      } else {
        console.log(`No pending user found with email ${email}`);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      return NextResponse.json(
        { error: 'Error updating user' },
        { status: 500 }
      );
    }
  }

  // Manejar la actualización de usuario (por si acaso)
  if (eventType === 'user.updated') {
    const { id, email_addresses } = evt.data;

    const primaryEmail = email_addresses.find((email: any) => email.id === evt.data.primary_email_address_id);
    const email = primaryEmail?.email_address;

    if (!email) {
      console.error('No email found for user');
      return NextResponse.json({ error: 'No email found' }, { status: 400 });
    }

    try {
      // Buscar usuario pendiente por email
      const user = await prisma.user.findFirst({
        where: {
          email: email,
          clerkId: {
            startsWith: 'pending_',
          },
          isDeleted: false,
        },
      });

      if (user) {
        // Actualizar el clerkId
        await prisma.user.update({
          where: { id: user.id },
          data: {
            clerkId: id,
            emailVerified: true,
            updatedAt: new Date(),
          },
        });

        console.log(`Updated user ${user.id} with Clerk ID ${id} (from user.updated event)`);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      return NextResponse.json(
        { error: 'Error updating user' },
        { status: 500 }
      );
    }
  }

  return new Response('', { status: 200 });
}
