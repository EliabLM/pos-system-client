# PM2 Deployment Guide

Guía completa de comandos y mejores prácticas para gestionar la aplicación Next.js POS System con PM2 en el servidor OCI.

## Tabla de Contenidos

- [Comandos Básicos de Gestión](#comandos-básicos-de-gestión)
- [Logs y Debugging](#logs-y-debugging)
- [Reinicio y Actualización de Código](#reinicio-y-actualización-de-código)
- [Persistencia y Auto-inicio](#persistencia-y-auto-inicio)
- [Gestión de Recursos](#gestión-de-recursos)
- [Comandos de Mantenimiento](#comandos-de-mantenimiento)
- [Ecosystem File (Recomendado)](#ecosystem-file-recomendado)
- [Comandos Útiles para Debugging](#comandos-útiles-para-debugging)
- [Workflow Típico de Despliegue](#workflow-típico-de-despliegue)
- [Troubleshooting Común](#troubleshooting-común)

---

## Comandos Básicos de Gestión

### Iniciar la aplicación

```bash
# Iniciar aplicación Next.js
pm2 start npm --name "pos-system" -- start

# O con ecosystem file (recomendado)
pm2 start ecosystem.config.js

# Iniciar en modo cluster (múltiples instancias)
pm2 start npm --name "pos-system" -i max -- start
```

### Ver estado de aplicaciones

```bash
# Listar todas las aplicaciones
pm2 list
pm2 ls

# Ver información detallada de una app
pm2 show pos-system
pm2 info pos-system

# Monitoreo en tiempo real
pm2 monit
```

### Detener/Reiniciar aplicaciones

```bash
# Reiniciar aplicación
pm2 restart pos-system
pm2 restart all

# Recargar (zero-downtime restart)
pm2 reload pos-system

# Detener aplicación
pm2 stop pos-system
pm2 stop all

# Eliminar del listado de PM2
pm2 delete pos-system
pm2 delete all
```

---

## Logs y Debugging

```bash
# Ver logs en tiempo real
pm2 logs
pm2 logs pos-system

# Ver solo errores
pm2 logs --err

# Ver últimas 200 líneas
pm2 logs --lines 200

# Limpiar logs
pm2 flush

# Ver logs guardados
pm2 logs --json
```

---

## Reinicio y Actualización de Código

```bash
# Después de hacer cambios en el código
git pull origin main
pnpm install
pnpm build
pm2 restart pos-system

# O todo en uno
git pull && pnpm install && pnpm build && pm2 restart pos-system
```

---

## Persistencia y Auto-inicio

```bash
# Guardar lista actual de procesos
pm2 save

# Configurar PM2 para iniciar al arrancar el servidor
pm2 startup

# Eliminar auto-inicio
pm2 unstartup
```

**Nota importante:** Después de ejecutar `pm2 startup`, PM2 te dará un comando específico para tu sistema. Debes copiarlo y ejecutarlo con privilegios de superusuario.

---

## Gestión de Recursos

```bash
# Establecer límites de memoria (reinicia si excede)
pm2 start npm --name "pos-system" --max-memory-restart 500M -- start

# Establecer variables de entorno
pm2 start npm --name "pos-system" --env production -- start

# Ver uso de recursos
pm2 monit
```

---

## Comandos de Mantenimiento

```bash
# Actualizar PM2
npm install -g pm2@latest
pm2 update

# Resetear contadores de reinicio
pm2 reset pos-system

# Ver versión de PM2
pm2 --version
```

---

## Ecosystem File (Recomendado)

El uso de un archivo `ecosystem.config.js` es la forma recomendada de gestionar aplicaciones con PM2.

### Crear archivo `ecosystem.config.js`

Crea este archivo en la raíz de tu proyecto:

```javascript
module.exports = {
  apps: [{
    name: 'pos-system',
    script: 'npm',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  }]
};
```

### Configuración Avanzada

```javascript
module.exports = {
  apps: [{
    name: 'pos-system',
    script: 'npm',
    args: 'start',

    // Número de instancias
    instances: 'max', // o un número específico
    exec_mode: 'cluster', // 'fork' o 'cluster'

    // Reinicio automático
    autorestart: true,
    watch: false, // No recomendado en producción
    max_memory_restart: '500M',

    // Variables de entorno
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },

    // Logs
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,

    // Tiempo de inicio
    listen_timeout: 10000,
    kill_timeout: 5000,
  }]
};
```

### Comandos con Ecosystem

```bash
# Iniciar con ecosystem
pm2 start ecosystem.config.js

# Reiniciar con ecosystem
pm2 reload ecosystem.config.js

# Detener
pm2 stop ecosystem.config.js

# Eliminar
pm2 delete ecosystem.config.js
```

---

## Comandos Útiles para Debugging

```bash
# Ver variables de entorno de la app
pm2 env 0  # (donde 0 es el ID de la app)

# Verificar si hay leaks de memoria
pm2 monit

# Ver procesos en ejecución
pm2 ps

# Descripción completa con rutas y PID
pm2 describe pos-system

# Ver información del sistema
pm2 sysmonit
```

---

## Workflow Típico de Despliegue

Este es el flujo recomendado para desplegar actualizaciones en producción:

```bash
# 1. Conectar al servidor
ssh usuario@tu-servidor-oci

# 2. Navegar al proyecto
cd /ruta/a/pos-system-client

# 3. Actualizar código
git pull origin main

# 4. Instalar dependencias (si hay cambios en package.json)
pnpm install

# 5. Generar Prisma client
npx prisma generate

# 6. Ejecutar migraciones (si las hay)
npx prisma migrate deploy

# 7. Compilar aplicación
pnpm build

# 8. Reiniciar con PM2 (zero downtime)
pm2 reload pos-system

# 9. Verificar logs
pm2 logs pos-system --lines 50

# 10. Guardar configuración
pm2 save
```

### Script de Despliegue Automatizado

Puedes crear un script `deploy.sh` para automatizar este proceso:

```bash
#!/bin/bash

echo "🚀 Iniciando despliegue..."

# Actualizar código
echo "📥 Descargando cambios..."
git pull origin main

# Instalar dependencias
echo "📦 Instalando dependencias..."
pnpm install

# Generar Prisma client
echo "🔧 Generando Prisma client..."
npx prisma generate

# Ejecutar migraciones
echo "💾 Ejecutando migraciones..."
npx prisma migrate deploy

# Compilar aplicación
echo "🏗️  Compilando aplicación..."
pnpm build

# Reiniciar PM2
echo "🔄 Reiniciando aplicación..."
pm2 reload pos-system

# Verificar estado
echo "✅ Verificando estado..."
pm2 list

# Mostrar logs
echo "📋 Últimos logs:"
pm2 logs pos-system --lines 20 --nostream

echo "✨ Despliegue completado!"
```

Hacer el script ejecutable:

```bash
chmod +x deploy.sh
```

Ejecutar:

```bash
./deploy.sh
```

---

## Troubleshooting Común

### La aplicación no inicia

```bash
# Ver errores detallados
pm2 logs pos-system --err --lines 100

# Verificar configuración
pm2 describe pos-system

# Revisar si el puerto está en uso
netstat -tlnp | grep :3000
```

### Problemas de memoria

```bash
# Reiniciar con límite de memoria
pm2 restart pos-system --max-memory-restart 500M

# Monitorear uso de memoria
pm2 monit

# Ver estadísticas
pm2 show pos-system
```

### La aplicación se reinicia constantemente

```bash
# Ver logs de error
pm2 logs pos-system --err

# Verificar si hay errores en el código
npm run build

# Comprobar variables de entorno
pm2 env 0
```

### Limpiar y empezar desde cero

```bash
# Detener y eliminar proceso
pm2 delete pos-system

# Limpiar logs
pm2 flush

# Iniciar de nuevo
pm2 start npm --name "pos-system" -- start

# Guardar configuración
pm2 save
```

### Ver qué puerto está usando

```bash
pm2 show pos-system | grep PORT

# O verificar el proceso
netstat -tlnp | grep node
```

### Problemas con cookies/autenticación después de desplegar

```bash
# Asegurarse de que las variables de entorno están correctas
pm2 env 0

# Verificar que JWT_SECRET no ha cambiado
cat .env | grep JWT_SECRET

# Reiniciar completamente (no reload)
pm2 restart pos-system

# Ver logs de autenticación
pm2 logs pos-system | grep "auth"
```

### Build falla por falta de memoria

```bash
# Compilar con más memoria asignada a Node.js
NODE_OPTIONS="--max_old_space_size=4096" pnpm build

# O agregar al ecosystem.config.js
node_args: "--max_old_space_size=4096"
```

---

## Mejores Prácticas

### 1. Siempre usar `pm2 reload` en producción

`reload` hace un reinicio sin downtime, a diferencia de `restart`.

```bash
pm2 reload pos-system  # ✅ Zero downtime
pm2 restart pos-system # ❌ Causa downtime breve
```

### 2. Guardar la configuración después de cambios

```bash
pm2 save
```

### 3. Configurar logs rotativos

Crea un archivo `pm2-logrotate.json`:

```json
{
  "max_size": "10M",
  "retain": 10,
  "compress": true,
  "dateFormat": "YYYY-MM-DD_HH-mm-ss",
  "workerInterval": 30,
  "rotateInterval": "0 0 * * *",
  "rotateModule": true
}
```

Instalar módulo de rotación:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 10
```

### 4. Usar ecosystem file para configuración consistente

Mantén toda tu configuración en `ecosystem.config.js` y versiona este archivo en Git.

### 5. Monitorear regularmente

```bash
# Agregar a crontab para monitoreo diario
0 9 * * * pm2 list && pm2 logs pos-system --lines 50 --nostream
```

---

## Comandos de Emergencia

### Servidor no responde

```bash
# Ver procesos
pm2 ps

# Forzar reinicio
pm2 kill
pm2 resurrect

# O iniciar de nuevo
pm2 start ecosystem.config.js
```

### Base de datos desincronizada

```bash
# Resetear migraciones (¡CUIDADO en producción!)
npx prisma migrate reset

# O aplicar migraciones pendientes
npx prisma migrate deploy
```

### Rollback rápido

```bash
# Volver al commit anterior
git reset --hard HEAD~1
pnpm install
pnpm build
pm2 reload pos-system
```

---

## Recursos Adicionales

- [Documentación oficial de PM2](https://pm2.keymetrics.io/)
- [PM2 Quick Start](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [PM2 Process Management](https://pm2.keymetrics.io/docs/usage/process-management/)
- [PM2 Cluster Mode](https://pm2.keymetrics.io/docs/usage/cluster-mode/)

---

## Notas Específicas para OCI

### Configurar HTTPS con Let's Encrypt

Una vez que configures HTTPS, actualiza la configuración de cookies:

```typescript
// src/actions/auth/login.ts
cookieStore.set(COOKIE_NAME, session.token, {
  httpOnly: true,
  secure: true, // ✅ Cambiar a true cuando tengas HTTPS
  sameSite: 'lax',
  maxAge: data.rememberMe ? 30 * 24 * 60 * 60 : COOKIE_MAX_AGE,
  path: '/',
});
```

### Configuración recomendada de nginx

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;

    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

---

**Última actualización:** 2025-01-31
