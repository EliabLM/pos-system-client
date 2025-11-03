# Fix: Error al crear sesión - PostgreSQL SSL en Producción

## Problema

Después del cambio de HTTP a HTTPS, aparece el error:
```
Login error: Error [AuthError]: Error al crear sesión
code: 'INTERNAL_ERROR'
```

## Causa

El `DATABASE_URL` está configurado sin parámetros SSL, lo que causa problemas de conexión a PostgreSQL local cuando la aplicación se ejecuta con HTTPS.

## Solución

### 1. Verificar DATABASE_URL actual

En el servidor de producción, verifica la configuración actual:

```bash
# SSH al servidor
ssh usuario@tu-servidor

# Ver variables de entorno de PM2
pm2 env 0 | grep DATABASE_URL
```

### 2. Configurar DATABASE_URL correctamente

**Para PostgreSQL local SIN SSL** (caso más común):

```bash
# Formato correcto con sslmode=disable
DATABASE_URL="postgresql://usuario:password@localhost:5432/nombre_db?sslmode=disable"

# O con sslmode=prefer (intenta SSL pero no falla si no está disponible)
DATABASE_URL="postgresql://usuario:password@localhost:5432/nombre_db?sslmode=prefer"

# DIRECT_URL es igual al DATABASE_URL para PostgreSQL local
DIRECT_URL="postgresql://usuario:password@localhost:5432/nombre_db?sslmode=disable"
```

**Para PostgreSQL con SSL habilitado**:

```bash
DATABASE_URL="postgresql://usuario:password@localhost:5432/nombre_db?sslmode=require"
DIRECT_URL="postgresql://usuario:password@localhost:5432/nombre_db?sslmode=require"
```

### 3. Actualizar variables de entorno en el servidor

Hay dos opciones:

#### Opción A: Usar archivo .env en el servidor

```bash
# SSH al servidor
cd /ruta/a/tu/aplicacion

# Editar el archivo .env
nano .env

# Agregar o modificar:
DATABASE_URL="postgresql://usuario:password@localhost:5432/nombre_db?sslmode=disable"
DIRECT_URL="postgresql://usuario:password@localhost:5432/nombre_db?sslmode=disable"
JWT_SECRET="tu_jwt_secret"
HTTPS_ENABLED="true"

# Guardar y salir (Ctrl+O, Enter, Ctrl+X)
```

#### Opción B: Configurar en PM2 ecosystem

```bash
# Editar el archivo ecosystem.config.js
nano ecosystem.config.js

# Agregar env en la configuración:
module.exports = {
  apps: [{
    name: 'pos-system-client',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://usuario:password@localhost:5432/nombre_db?sslmode=disable',
      DIRECT_URL: 'postgresql://usuario:password@localhost:5432/nombre_db?sslmode=disable',
      JWT_SECRET: 'tu_jwt_secret',
      HTTPS_ENABLED: 'true'
    }
  }]
}
```

### 4. Reiniciar la aplicación

```bash
# Opción 1: Reinicio normal
pm2 restart all

# Opción 2: Reinicio con actualización de variables de entorno
pm2 restart all --update-env

# Opción 3: Si usas ecosystem.config.js
pm2 delete all
pm2 start ecosystem.config.js
```

### 5. Verificar que funcione

```bash
# Ver logs en tiempo real
pm2 logs

# Probar login desde el navegador
# Si el error persiste, los logs mostrarán el error original completo
```

## Parámetros SSL de PostgreSQL

- `sslmode=disable` - No usa SSL (recomendado para PostgreSQL local)
- `sslmode=prefer` - Intenta SSL, si falla usa conexión sin SSL
- `sslmode=require` - Requiere SSL, falla si no está disponible
- `sslmode=verify-ca` - Requiere SSL y verifica el certificado CA
- `sslmode=verify-full` - Requiere SSL, verifica CA y hostname

## Comandos de Diagnóstico

```bash
# Verificar conexión a PostgreSQL
psql -U usuario -d nombre_db -h localhost

# Ver estado de PM2
pm2 status

# Ver logs de error
pm2 logs --err --lines 50

# Verificar variables de entorno
pm2 env 0

# Probar conexión con Prisma
cd /ruta/a/tu/aplicacion
npx prisma db pull
```

## Checklist de Verificación

- [ ] DATABASE_URL tiene `?sslmode=disable` o `?sslmode=prefer`
- [ ] DIRECT_URL tiene el mismo `sslmode`
- [ ] JWT_SECRET está configurado
- [ ] HTTPS_ENABLED está en "true"
- [ ] PM2 restarted con `--update-env`
- [ ] Logs muestran el error original completo (si persiste)
- [ ] Login funciona correctamente desde el navegador

## Si el problema persiste

1. Los logs mejorados ahora mostrarán el error original completo
2. Busca en los logs: `Original error:` para ver el error real de Prisma/PostgreSQL
3. Comparte ese error para diagnóstico adicional

---

**Nota**: Este fix es específico para PostgreSQL local. Si usas PostgreSQL en otro servidor o servicio cloud, ajusta el host y puerto según corresponda.
