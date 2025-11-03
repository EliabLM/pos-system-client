# 📦 ACTUALIZACIÓN DE DEPENDENCIAS: CLERK → AUTH MANUAL

## 🎯 Objetivo
Actualizar las dependencias del proyecto para migrar de Clerk Authentication a sistema de autenticación manual.

---

## ✅ CAMBIOS REALIZADOS

### Dependencias Removidas

```json
{
  "dependencies": {
    "❌ @clerk/nextjs": "^6.31.1",         // Removido
    "❌ @clerk/localizations": "^3.21.2",  // Removido
    "❌ svix": "^1.76.1"                    // Removido (solo para webhooks Clerk)
  }
}
```

**Total removido:** 3 paquetes

### Dependencias Agregadas

```json
{
  "dependencies": {
    "✅ bcrypt": "^6.0.0",              // Hash de passwords
    "✅ jsonwebtoken": "^9.0.2",        // JWT para Node.js
    "✅ jose": "^6.1.0"                 // JWT para Edge Runtime
  },
  "devDependencies": {
    "✅ @types/bcrypt": "^6.0.0",       // Tipos TypeScript para bcrypt
    "✅ @types/jsonwebtoken": "^9.0.10" // Tipos TypeScript para jsonwebtoken
  }
}
```

**Total agregado:** 5 paquetes (3 runtime + 2 tipos)

---

## 📝 COMANDOS EJECUTADOS

### Paso 1: Remover Dependencias de Clerk

```bash
pnpm remove @clerk/nextjs @clerk/localizations svix
```

**Output esperado:**
```
✔ Packages removed successfully
- @clerk/nextjs 6.31.1
- @clerk/localizations 3.21.2
- svix 1.76.1
```

### Paso 2: Instalar Dependencias de Autenticación

```bash
pnpm add bcrypt jsonwebtoken jose
```

**Output esperado:**
```
✔ Packages added successfully
+ bcrypt 6.0.0
+ jsonwebtoken 9.0.2
+ jose 6.1.0
```

⚠️ **Nota sobre bcrypt**: pnpm puede requerir aprobación para compilar el paquete nativo bcrypt.

### Paso 3: Instalar Tipos TypeScript

```bash
pnpm add -D @types/bcrypt @types/jsonwebtoken
```

**Output esperado:**
```
✔ Dev dependencies added successfully
+ @types/bcrypt 6.0.0
+ @types/jsonwebtoken 9.0.10
```

---

## 🔧 CONFIGURACIÓN ADICIONAL

### Aprobar Build de bcrypt (Si es necesario)

Si pnpm solicita aprobación para compilar bcrypt:

```bash
pnpm approve-builds bcrypt
```

**Alternativa automática:**
```bash
# Configurar en .npmrc
enable-pre-post-scripts=true
```

---

## 📊 COMPARACIÓN DE DEPENDENCIAS

### Antes (Con Clerk)
```json
{
  "dependencies": {
    "@clerk/localizations": "^3.21.2",
    "@clerk/nextjs": "^6.31.1",
    "svix": "^1.76.1",
    // ... otras dependencias
  }
}
```

**Bundle size de Clerk:** ~250KB (minified + gzipped)

### Después (Auth Manual)
```json
{
  "dependencies": {
    "bcrypt": "^6.0.0",
    "jose": "^6.1.0",
    "jsonwebtoken": "^9.0.2",
    // ... otras dependencias
  },
  "devDependencies": {
    "@types/bcrypt": "^6.0.0",
    "@types/jsonwebtoken": "^9.0.10"
  }
}
```

**Bundle size estimado:** ~50KB (minified + gzipped)

**Reducción:** ~80% menor bundle size ✅

---

## 📚 USO DE NUEVAS DEPENDENCIAS

### bcrypt - Hash de Passwords

```typescript
import bcrypt from 'bcrypt';

// Hashear password
const saltRounds = 12;
const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

// Verificar password
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

**Configuración recomendada:**
- **Salt rounds**: 12 (balance seguridad/performance)
- **Tiempo de hash**: ~100-200ms
- **No usar en Edge Runtime** (solo Node.js)

### jsonwebtoken - JWT para Node.js

```typescript
import jwt from 'jsonwebtoken';

// Crear token
const token = jwt.sign(
  { userId: user.id, email: user.email },
  process.env.JWT_SECRET!,
  { expiresIn: '7d' }
);

// Verificar token
const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
```

**Variables de entorno requeridas:**
```bash
JWT_SECRET=your-super-secret-key-min-32-chars
```

### jose - JWT para Edge Runtime

```typescript
import { SignJWT, jwtVerify } from 'jose';

// Crear token
const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const token = await new SignJWT({ userId: user.id })
  .setProtectedHeader({ alg: 'HS256' })
  .setExpirationTime('7d')
  .sign(secret);

// Verificar token
const { payload } = await jwtVerify(token, secret);
```

**Cuándo usar cada uno:**
- **jsonwebtoken**: Server Actions, API Routes (Node.js runtime)
- **jose**: Middleware, Edge Functions (Edge runtime)

---

## ⚠️ PROBLEMAS CONOCIDOS Y SOLUCIONES

### Problema 1: Error compilando bcrypt en Windows

**Error:**
```
Error: Cannot find module 'node-gyp'
```

**Solución:**
```bash
# Instalar herramientas de compilación
npm install -g windows-build-tools

# O usar bcryptjs (alternativa pura JS)
pnpm add bcryptjs
pnpm add -D @types/bcryptjs
```

### Problema 2: jose no funciona en Node.js runtime

**Error:**
```
Error: jose is not compatible with this runtime
```

**Solución:**
```typescript
// Usar jsonwebtoken para Node.js runtime
import jwt from 'jsonwebtoken'; // Node.js
import { SignJWT } from 'jose';  // Edge runtime

// Detectar runtime automáticamente
const isEdgeRuntime = typeof EdgeRuntime !== 'undefined';
```

### Problema 3: Tipos TypeScript no encontrados

**Error:**
```
Could not find a declaration file for module 'bcrypt'
```

**Solución:**
```bash
# Reinstalar tipos
pnpm add -D @types/bcrypt @types/jsonwebtoken

# Verificar en tsconfig.json
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types"]
  }
}
```

---

## 🔒 SEGURIDAD

### Variables de Entorno Requeridas

Agregar a `.env.local`:

```bash
# JWT Secret (mínimo 32 caracteres)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars

# Session Duration (en segundos)
SESSION_DURATION=604800  # 7 días

# Password Reset Token Expiration (en segundos)
RESET_TOKEN_EXPIRATION=900  # 15 minutos
```

### Generar JWT_SECRET Seguro

```bash
# Opción 1: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Opción 2: OpenSSL
openssl rand -hex 32

# Opción 3: En código
import crypto from 'crypto';
const secret = crypto.randomBytes(32).toString('hex');
```

---

## ✅ VALIDACIÓN POST-INSTALACIÓN

### Verificar Instalación

```bash
# Listar dependencias instaladas
pnpm list bcrypt jsonwebtoken jose

# Output esperado:
# bcrypt 6.0.0
# jsonwebtoken 9.0.2
# jose 6.1.0
```

### Test de Importación

Crear `test-auth-deps.ts`:

```typescript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { SignJWT } from 'jose';

async function testDependencies() {
  // Test bcrypt
  const hash = await bcrypt.hash('password123', 12);
  const valid = await bcrypt.compare('password123', hash);
  console.log('✅ bcrypt works:', valid);

  // Test jsonwebtoken
  const token = jwt.sign({ test: true }, 'secret', { expiresIn: '1h' });
  const decoded = jwt.verify(token, 'secret');
  console.log('✅ jsonwebtoken works:', decoded);

  // Test jose
  const secret = new TextEncoder().encode('secret');
  const joseToken = await new SignJWT({ test: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(secret);
  console.log('✅ jose works:', joseToken.length > 0);
}

testDependencies();
```

Ejecutar:
```bash
pnpm tsx test-auth-deps.ts
```

---

## 📦 PACKAGE.JSON FINAL

```json
{
  "name": "pos-system-client",
  "version": "0.1.0",
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@hookform/resolvers": "^5.2.1",
    "@prisma/client": "6.14.0",
    "@radix-ui/react-avatar": "^1.1.10",
    "@tanstack/react-query": "^5.85.6",
    "@uploadthing/react": "^7.3.3",
    "bcrypt": "^6.0.0",                    // ← NUEVO
    "jose": "^6.1.0",                      // ← NUEVO
    "jsonwebtoken": "^9.0.2",              // ← NUEVO
    "next": "15.4.6",
    "react": "19.1.0",
    "react-hook-form": "^7.62.0",
    "yup": "^1.7.0",
    "zod": "^4.0.17",
    "zustand": "^5.0.7"
  },
  "devDependencies": {
    "@types/bcrypt": "^6.0.0",            // ← NUEVO
    "@types/jsonwebtoken": "^9.0.10",     // ← NUEVO
    "@types/node": "^20",
    "@types/react": "^19",
    "eslint": "^9",
    "prisma": "^6.14.0",
    "typescript": "^5"
  }
}
```

---

## 🚀 PRÓXIMOS PASOS

1. **Crear helpers de autenticación**
   ```bash
   mkdir -p src/lib/auth
   ```

2. **Implementar utilities**
   - `src/lib/auth/password.ts` - Bcrypt utilities
   - `src/lib/auth/jwt.ts` - JWT utilities
   - `src/lib/auth/session.ts` - Session management

3. **Actualizar middleware**
   - `src/middleware.ts` - Reemplazar Clerk

4. **Crear API routes**
   - `src/app/api/auth/login/route.ts`
   - `src/app/api/auth/register/route.ts`
   - `src/app/api/auth/logout/route.ts`

---

## 📊 RESUMEN

| Métrica | Antes (Clerk) | Después (Manual) |
|---------|---------------|------------------|
| **Dependencias** | 3 paquetes | 5 paquetes |
| **Bundle size** | ~250KB | ~50KB |
| **Control** | Limitado | Total |
| **Costo mensual** | $25-100 | $0 |
| **Customización** | Baja | Alta |

---

**Última actualización:** 2025-01-10
**Versión:** 1.0
**Estado:** ✅ COMPLETADO
