# Router Redirect Fix Guide

Guía completa para solucionar problemas de redirección con Next.js en producción (OCI) vs desarrollo (Vercel).

## Tabla de Contenidos

- [Descripción del Problema](#descripción-del-problema)
- [Causa Raíz](#causa-raíz)
- [Solución Implementada](#solución-implementada)
- [Archivos Modificados](#archivos-modificados)
- [Configuración de OCI](#configuración-de-oci)
- [Configuración de nginx](#configuración-de-nginx)
- [Configuración de Cookies](#configuración-de-cookies)
- [Patrón de Implementación](#patrón-de-implementación)
- [Testing y Verificación](#testing-y-verificación)
- [Troubleshooting](#troubleshooting)
- [Mejores Prácticas](#mejores-prácticas)

---

## Descripción del Problema

### Síntoma

En producción (Oracle Cloud Infrastructure con nginx), las redirecciones después de operaciones de autenticación no funcionaban correctamente:

1. ❌ **Registro de usuario** → No redirigía a `/onboarding`
2. ❌ **Login** → No redirigía a `/dashboard` o `/onboarding`
3. ❌ **Logout** → No redirigía a `/auth/login`
4. ❌ **Onboarding completado** → No redirigía a `/dashboard`
5. ❌ **Errores de autenticación** → No redirigía a `/auth/login`

### Comportamiento

- ✅ **Funcionaba en desarrollo** (localhost con `pnpm dev`)
- ✅ **Funcionaba en Vercel** (despliegue automático)
- ❌ **NO funcionaba en OCI** (servidor de producción)

Los usuarios veían el toast de éxito pero permanecían en la misma página, sin redirección.

---

## Causa Raíz

### 1. Diferencia entre `router.push()` y `window.location.href`

#### `router.push()` (Client-Side Navigation)

```typescript
// ❌ PROBLEMA en OCI
const router = useRouter();
router.push('/dashboard');

// Comportamiento:
// - Navegación del lado del cliente
// - No recarga la página completa
// - Next.js Router intenta hacer navegación optimizada
// - El middleware puede usar cookies/tokens cacheados
// - Las cookies JWT actualizadas NO se propagan inmediatamente
```

#### `window.location.href` (Full Page Reload)

```typescript
// ✅ SOLUCIÓN
window.location.href = '/dashboard';

// Comportamiento:
// - Recarga completa del navegador
// - El middleware se re-ejecuta con cookies frescas
// - Todas las cookies y headers se leen del servidor
// - Evita problemas de sincronización
```

### 2. Problemas Específicos de OCI

**Diferencias de infraestructura:**

| Aspecto | Vercel | OCI con nginx |
|---------|--------|---------------|
| **Infraestructura** | Optimizada para Next.js | nginx + Node.js manual |
| **HTTPS** | Automático | Requiere configuración manual |
| **Cookie handling** | Optimizado | Puede tener delays de propagación |
| **Edge Runtime** | Nativo | Puede diferir |
| **Middleware caching** | Sincronizado | Puede usar valores viejos |

**Configuración de cookies problemática:**

```typescript
// Problema inicial en OCI (sin HTTPS)
cookieStore.set('auth-token', token, {
  httpOnly: true,
  secure: true, // ❌ Requiere HTTPS - bloqueaba cookies en HTTP
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60,
  path: '/',
});
```

### 3. Race Conditions con JWT

```typescript
// ❌ PROBLEMA: Race condition
await refreshToken(userId);        // Actualiza JWT en cookie
setUser(updatedUser);              // Actualiza store local
router.push('/dashboard');         // Navegación INMEDIATA
// El middleware puede ejecutarse ANTES de que la cookie se propague
```

```typescript
// ✅ SOLUCIÓN: Esperar propagación
await refreshToken(userId);        // Actualiza JWT en cookie
setUser(updatedUser);              // Actualiza store local
await new Promise(r => setTimeout(r, 300)); // ESPERA 300ms
window.location.href = '/dashboard';        // Recarga completa
```

---

## Solución Implementada

### Estrategia General

1. **Reemplazar `router.push()` con `window.location.href`** en TODAS las operaciones relacionadas con autenticación
2. **Agregar delay de 300ms** antes de redireccionar para permitir propagación de cookies
3. **Eliminar importaciones y declaraciones** de `useRouter` cuando ya no se usen
4. **Configurar cookies correctamente** para el entorno de producción

### Patrón de Código

**❌ ANTES (No funcionaba en OCI):**

```typescript
'use client';
import { useRouter } from 'next/navigation';

export function MyComponent() {
  const router = useRouter();

  const handleAction = async () => {
    const result = await someAuthAction();

    if (result.status === 200) {
      toast.success('Éxito');
      router.push('/dashboard'); // ❌ No funciona en OCI
    }
  };

  return <button onClick={handleAction}>Acción</button>;
}
```

**✅ DESPUÉS (Funciona en todos los entornos):**

```typescript
'use client';
// NO importar useRouter si solo se usa para auth redirects

export function MyComponent() {
  // NO declarar router

  const handleAction = async () => {
    const result = await someAuthAction();

    if (result.status === 200) {
      toast.success('Éxito');

      // Delay para propagación de cookies
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Redirección con recarga completa
      window.location.href = '/dashboard'; // ✅ Funciona en OCI
    }
  };

  return <button onClick={handleAction}>Acción</button>;
}
```

---

## Archivos Modificados

### 1. `src/app/auth/register/register-form.tsx`

**Flujo:** Registro exitoso → Onboarding

**Cambios:**

```typescript
// ❌ ANTES
import { useRouter } from 'next/navigation';

export const RegisterForm = () => {
  const router = useRouter();

  const onSubmit = async (data: FormData) => {
    const result = await registerUser(formData);

    if (result.status === 201) {
      await Swal.fire({
        icon: 'success',
        title: '¡Cuenta creada!',
        text: 'Ahora vamos a configurar tu organización.',
      });

      router.push('/onboarding'); // ❌ No funciona
    }
  };
};

// ✅ DESPUÉS
// (sin importar useRouter)

export const RegisterForm = () => {
  // (sin declarar router)

  const onSubmit = async (data: FormData) => {
    const result = await registerUser(formData);

    if (result.status === 201) {
      await Swal.fire({
        icon: 'success',
        title: '¡Cuenta creada!',
        text: 'Ahora vamos a configurar tu organización.',
      });

      // Delay para propagación
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Redirección con recarga completa
      window.location.href = '/onboarding'; // ✅ Funciona
    }
  };
};
```

### 2. `src/app/auth/login/login-form.tsx`

**Flujo:** Login exitoso → Dashboard u Onboarding

**Cambios:**

```typescript
// ✅ DESPUÉS
const handleLogin = async (data: LoginFormData) => {
  const formData = new FormData();
  formData.append('email', data.email);
  formData.append('password', data.password);

  const result = await loginUser(formData);

  if (result?.status === 200 && result.data?.user) {
    // Guardar usuario en store
    setUser(result.data.user as User);

    // Mostrar toast
    toast.success(result.message || 'Inicio de sesión exitoso');

    // Obtener URL de redirección del server action
    const redirectUrl = result.data.redirectTo || '/dashboard';

    // Delay para propagación de cookies
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Redirección con recarga completa
    window.location.href = redirectUrl; // ✅ Funciona
    return;
  }

  // Manejar errores...
};
```

### 3. `src/app/onboarding/features/create-organization.tsx`

**Flujo:** Onboarding completado → Dashboard

**Cambios:**

```typescript
// ✅ DESPUÉS
const onSubmit = async (data: FormData) => {
  // ... crear organización ...

  // Actualizar usuario
  await updateUserMutation.mutateAsync({
    userId: currentUser.id,
    orgId: resOrgDb.id,
  });

  // Refrescar token JWT con organizationId actualizado
  const refreshResult = await refreshToken(currentUser.id);

  if (refreshResult.status === 200 && refreshResult.data?.user) {
    setUser(refreshResult.data.user as User);
  }

  toast.success('¡Organización creada exitosamente!');

  // Delay para que el token actualizado se propague
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Redirección con recarga completa
  window.location.href = '/dashboard'; // ✅ Funciona
};
```

### 4. `src/components/site-header.tsx`

**Flujo:** Logout → Login

**Cambios:**

```typescript
// ❌ ANTES
import { useRouter } from 'next/navigation';

export function SiteHeader() {
  const router = useRouter();

  const handleLogout = async () => {
    const result = await logoutUser();

    if (result.status === 200) {
      performLogoutCleanup(queryClient);
      toast.success('Sesión cerrada exitosamente');
      router.push('/auth/login'); // ❌ No funciona
    }
  };
}

// ✅ DESPUÉS
// (sin importar useRouter)

export function SiteHeader() {
  // (sin declarar router)

  const handleLogout = async () => {
    const result = await logoutUser();

    if (result.status === 200) {
      performLogoutCleanup(queryClient);
      toast.success('Sesión cerrada exitosamente');
      window.location.href = '/auth/login'; // ✅ Funciona
    }
  };
}
```

### 5. `src/components/nav-user.tsx`

**Flujo:** Logout desde sidebar → Login

**Mismo patrón que `site-header.tsx`**

### 6. `src/app/dashboard/layout.tsx`

**Flujo:** Errores de autenticación → Login

**Cambios:**

```typescript
// ❌ ANTES
import { useRouter } from 'next/navigation';

const DashboardLayout = ({ children }) => {
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const result = await getCurrentUser();

      if (result.status === 401) {
        setUser(null);
        router.push('/auth/login'); // ❌ No funciona
        return;
      }

      if (result.status === 403) {
        setUser(null);
        router.push('/auth/login'); // ❌ No funciona
        return;
      }

      // ...
    };

    fetchUser();
  }, [router, setUser]); // router en dependencias
};

// ✅ DESPUÉS
// (sin importar useRouter)

const DashboardLayout = ({ children }) => {
  // (sin declarar router)

  useEffect(() => {
    const fetchUser = async () => {
      const result = await getCurrentUser();

      if (result.status === 401) {
        setUser(null);
        window.location.href = '/auth/login'; // ✅ Funciona
        return;
      }

      if (result.status === 403) {
        setUser(null);
        window.location.href = '/auth/login'; // ✅ Funciona
        return;
      }

      // ...
    };

    fetchUser();
  }, [setUser]); // router ya no está en dependencias
};
```

### 7. `src/actions/auth/login.ts`

**Flujo:** Login Server Action

**Cambios importantes:**

```typescript
// Configuración de cookies (temporal hasta configurar HTTPS)
const cookieStore = await cookies();
cookieStore.set(COOKIE_NAME, session.token, {
  httpOnly: true,
  secure: false, // ✅ CAMBIAR A false temporalmente (sin HTTPS)
  // secure: process.env.NODE_ENV === 'production', // ❌ Bloqueaba en OCI
  sameSite: 'lax',
  maxAge: data.rememberMe ? 30 * 24 * 60 * 60 : COOKIE_MAX_AGE,
  path: '/',
});

// Agregar redirectTo en la respuesta
const redirectUrl = user.organizationId ? '/dashboard' : '/onboarding';

return {
  status: 200,
  message: 'Inicio de sesión exitoso',
  data: {
    user: userWithoutPassword,
    sessionId: session.id,
    redirectTo: redirectUrl, // ✅ Cliente usa esto para redireccionar
  },
};
```

---

## Configuración de OCI

### 1. Security Lists (Firewall de OCI)

Asegúrate de que los puertos necesarios estén abiertos:

#### Puerto 22 (SSH)

**Ingress Rule:**
- **Source Type:** CIDR
- **Source CIDR:** `0.0.0.0/0` (o tu IP específica: `TU_IP/32`)
- **IP Protocol:** TCP
- **Source Port Range:** All
- **Destination Port Range:** `22`
- **Description:** SSH Access

#### Puerto 80 (HTTP)

**Ingress Rule:**
- **Source Type:** CIDR
- **Source CIDR:** `0.0.0.0/0`
- **IP Protocol:** TCP
- **Source Port Range:** All
- **Destination Port Range:** `80`
- **Description:** HTTP Traffic

#### Puerto 443 (HTTPS) - Cuando configures SSL

**Ingress Rule:**
- **Source Type:** CIDR
- **Source CIDR:** `0.0.0.0/0`
- **IP Protocol:** TCP
- **Source Port Range:** All
- **Destination Port Range:** `443`
- **Description:** HTTPS Traffic

### 2. Firewall del SO (Ubuntu/Debian)

```bash
# Conectar al servidor
ssh usuario@ip-oci -i ~/.ssh/oci-key.pem

# Verificar estado del firewall
sudo ufw status

# Si está inactivo, activarlo
sudo ufw enable

# Permitir SSH (IMPORTANTE hacer esto PRIMERO)
sudo ufw allow 22/tcp

# Permitir HTTP
sudo ufw allow 80/tcp

# Permitir HTTPS (cuando configures SSL)
sudo ufw allow 443/tcp

# Permitir aplicación Node.js (si es necesario acceder directamente)
sudo ufw allow 3000/tcp

# Verificar reglas
sudo ufw status numbered

# Recargar firewall
sudo ufw reload
```

### 3. Variables de Entorno en OCI

Archivo `.env` en el servidor:

```bash
# Conectar al servidor
ssh usuario@ip-oci -i ~/.ssh/oci-key.pem

# Navegar al proyecto
cd /ruta/a/pos-system-client

# Editar .env
nano .env
```

**Contenido del `.env`:**

```env
# Database (PostgreSQL local en OCI)
DATABASE_URL="postgresql://postgres:tu_password@localhost:5432/pos_system"
DIRECT_URL="postgresql://postgres:tu_password@localhost:5432/pos_system"

# JWT Secret (DEBE ser el mismo que en desarrollo si compartes usuarios)
JWT_SECRET="tu_secreto_jwt_muy_largo_y_seguro_aqui_123!@#"

# Node Environment
NODE_ENV="production"

# UploadThing (opcional, si usas subida de archivos)
UPLOADTHING_TOKEN="tu_uploadthing_token"

# Puerto de la aplicación
PORT=3000
```

**Permisos del archivo:**

```bash
# Proteger el archivo .env
chmod 600 .env
chown $USER:$USER .env
```

---

## Configuración de nginx

### 1. Instalación de nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx -y

# Verificar instalación
nginx -v

# Iniciar nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verificar estado
sudo systemctl status nginx
```

### 2. Configuración del Virtual Host

Crear archivo de configuración:

```bash
sudo nano /etc/nginx/sites-available/pos-system
```

**Contenido (sin SSL - temporal):**

```nginx
# Upstream - Aplicación Next.js
upstream nextjs_app {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Servidor HTTP (puerto 80)
server {
    listen 80;
    listen [::]:80;

    # Reemplazar con tu dominio o IP pública
    server_name tu-dominio.com www.tu-dominio.com;
    # O si no tienes dominio:
    # server_name 123.456.789.10;

    # Logs
    access_log /var/log/nginx/pos-system-access.log;
    error_log /var/log/nginx/pos-system-error.log;

    # Tamaño máximo de body (para uploads)
    client_max_body_size 10M;

    # Proxy pass a Next.js
    location / {
        proxy_pass http://nextjs_app;
        proxy_http_version 1.1;

        # Headers importantes
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # No cachear
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files de Next.js (_next/static)
    location /_next/static {
        proxy_pass http://nextjs_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;

        # Cache de archivos estáticos
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Favicon y otros archivos públicos
    location ~* \.(ico|css|js|gif|jpeg|jpg|png|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://nextjs_app;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 3. Habilitar el sitio

```bash
# Crear symlink
sudo ln -s /etc/nginx/sites-available/pos-system /etc/nginx/sites-enabled/

# Eliminar sitio default (opcional)
sudo rm /etc/nginx/sites-enabled/default

# Verificar configuración
sudo nginx -t

# Si todo está bien, recargar nginx
sudo systemctl reload nginx
```

### 4. Configuración con SSL/HTTPS (Recomendado para producción)

#### Instalar Certbot (Let's Encrypt)

```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado SSL
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# Seguir las instrucciones en pantalla
# Certbot configurará automáticamente nginx con SSL
```

#### Configuración nginx con SSL (generada por Certbot)

```nginx
# Upstream
upstream nextjs_app {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Redirigir HTTP a HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name tu-dominio.com www.tu-dominio.com;

    # Redirigir todo el tráfico a HTTPS
    return 301 https://$server_name$request_uri;
}

# Servidor HTTPS (puerto 443)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name tu-dominio.com www.tu-dominio.com;

    # Certificados SSL (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Logs
    access_log /var/log/nginx/pos-system-access.log;
    error_log /var/log/nginx/pos-system-error.log;

    # Tamaño máximo de body
    client_max_body_size 10M;

    # Proxy pass a Next.js
    location / {
        proxy_pass http://nextjs_app;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https; # Importante: https

        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files
    location /_next/static {
        proxy_pass http://nextjs_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;

        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Otros archivos estáticos
    location ~* \.(ico|css|js|gif|jpeg|jpg|png|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://nextjs_app;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Renovación automática de certificados

```bash
# Probar renovación
sudo certbot renew --dry-run

# Certbot configura automáticamente un cron job
# Verificar:
sudo systemctl status certbot.timer

# O verificar crontab:
sudo crontab -l
```

### 5. Verificar configuración de nginx

```bash
# Ver configuración activa
sudo nginx -t

# Ver logs en tiempo real
sudo tail -f /var/log/nginx/pos-system-access.log
sudo tail -f /var/log/nginx/pos-system-error.log

# Reiniciar nginx
sudo systemctl restart nginx

# Recargar configuración (sin downtime)
sudo systemctl reload nginx
```

---

## Configuración de Cookies

### 1. Configuración Temporal (Sin HTTPS)

**Archivo:** `src/actions/auth/login.ts` y otros server actions

```typescript
// ⚠️ CONFIGURACIÓN TEMPORAL para OCI sin HTTPS
cookieStore.set(COOKIE_NAME, session.token, {
  httpOnly: true,
  secure: false, // ⚠️ FALSE porque no hay HTTPS
  sameSite: 'lax',
  maxAge: data.rememberMe ? 30 * 24 * 60 * 60 : COOKIE_MAX_AGE,
  path: '/',
});
```

### 2. Configuración de Producción (Con HTTPS)

**Una vez que tengas SSL/HTTPS configurado:**

```typescript
// ✅ CONFIGURACIÓN DE PRODUCCIÓN con HTTPS
cookieStore.set(COOKIE_NAME, session.token, {
  httpOnly: true,
  secure: true, // ✅ TRUE con HTTPS configurado
  sameSite: 'lax',
  maxAge: data.rememberMe ? 30 * 24 * 60 * 60 : COOKIE_MAX_AGE,
  path: '/',
});
```

### 3. Configuración Dinámica (Recomendado)

```typescript
// ✅ MEJOR: Detectar automáticamente basado en el entorno
const isProduction = process.env.NODE_ENV === 'production';
const hasHTTPS = process.env.HTTPS_ENABLED === 'true'; // Variable de entorno

cookieStore.set(COOKIE_NAME, session.token, {
  httpOnly: true,
  secure: isProduction && hasHTTPS, // Solo secure si hay HTTPS
  sameSite: 'lax',
  maxAge: data.rememberMe ? 30 * 24 * 60 * 60 : COOKIE_MAX_AGE,
  path: '/',
});
```

**Agregar a `.env`:**

```env
# Después de configurar SSL
HTTPS_ENABLED=true

# Antes de configurar SSL
HTTPS_ENABLED=false
```

---

## Patrón de Implementación

### Cuándo usar cada método de redirección

#### ✅ `window.location.href` - Usar para:

1. **Después de operaciones de autenticación:**
   - Login
   - Registro
   - Logout
   - Refresh de token
   - Cambio de organización

2. **Después de actualizar cookies/JWT:**
   - Cualquier operación que modifique cookies de sesión
   - Operaciones que requieran re-autenticación del middleware

3. **Errores de autenticación:**
   - Token expirado (401)
   - Cuenta desactivada (403)
   - Sin permisos (403)

**Ejemplo:**

```typescript
const handleAuthAction = async () => {
  const result = await authServerAction();

  if (result.status === 200) {
    // Actualizar estado local si es necesario
    setUser(result.data.user);

    // Mostrar feedback
    toast.success('Operación exitosa');

    // Delay para propagación de cookies
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Redirección con recarga completa
    window.location.href = '/ruta-destino';
  }
};
```

#### ✅ `router.push()` - Usar para:

1. **Navegación interna normal:**
   - Ir a otra página dentro del dashboard
   - Navegación entre rutas que NO afectan autenticación
   - Botones de navegación

2. **Cuando NO hay cambios en cookies/JWT:**
   - Formularios que solo actualizan datos
   - Listados con paginación
   - Navegación de breadcrumbs

**Ejemplo:**

```typescript
import { useRouter } from 'next/navigation';

const MyComponent = () => {
  const router = useRouter();

  const handleNavigation = () => {
    // Esta es navegación interna, no afecta autenticación
    router.push('/dashboard/sales');
  };

  return <button onClick={handleNavigation}>Ver Ventas</button>;
};
```

### Checklist de Implementación

#### Para cada componente que hace redirección después de auth:

- [ ] ¿La operación modifica JWT o cookies de sesión?
  - ✅ SÍ → Usar `window.location.href`
  - ❌ NO → Puede usar `router.push()`

- [ ] ¿Estoy en un componente de autenticación (login, register, logout)?
  - ✅ SÍ → Usar `window.location.href`

- [ ] ¿Necesito que el middleware se re-ejecute con datos frescos?
  - ✅ SÍ → Usar `window.location.href`

- [ ] Implementar delay de 300ms antes de redireccionar:
  ```typescript
  await new Promise((resolve) => setTimeout(resolve, 300));
  ```

- [ ] Eliminar importación de `useRouter` si ya no se usa:
  ```typescript
  // ❌ Eliminar si no se usa
  import { useRouter } from 'next/navigation';
  ```

- [ ] Eliminar declaración de router si ya no se usa:
  ```typescript
  // ❌ Eliminar si no se usa
  const router = useRouter();
  ```

- [ ] Actualizar dependencias de `useEffect` si se eliminó router:
  ```typescript
  // ❌ Antes
  useEffect(() => { ... }, [router, otherDeps]);

  // ✅ Después
  useEffect(() => { ... }, [otherDeps]);
  ```

---

## Testing y Verificación

### 1. Testing Local (Desarrollo)

```bash
# Iniciar aplicación en desarrollo
pnpm dev

# Probar flujos:
# 1. Registro de usuario
# 2. Login
# 3. Logout
# 4. Onboarding

# Verificar en DevTools:
# - Application → Cookies → auth-token debe existir
# - Network → Ver requests y redirects
```

### 2. Testing en OCI (Producción)

#### A. Desplegar cambios

```bash
# Conectar al servidor
ssh usuario@ip-oci -i ~/.ssh/oci-key.pem

# Navegar al proyecto
cd /ruta/a/pos-system-client

# Actualizar código
git pull origin main

# Instalar dependencias
pnpm install

# Generar Prisma client
npx prisma generate

# Compilar aplicación
pnpm build

# Reiniciar PM2
pm2 reload pos-system

# Ver logs
pm2 logs pos-system --lines 50
```

#### B. Verificar configuración

```bash
# Verificar que nginx está corriendo
sudo systemctl status nginx

# Verificar que la aplicación está corriendo
pm2 list

# Ver logs de nginx
sudo tail -f /var/log/nginx/pos-system-access.log

# Ver logs de la aplicación
pm2 logs pos-system
```

#### C. Probar desde navegador

1. **Abrir DevTools** (F12)
2. **Ir a Application → Cookies**
3. **Probar flujos:**

**Registro:**
```
1. Ir a https://tu-dominio.com/auth/register
2. Completar formulario
3. Submit
4. Verificar:
   - Cookie 'auth-token' se crea
   - Redirección a /onboarding funciona
   - No hay errores en Console
```

**Login:**
```
1. Ir a https://tu-dominio.com/auth/login
2. Ingresar credenciales
3. Submit
4. Verificar:
   - Cookie 'auth-token' se crea
   - Redirección a /dashboard o /onboarding
   - Usuario aparece en la interfaz
```

**Logout:**
```
1. En /dashboard
2. Click en Logout
3. Verificar:
   - Cookie 'auth-token' se elimina
   - Redirección a /auth/login
   - Ya no se puede acceder a /dashboard
```

**Onboarding:**
```
1. Usuario nuevo sin organización
2. Login → debe ir a /onboarding
3. Completar formulario de organización
4. Submit
5. Verificar:
   - Cookie se actualiza (nuevo JWT con organizationId)
   - Redirección a /dashboard
```

### 3. Debugging con cURL

```bash
# Probar que nginx responde
curl -I http://tu-dominio.com

# Probar redirección HTTP → HTTPS (si está configurado)
curl -I http://tu-dominio.com

# Probar endpoint específico
curl http://tu-dominio.com/auth/login

# Ver headers completos
curl -v http://tu-dominio.com
```

### 4. Verificar Cookies

```bash
# Ver cookies en respuesta
curl -v http://tu-dominio.com/auth/login -c cookies.txt

# Ver contenido de cookies
cat cookies.txt

# Hacer request con cookies
curl http://tu-dominio.com/dashboard -b cookies.txt
```

---

## Troubleshooting

### Problema 1: Redirección no funciona después del fix

**Síntomas:**
- Página no redirige
- Se queda en la misma ruta
- No hay errores en console

**Diagnóstico:**

```javascript
// En DevTools Console, verificar:

// 1. ¿window.location está disponible?
console.log(window.location);

// 2. ¿Se está ejecutando el código de redirección?
// Agregar logs temporales:
console.log('Antes de redireccionar');
await new Promise((resolve) => setTimeout(resolve, 300));
console.log('Después del delay');
window.location.href = '/dashboard';
console.log('Después de asignar href'); // No debería verse
```

**Soluciones:**

```typescript
// Asegurarse de usar await con el delay
await new Promise((resolve) => setTimeout(resolve, 300));

// Verificar que no hay errores que bloqueen la ejecución
try {
  await someOperation();
  await new Promise((resolve) => setTimeout(resolve, 300));
  window.location.href = '/dashboard';
} catch (error) {
  console.error('Error:', error);
  // Redirigir de todas formas o mostrar error
}

// Verificar que no hay return antes de la redirección
if (result.status !== 200) {
  toast.error('Error');
  return; // ✅ OK - detener ejecución
}

// Continuar con redirección
await new Promise((resolve) => setTimeout(resolve, 300));
window.location.href = '/dashboard';
```

### Problema 2: Cookies no se establecen

**Síntomas:**
- Login exitoso pero sin cookie
- 401 inmediatamente después de login
- Cookie no aparece en DevTools

**Diagnóstico:**

```bash
# En el servidor, verificar logs
pm2 logs pos-system | grep "Cookie"

# Ver cookies en browser DevTools
# Application → Cookies → seleccionar dominio

# Verificar configuración de nginx
sudo nginx -t
sudo cat /etc/nginx/sites-enabled/pos-system | grep proxy_set_header
```

**Soluciones:**

1. **Verificar secure flag:**

```typescript
// Si NO tienes HTTPS:
cookieStore.set('auth-token', token, {
  httpOnly: true,
  secure: false, // ✅ Debe ser false sin HTTPS
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60,
  path: '/',
});
```

2. **Verificar headers de nginx:**

```nginx
# Asegurarse de tener estos headers
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

3. **Verificar dominio:**

```typescript
// Si estás usando IP en lugar de dominio, puede haber problemas
// Solución: usar dominio o ajustar sameSite
cookieStore.set('auth-token', token, {
  httpOnly: true,
  secure: false,
  sameSite: 'lax', // ✅ 'lax' es más permisivo que 'strict'
  maxAge: 30 * 24 * 60 * 60,
  path: '/',
});
```

### Problema 3: nginx not found o error 502

**Síntomas:**
- Error 502 Bad Gateway
- Error "Connection refused"
- nginx no responde

**Diagnóstico:**

```bash
# Verificar nginx
sudo systemctl status nginx

# Verificar aplicación Next.js
pm2 list
pm2 logs pos-system --lines 50

# Verificar puertos
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :80

# Ver logs de nginx
sudo tail -50 /var/log/nginx/pos-system-error.log
```

**Soluciones:**

```bash
# Reiniciar nginx
sudo systemctl restart nginx

# Reiniciar aplicación
pm2 restart pos-system

# Verificar configuración de nginx
sudo nginx -t

# Si hay error de sintaxis, corregir y recargar
sudo nano /etc/nginx/sites-available/pos-system
sudo nginx -t
sudo systemctl reload nginx

# Verificar que la app está escuchando en puerto correcto
# En .env debe tener PORT=3000
cat .env | grep PORT
```

### Problema 4: Middleware no se ejecuta correctamente

**Síntomas:**
- Usuario no autenticado puede acceder a rutas protegidas
- Redirecciones incorrectas
- Headers no se pasan correctamente

**Diagnóstico:**

```bash
# Ver logs del middleware (si tienes logs configurados)
pm2 logs pos-system | grep "middleware"

# Verificar que middleware.ts existe
ls -la src/middleware.ts
```

**Verificar configuración del middleware:**

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Rutas públicas
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rutas públicas
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Obtener token de cookie
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    // Sin token → redirigir a login
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  try {
    // Verificar token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    // Agregar headers con info del usuario
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId as string);
    requestHeaders.set('x-user-email', payload.email as string);
    requestHeaders.set('x-user-role', payload.role as string);

    if (payload.organizationId) {
      requestHeaders.set('x-organization-id', payload.organizationId as string);
    }

    // Lógica de redirección basada en organizationId
    if (pathname.startsWith('/onboarding') && payload.organizationId) {
      // Usuario con org intentando acceder a onboarding → dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (pathname.startsWith('/dashboard') && !payload.organizationId) {
      // Usuario sin org intentando acceder a dashboard → onboarding
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error('Middleware JWT verification error:', error);
    // Token inválido → redirigir a login
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
}

// Configurar qué rutas ejecutan el middleware
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### Problema 5: Delay de 300ms no es suficiente

**Síntomas:**
- A veces funciona, a veces no
- Inconsistente entre diferentes navegadores
- Problemas en conexiones lentas

**Solución:**

```typescript
// Aumentar el delay a 500ms o 1000ms
await new Promise((resolve) => setTimeout(resolve, 500));

// O implementar verificación de cookie antes de redireccionar
const waitForCookie = async (maxWait = 3000) => {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    // Verificar si la cookie existe
    const cookies = document.cookie.split(';');
    const hasAuthToken = cookies.some(c => c.trim().startsWith('auth-token='));

    if (hasAuthToken) {
      console.log('Cookie detectada, redirigiendo...');
      return true;
    }

    // Esperar 100ms antes de verificar de nuevo
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.warn('Cookie no detectada después de', maxWait, 'ms');
  return false;
};

// Usar en lugar del delay fijo
await waitForCookie();
window.location.href = '/dashboard';
```

### Problema 6: CORS errors después de la redirección

**Síntomas:**
- Errores de CORS en console
- "Access-Control-Allow-Origin" error

**Solución en nginx:**

```nginx
server {
    # ... configuración existente ...

    # Agregar headers CORS si es necesario
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Origin, X-Requested-With, Content-Type, Accept, Authorization' always;

    # Manejar preflight requests
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        add_header 'Content-Length' 0;
        return 204;
    }

    # ... resto de la configuración ...
}
```

---

## Mejores Prácticas

### 1. Seguridad de Cookies

```typescript
// ✅ PRODUCCIÓN con HTTPS
const cookieOptions = {
  httpOnly: true,      // No accesible desde JavaScript
  secure: true,        // Solo HTTPS
  sameSite: 'strict',  // Protección CSRF
  maxAge: 7 * 24 * 60 * 60, // 7 días
  path: '/',
};

// ⚠️ DESARROLLO o PRODUCCIÓN sin HTTPS (temporal)
const cookieOptions = {
  httpOnly: true,
  secure: false,       // ⚠️ Solo temporalmente
  sameSite: 'lax',    // Más permisivo
  maxAge: 7 * 24 * 60 * 60,
  path: '/',
};
```

### 2. Manejo de Errores

```typescript
const handleAuthAction = async () => {
  try {
    const result = await authAction();

    if (result.status === 200) {
      toast.success('Éxito');
      await new Promise((resolve) => setTimeout(resolve, 300));
      window.location.href = '/dashboard';
    } else {
      // Manejar errores específicos
      switch (result.status) {
        case 401:
          toast.error('Credenciales inválidas');
          break;
        case 403:
          toast.error('Cuenta desactivada');
          break;
        case 429:
          toast.error('Demasiados intentos. Intenta más tarde');
          break;
        default:
          toast.error(result.message || 'Error desconocido');
      }
    }
  } catch (error) {
    console.error('Error en auth action:', error);
    toast.error('Error inesperado. Por favor intenta nuevamente');
  }
};
```

### 3. Logging y Monitoreo

```typescript
// Server action
export async function loginUser(formData: FormData) {
  try {
    // ... lógica de login ...

    // Log exitoso (sin información sensible)
    console.log('[LOGIN] Usuario autenticado:', {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    return {
      status: 200,
      message: 'Login exitoso',
      data: { user, redirectTo },
    };
  } catch (error) {
    // Log de error con contexto
    console.error('[LOGIN] Error en autenticación:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return {
      status: 500,
      message: 'Error en el servidor',
      data: null,
    };
  }
}
```

### 4. Variables de Entorno

```env
# .env.example (versionar en git)
DATABASE_URL="postgresql://user:pass@host:5432/db"
JWT_SECRET="CHANGE_THIS_IN_PRODUCTION"
NODE_ENV="production"
HTTPS_ENABLED="false"
PORT="3000"

# .env (NO versionar - .gitignore)
DATABASE_URL="postgresql://postgres:real_password@localhost:5432/pos_system"
JWT_SECRET="super_secret_jwt_key_change_this_123!@#$%^&*()"
NODE_ENV="production"
HTTPS_ENABLED="true"
PORT="3000"
```

### 5. Testing Checklist

Antes de desplegar a producción:

- [ ] ✅ Todas las redirecciones de auth usan `window.location.href`
- [ ] ✅ Delay de 300ms (o más) antes de redireccionar
- [ ] ✅ Cookies configuradas correctamente (secure según HTTPS)
- [ ] ✅ nginx configurado y probado
- [ ] ✅ Firewall de OCI permite puertos necesarios
- [ ] ✅ Variables de entorno configuradas en servidor
- [ ] ✅ SSL/HTTPS configurado (recomendado)
- [ ] ✅ PM2 configurado y corriendo
- [ ] ✅ Logs accesibles y monitoreados
- [ ] ✅ Backup de base de datos configurado
- [ ] ✅ Probado en navegador real (no solo DevTools)
- [ ] ✅ Probado en diferentes navegadores
- [ ] ✅ Probado en móvil

### 6. Monitoreo Continuo

```bash
# Script de monitoreo (guardar como monitor.sh)
#!/bin/bash

echo "=== POS System Health Check ==="
echo ""

echo "1. Nginx Status:"
sudo systemctl status nginx --no-pager | grep "Active:"
echo ""

echo "2. Application Status (PM2):"
pm2 list | grep pos-system
echo ""

echo "3. Application Memory:"
pm2 show pos-system | grep "memory"
echo ""

echo "4. Últimos errores de nginx:"
sudo tail -5 /var/log/nginx/pos-system-error.log
echo ""

echo "5. Últimos errores de aplicación:"
pm2 logs pos-system --err --lines 5 --nostream
echo ""

echo "6. Uso de disco:"
df -h | grep -E "Filesystem|/$"
echo ""

echo "7. PostgreSQL status:"
sudo systemctl status postgresql --no-pager | grep "Active:"
echo ""

# Agregar a crontab para ejecutar cada hora
# crontab -e
# 0 * * * * /ruta/a/monitor.sh >> /var/log/pos-system-health.log 2>&1
```

---

## Resumen de Cambios

### Archivos de Código

| Archivo | Cambio | Razón |
|---------|--------|-------|
| `register-form.tsx` | `router.push()` → `window.location.href` | Registro → Onboarding |
| `login-form.tsx` | Ya corregido previamente | Login → Dashboard/Onboarding |
| `create-organization.tsx` | Ya corregido previamente | Onboarding → Dashboard |
| `site-header.tsx` | `router.push()` → `window.location.href` | Logout → Login |
| `nav-user.tsx` | `router.push()` → `window.location.href` | Logout → Login |
| `dashboard/layout.tsx` | `router.push()` → `window.location.href` | Error auth → Login |
| `actions/auth/login.ts` | `secure: false` (temporal) | Cookies sin HTTPS |

### Configuración de Infraestructura

| Componente | Configuración | Estado |
|------------|---------------|--------|
| **OCI Security Lists** | Puertos 22, 80, 443 abiertos | ✅ Requerido |
| **OCI Firewall (ufw)** | Permitir 22, 80, 443 | ✅ Requerido |
| **nginx** | Proxy reverso a Next.js (puerto 3000) | ✅ Requerido |
| **SSL/HTTPS** | Certbot + Let's Encrypt | ⚠️ Recomendado |
| **Variables de entorno** | `.env` con configuración de producción | ✅ Requerido |
| **PM2** | Aplicación corriendo con auto-restart | ✅ Requerido |

### Próximos Pasos Recomendados

1. ✅ **Implementar SSL/HTTPS** con Let's Encrypt
2. ✅ **Cambiar `secure: true`** en cookies una vez tengas HTTPS
3. ✅ **Configurar monitoreo** con logs y alertas
4. ✅ **Configurar backups** automáticos de base de datos
5. ✅ **Implementar rate limiting** en nginx
6. ✅ **Configurar renovación automática** de certificados SSL

---

**Última actualización:** 2025-01-31

**Versión:** 1.0.0

**Autores:** POS System Development Team

**Licencia:** Uso interno del proyecto POS System
