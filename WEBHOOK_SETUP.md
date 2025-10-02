# Configuración del Webhook de Clerk

Este documento explica cómo configurar el webhook de Clerk para actualizar automáticamente el `clerkId` de los usuarios vendedores cuando aceptan su invitación.

## Problema que resuelve

Cuando se crea un usuario vendedor:
1. Se envía una invitación desde Clerk
2. Se crea el usuario en la DB con `clerkId: "pending_{invitationId}"`
3. El usuario acepta la invitación y crea su contraseña
4. Clerk genera un `clerkId` real para ese usuario
5. **SIN WEBHOOK**: El usuario no puede iniciar sesión porque su clerkId en DB sigue siendo "pending_..."

## Configuración

### 1. Obtener la URL del Webhook

Tu webhook está ubicado en:
```
https://tu-dominio.com/api/webhooks/clerk
```

Para desarrollo local, usa un servicio como [ngrok](https://ngrok.com/) o [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/):

```bash
# Ejemplo con ngrok
ngrok http 3000

# Esto te dará una URL como: https://abc123.ngrok.io
# Tu webhook sería: https://abc123.ngrok.io/api/webhooks/clerk
```

### 2. Configurar en Clerk Dashboard

1. Ve a [Clerk Dashboard](https://dashboard.clerk.com/)
2. Selecciona tu aplicación
3. En el menú lateral, ve a **Webhooks**
4. Click en **Add Endpoint**
5. Configura:
   - **Endpoint URL**: `https://tu-dominio.com/api/webhooks/clerk`
   - **Subscribe to events**: Selecciona:
     - ✅ `user.created` (Principal - cuando el usuario acepta la invitación)
     - ✅ `user.updated` (Backup - por si acaso)
   - **API Version**: La más reciente disponible

6. Click en **Create**

### 3. Obtener el Webhook Secret

Después de crear el webhook:
1. Clerk te mostrará un **Signing Secret** (webhook secret)
2. Cópialo (solo se muestra una vez)
3. Agrégalo a tu archivo `.env`:

```bash
# .env
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4. Verificar la configuración

Para verificar que el webhook funciona:

1. **Crear un usuario de prueba**:
   - Ve a Dashboard → Usuarios
   - Crea un nuevo vendedor
   - Se enviará una invitación

2. **Verificar en la DB**:
   ```sql
   SELECT id, email, clerkId, emailVerified
   FROM "User"
   WHERE email = 'email-del-vendedor@ejemplo.com';
   ```
   Deberías ver: `clerkId: "pending_inv_xxxxx"`, `emailVerified: false`

3. **Aceptar la invitación**:
   - Abre el email de invitación
   - Crea una contraseña
   - Completa el proceso

4. **Verificar nuevamente en la DB**:
   ```sql
   SELECT id, email, clerkId, emailVerified
   FROM "User"
   WHERE email = 'email-del-vendedor@ejemplo.com';
   ```
   Deberías ver: `clerkId: "user_xxxxx"` (real), `emailVerified: true`

### 5. Ver logs del webhook

En Clerk Dashboard → Webhooks → Tu endpoint, puedes ver:
- Eventos enviados
- Respuestas recibidas
- Errores si los hay
- Logs de cada intento

También puedes ver los logs en tu servidor/terminal donde corre Next.js.

## Eventos que maneja el webhook

### `user.created`
Se dispara cuando:
- Un usuario completa el registro/invitación
- Es el evento principal que usamos

Acción:
- Busca usuario con email coincidente y clerkId pendiente
- Actualiza `clerkId` al ID real
- Marca `emailVerified: true`

### `user.updated`
Se dispara cuando:
- Un usuario actualiza su perfil
- Es un evento de respaldo

Acción:
- Misma lógica que `user.created`
- Por si el primer evento falla

## Actualización manual (fallback)

Si por alguna razón el webhook falla, existe una función server action de respaldo:

```typescript
import { updateClerkIdByEmail } from '@/actions/user';

// Actualizar manualmente
await updateClerkIdByEmail(
  'email@ejemplo.com',
  'user_2xxx...' // clerkId real obtenido de Clerk Dashboard
);
```

## Troubleshooting

### El webhook no se dispara
1. Verifica que la URL sea accesible públicamente
2. Verifica que los eventos estén seleccionados
3. Revisa los logs en Clerk Dashboard

### Error 400 en el webhook
- Verifica que `CLERK_WEBHOOK_SECRET` esté correctamente configurado
- Asegúrate de que el secret coincida con el de Clerk Dashboard

### Usuario sigue con clerkId pendiente
1. Ve a Clerk Dashboard → Webhooks → Tu endpoint
2. Busca el evento `user.created` para ese email
3. Si no existe, el usuario no completó el registro
4. Si existe pero falló, revisa el error
5. Usa la actualización manual como fallback

## Entorno de producción

Cuando despliegues a producción:

1. Actualiza la URL del webhook en Clerk Dashboard:
   ```
   https://tu-dominio-produccion.com/api/webhooks/clerk
   ```

2. Asegúrate de que `CLERK_WEBHOOK_SECRET` esté en las variables de entorno de producción

3. Verifica que el endpoint sea accesible (no bloqueado por CORS, firewall, etc.)

## Seguridad

- ✅ El webhook verifica la firma usando el secret
- ✅ Solo actualiza usuarios con clerkId pendiente
- ✅ No expone información sensible en los logs
- ✅ Maneja errores sin exponer detalles internos
