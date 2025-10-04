# 🔧 Scripts de Migración de Autenticación

Este directorio contiene todos los scripts necesarios para migrar de Clerk a autenticación manual.

## 📁 Archivos Disponibles

### Scripts TypeScript (Ejecutables)

1. **`backup-database.ts`** - Backup de base de datos
2. **`migrate-users.ts`** - Migración de usuarios y generación de tokens
3. **`validate-migration.ts`** - Validación post-migración
4. **`rollback-migration.ts`** - Rollback de migración (próximamente)

### Scripts SQL (Manuales)

1. **`../prisma/migrations/manual/migrate_to_manual_auth.sql`** - Migración de schema
2. **`../prisma/migrations/manual/rollback_manual_auth.sql`** - Rollback de schema

---

## 🚀 Guía de Uso Rápido

### 1. Backup de Base de Datos

```bash
# Backup simple
pnpm tsx scripts/backup-database.ts

# Backup con nombre personalizado
pnpm tsx scripts/backup-database.ts --suffix=pre-migration

# Backup comprimido
pnpm tsx scripts/backup-database.ts --compress

# Solo schema (sin datos)
pnpm tsx scripts/backup-database.ts --schema-only

# Backup + limpieza de antiguos
pnpm tsx scripts/backup-database.ts --cleanup
```

**Output:**
- `backups/pos-system-backup-[timestamp].sql` - Archivo de backup
- `backups/pos-system-backup-[timestamp].json` - Metadatos del backup

---

### 2. Migración de Schema (SQL)

```bash
# Conectar a base de datos y ejecutar migración
psql $DATABASE_URL < prisma/migrations/manual/migrate_to_manual_auth.sql
```

**Este script:**
- ✅ Crea tablas: `sessions`, `password_resets`, `email_verifications`, `audit_logs`
- ✅ Agrega campos a `users`: `password`, `lastLoginAt`, etc.
- ✅ Elimina campo `clerkId`
- ✅ Crea índices de performance
- ✅ Valida migración automáticamente

---

### 3. Migración de Usuarios

```bash
# Ejecutar migración de usuarios
pnpm tsx scripts/migrate-users.ts

# Dry-run (solo simula, no hace cambios)
pnpm tsx scripts/migrate-users.ts --dry-run

# Migración sin enviar emails
pnpm tsx scripts/migrate-users.ts --skip-emails

# Migración de una organización específica
pnpm tsx scripts/migrate-users.ts --org-id=org_123456

# Lotes más pequeños (default: 50)
pnpm tsx scripts/migrate-users.ts --batch-size=25
```

**Este script:**
- ✅ Genera tokens de password reset para todos los usuarios
- ✅ Envía emails con links de establecer contraseña
- ✅ Procesa en lotes para evitar sobrecarga
- ✅ Crea logs de auditoría

---

### 4. Validación de Migración

```bash
# Validar que la migración fue exitosa
pnpm tsx scripts/validate-migration.ts
```

**Valida:**
- ✅ Todas las tablas nuevas existen
- ✅ Campos de User correctos
- ✅ Índices creados
- ✅ Relaciones (foreign keys) correctas
- ✅ Datos consistentes
- ✅ Enums definidos

---

### 5. Rollback (Si es necesario)

```bash
# Rollback de schema
psql $DATABASE_URL < prisma/migrations/manual/rollback_manual_auth.sql

# Restaurar código anterior
git revert [commit-hash]
npx prisma generate
pnpm build
```

---

## 📋 Proceso Completo de Migración

### Pre-Migración

```bash
# 1. Backup completo
pnpm tsx scripts/backup-database.ts --suffix=pre-migration --compress

# 2. Verificar backup
ls -lh backups/

# 3. Modo mantenimiento (opcional)
echo "MAINTENANCE_MODE=true" >> .env.local
```

### Migración

```bash
# 4. Migrar schema
psql $DATABASE_URL < prisma/migrations/manual/migrate_to_manual_auth.sql

# 5. Regenerar Prisma client
npx prisma generate

# 6. Migrar usuarios (dry-run primero)
pnpm tsx scripts/migrate-users.ts --dry-run

# 7. Migrar usuarios (real)
pnpm tsx scripts/migrate-users.ts

# 8. Validar migración
pnpm tsx scripts/validate-migration.ts
```

### Post-Migración

```bash
# 9. Deploy código actualizado
pnpm build
pm2 restart pos-system

# 10. Quitar modo mantenimiento
sed -i '/MAINTENANCE_MODE/d' .env.local

# 11. Monitorear logs
pm2 logs pos-system --lines 100
```

---

## ⚠️ Solución de Problemas

### Error: "pg_dump: command not found"

**Solución:**
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# macOS
brew install postgresql

# Windows
# Descargar desde postgresql.org
```

### Error: "Prisma Client no generado"

**Solución:**
```bash
npx prisma generate
```

### Error: "No se pueden enviar emails"

**Solución:**
```bash
# Migrar sin enviar emails y enviarlos después manualmente
pnpm tsx scripts/migrate-users.ts --skip-emails

# Configurar servicio de email en .env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your_key
```

### Error: "Usuarios sin password"

**Solución:**
```bash
# Re-ejecutar migración de usuarios
pnpm tsx scripts/migrate-users.ts

# O establecer passwords manualmente en SQL
UPDATE users SET password = 'PENDING_RESET' WHERE password IS NULL;
```

---

## 📊 Comandos de Diagnóstico

```bash
# Ver usuarios sin password reset token
pnpm tsx -e "
import { PrismaClient } from '@/generated/prisma';
const prisma = new PrismaClient();
const users = await prisma.user.findMany({
  where: {
    isDeleted: false,
    passwordResets: { none: { used: false } }
  }
});
console.log(\`\${users.length} usuarios sin token\`);
"

# Ver estadísticas de migración
pnpm tsx -e "
import { PrismaClient } from '@/generated/prisma';
const prisma = new PrismaClient();
const stats = {
  users: await prisma.user.count(),
  sessions: await prisma.session.count(),
  resets: await prisma.passwordReset.count({ where: { used: false } }),
};
console.log(JSON.stringify(stats, null, 2));
"

# Ver audit logs de migración
pnpm tsx -e "
import { PrismaClient } from '@/generated/prisma';
const prisma = new PrismaClient();
const logs = await prisma.auditLog.findMany({
  where: { entity: 'Migration' },
  orderBy: { createdAt: 'desc' },
  take: 10
});
console.log(JSON.stringify(logs, null, 2));
"
```

---

## 🔐 Seguridad

### Permisos de Archivos

```bash
# Proteger backups
chmod 600 backups/*.sql
chmod 600 backups/*.json

# Solo owner puede leer/escribir
ls -la backups/
```

### Variables de Entorno Sensibles

```bash
# Nunca commitear:
- DATABASE_URL
- DIRECT_URL
- EMAIL_API_KEYS
- JWT_SECRET (cuando se implemente)
```

---

## 📚 Documentación Adicional

- **Estrategia completa**: [`docs/AUTH_MIGRATION.md`](../docs/AUTH_MIGRATION.md)
- **Schema de autenticación**: [`prisma/schema.prisma`](../prisma/schema.prisma)
- **Análisis de Clerk**: (reporte generado anteriormente)

---

## 🆘 Soporte

Si encuentras problemas durante la migración:

1. **Revisar logs de validación**: `pnpm tsx scripts/validate-migration.ts`
2. **Verificar backups**: `ls -lh backups/`
3. **Restaurar si es necesario**: `psql $DATABASE_URL < backups/[archivo].sql`
4. **Contactar equipo**: Slack #pos-system-dev

---

## ✅ Checklist de Migración

### Pre-Migración
- [ ] Backup ejecutado y verificado
- [ ] Equipo notificado
- [ ] Usuarios informados
- [ ] Modo mantenimiento activado (si aplica)

### Migración
- [ ] Schema migrado (`migrate_to_manual_auth.sql`)
- [ ] Prisma client regenerado
- [ ] Usuarios migrados (`migrate-users.ts`)
- [ ] Validación exitosa (`validate-migration.ts`)

### Post-Migración
- [ ] Código desplegado
- [ ] Modo mantenimiento desactivado
- [ ] Usuarios recibiendo emails
- [ ] Primeros logins exitosos
- [ ] Monitoreo activo

### Seguimiento
- [ ] >95% usuarios con password establecida (7 días)
- [ ] No hay errores críticos
- [ ] Performance normal
- [ ] Documentación actualizada

---

**Última actualización:** 2025-01-10
**Versión:** 1.0
