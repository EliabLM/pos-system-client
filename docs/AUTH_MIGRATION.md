# 🔐 ESTRATEGIA DE MIGRACIÓN: CLERK → AUTENTICACIÓN MANUAL

## 📋 TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Plan de Migración](#plan-de-migración)
3. [Estrategia de Passwords](#estrategia-de-passwords)
4. [Backup Strategy](#backup-strategy)
5. [Proceso de Migración](#proceso-de-migración)
6. [Rollback Plan](#rollback-plan)
7. [Testing y Validación](#testing-y-validación)
8. [Comunicación a Usuarios](#comunicación-a-usuarios)
9. [Checklist de Ejecución](#checklist-de-ejecución)

---

## 📊 RESUMEN EJECUTIVO

### Objetivo
Migrar de Clerk Authentication a sistema de autenticación manual con bcrypt, manteniendo todos los datos de usuarios existentes y garantizando cero pérdida de información.

### Impacto
- ✅ **Usuarios afectados**: TODOS los usuarios activos
- ⚠️ **Downtime estimado**: 15-30 minutos
- 🔒 **Nivel de riesgo**: MEDIO (mitigable con backups)
- 💰 **Ahorro mensual**: $25-100/mes

### Estrategia Seleccionada
**Password Reset Forzado** - Todos los usuarios deben establecer nueva contraseña en primer login.

**Razones:**
1. ✅ Más seguro (no generamos passwords temporales)
2. ✅ Cumple con mejores prácticas de seguridad
3. ✅ Los usuarios eligen su propia contraseña
4. ✅ No necesitamos enviar passwords por email

---

## 📅 PLAN DE MIGRACIÓN

### Fase 1: Preparación (1-2 días antes)

#### 1.1 Auditoría de Usuarios
```bash
# Ejecutar script de auditoría
pnpm tsx scripts/audit-users.ts
```

**Genera:**
- Lista de usuarios activos
- Usuarios con `clerkId: 'pending_*'`
- Usuarios sin email verificado
- Estadísticas generales

#### 1.2 Backup Completo
```bash
# Backup automático de la base de datos
pnpm tsx scripts/backup-database.ts

# Output: backups/pos-system-backup-[timestamp].sql
```

#### 1.3 Comunicación Pre-Migración
**Email a todos los usuarios (3 días antes):**
```
Asunto: Importante: Actualización del Sistema de Autenticación

Estimado usuario,

El [FECHA] realizaremos una actualización importante de nuestro sistema
de autenticación para mejorar la seguridad y rendimiento.

QUÉ DEBES HACER:
1. Al iniciar sesión después de la migración, se te pedirá establecer
   una nueva contraseña
2. Recibirás un email con un link para establecer tu contraseña
3. El link expirará en 7 días

VENTANAS DE MANTENIMIENTO:
- Inicio: [FECHA] [HORA]
- Duración estimada: 30 minutos
- El sistema estará temporalmente inaccesible

Si tienes preguntas, contacta a soporte@tuempresa.com

Saludos,
Equipo de TI
```

---

### Fase 2: Migración de Base de Datos (Día D)

#### 2.1 Mantenimiento Mode
```bash
# Activar modo mantenimiento
echo "MAINTENANCE_MODE=true" >> .env.local

# Opcional: Página de mantenimiento
# Crear src/app/maintenance/page.tsx
```

#### 2.2 Backup Final
```bash
# Backup inmediatamente antes de migración
pnpm tsx scripts/backup-database.ts
```

#### 2.3 Ejecutar Migración
```bash
# Generar Prisma client con nuevo schema
npx prisma generate

# Ejecutar migración de base de datos
npx prisma migrate deploy
```

#### 2.4 Migrar Datos de Usuarios
```bash
# Ejecutar script de migración de usuarios
pnpm tsx scripts/migrate-users.ts
```

**Este script:**
1. ✅ Elimina columna `clerkId`
2. ✅ Agrega columnas de autenticación (password, etc.)
3. ✅ Genera tokens de password reset para TODOS los usuarios
4. ✅ Marca `emailVerified = true` para usuarios activos
5. ✅ Envía emails con links de establecer contraseña

#### 2.5 Verificación Post-Migración
```bash
# Validar migración exitosa
pnpm tsx scripts/validate-migration.ts
```

**Validaciones:**
- ✅ Todos los usuarios tienen email único
- ✅ Todos los usuarios tienen password reset token
- ✅ Columna `clerkId` eliminada
- ✅ Nuevas tablas creadas (sessions, password_resets, etc.)
- ✅ Índices creados correctamente

#### 2.6 Deploy de Código Actualizado
```bash
# Deploy de aplicación con nueva autenticación
git checkout main
git pull origin main
pnpm build
pm2 restart pos-system
```

#### 2.7 Desactivar Modo Mantenimiento
```bash
# Remover modo mantenimiento
sed -i '/MAINTENANCE_MODE/d' .env.local

# Verificar que la app esté accesible
curl https://tu-dominio.com/health
```

---

## 🔑 ESTRATEGIA DE PASSWORDS

### Opción Implementada: Password Reset Forzado

**Flujo del Usuario:**

1. **Usuario intenta login**
   ```
   POST /api/auth/login
   { email, password }
   ```

2. **Sistema detecta que no tiene password establecida**
   ```typescript
   if (user.password === 'PENDING_RESET') {
     return {
       status: 'PASSWORD_RESET_REQUIRED',
       message: 'Debes establecer tu contraseña'
     }
   }
   ```

3. **Sistema envía email automáticamente**
   ```
   De: noreply@tuempresa.com
   Para: usuario@email.com
   Asunto: Establece tu nueva contraseña

   Hola [Nombre],

   Para continuar usando el sistema, establece tu nueva contraseña:

   [Botón: Establecer Contraseña]
   Link: https://tu-app.com/auth/reset-password?token=[TOKEN]

   Este link expira en 7 días.
   ```

4. **Usuario establece nueva contraseña**
   ```
   POST /api/auth/reset-password
   { token, newPassword, confirmPassword }
   ```

5. **Sistema actualiza y permite login**
   ```typescript
   // Hashear contraseña
   const hashedPassword = await bcrypt.hash(newPassword, 12)

   // Actualizar usuario
   await prisma.user.update({
     where: { id: user.id },
     data: {
       password: hashedPassword,
       passwordChangedAt: new Date()
     }
   })

   // Marcar token como usado
   await prisma.passwordReset.update({
     where: { token },
     data: { used: true, usedAt: new Date() }
   })
   ```

### Password Requirements

```typescript
// Validación de contraseña segura
const passwordSchema = yup.string()
  .min(8, 'Mínimo 8 caracteres')
  .matches(/[a-z]/, 'Debe contener al menos una minúscula')
  .matches(/[A-Z]/, 'Debe contener al menos una mayúscula')
  .matches(/[0-9]/, 'Debe contener al menos un número')
  .matches(/[^a-zA-Z0-9]/, 'Debe contener al menos un carácter especial')
  .required('Contraseña es requerida')
```

---

## 💾 BACKUP STRATEGY

### 1. Backup Automático Pre-Migración

**Script:** `scripts/backup-database.ts`

```bash
# Ejecutar backup
pnpm tsx scripts/backup-database.ts

# Output
✅ Backup creado: backups/pos-system-backup-20250110-143022.sql
✅ Tamaño: 15.3 MB
✅ Tablas respaldadas: 15
✅ Registros totales: 45,231
```

**Contenido del Backup:**
- ✅ Todos los datos de todas las tablas
- ✅ Schema completo de la base de datos
- ✅ Índices y constraints
- ✅ Sequences y auto-increment values
- ✅ Triggers y stored procedures (si aplica)

### 2. Estrategia de Retención

```bash
# Mantener backups por:
- Últimas 24 horas: Cada 1 hora
- Últimos 7 días: 1 por día
- Último mes: 1 por semana
- Último año: 1 por mes

# Auto-cleanup de backups antiguos
pnpm tsx scripts/cleanup-backups.ts
```

### 3. Backup de Validación

**Después de la migración:**
```bash
# Backup post-migración para comparación
pnpm tsx scripts/backup-database.ts --suffix "post-migration"

# Comparar backups
pnpm tsx scripts/compare-backups.ts \
  backups/pre-migration.sql \
  backups/post-migration.sql
```

### 4. Qué Respaldar Antes de Migración

#### Base de Datos Completa
```sql
-- Backup de tabla users (crítico)
COPY users TO '/backups/users-pre-migration.csv' CSV HEADER;

-- Backup de configuración
COPY system_configs TO '/backups/configs-pre-migration.csv' CSV HEADER;
```

#### Archivos de Configuración
```bash
# .env files
cp .env backups/.env.backup-$(date +%Y%m%d)
cp .env.local backups/.env.local.backup-$(date +%Y%m%d)

# Prisma schema
cp prisma/schema.prisma backups/schema.prisma.backup-$(date +%Y%m%d)
```

#### Estado de Clerk
```bash
# Exportar usuarios de Clerk (por si acaso)
pnpm tsx scripts/export-clerk-users.ts

# Output: backups/clerk-users-export-[timestamp].json
```

---

## 🔄 PROCESO DE MIGRACIÓN PASO A PASO

### Checklist de Ejecución

#### PRE-MIGRACIÓN (T-24h)
- [ ] Backup completo de base de datos
- [ ] Auditoría de usuarios completada
- [ ] Email de notificación enviado a usuarios
- [ ] Equipo de soporte informado
- [ ] Plan de rollback revisado
- [ ] Entorno de staging probado exitosamente

#### DÍA DE MIGRACIÓN (T-0)
- [ ] Modo mantenimiento activado
- [ ] Backup final ejecutado
- [ ] Migración de schema ejecutada (`prisma migrate deploy`)
- [ ] Script de migración de usuarios ejecutado
- [ ] Validaciones post-migración ejecutadas
- [ ] Deploy de código nuevo completado
- [ ] Smoke tests ejecutados
- [ ] Modo mantenimiento desactivado

#### POST-MIGRACIÓN (T+1h)
- [ ] Monitoreo activo de errores
- [ ] Primeros usuarios migrando exitosamente
- [ ] Emails de password reset siendo enviados
- [ ] No hay errores críticos en logs
- [ ] Performance normal de la aplicación

#### POST-MIGRACIÓN (T+24h)
- [ ] Mayoría de usuarios han establecido contraseñas
- [ ] Recordatorio enviado a usuarios pendientes
- [ ] Auditoría de seguridad ejecutada
- [ ] Documentación actualizada
- [ ] Backups antiguos archivados

---

## ⏮️ ROLLBACK PLAN

### Escenarios de Rollback

#### Scenario 1: Falla Durante Migración de Schema
```bash
# Si falla npx prisma migrate deploy
# Restaurar desde backup inmediatamente

pnpm tsx scripts/rollback-migration.ts --restore-from backups/pre-migration.sql
```

#### Scenario 2: Falla en Migración de Usuarios
```bash
# Si falla scripts/migrate-users.ts
# La DB ya cambió schema, pero no se migraron datos

# Opción A: Re-ejecutar migración de usuarios
pnpm tsx scripts/migrate-users.ts --retry

# Opción B: Rollback completo
pnpm tsx scripts/rollback-migration.ts --full-restore
```

#### Scenario 3: Problemas Post-Deploy
```bash
# Si hay problemas después de activar nuevo código
# Pero la DB está migrada exitosamente

# Opción A: Hotfix (preferido si es bug menor)
git checkout -b hotfix/auth-issue
# ... fix issue ...
git push && deploy

# Opción B: Revert a Clerk temporalmente
git revert [commit-hash]
pnpm tsx scripts/restore-clerk-compatibility.ts
```

### Migration Rollback Script

**Comando:**
```bash
pnpm tsx scripts/rollback-migration.ts [options]

# Opciones:
--restore-from <file>     # Restaurar desde backup específico
--full-restore            # Restaurar DB + código
--schema-only             # Solo revertir schema
--data-only               # Solo revertir datos
```

**Pasos del Rollback:**

1. **Activar Modo Mantenimiento**
   ```bash
   echo "MAINTENANCE_MODE=true" >> .env.local
   ```

2. **Restaurar Base de Datos**
   ```bash
   # Conectar a DB
   psql $DATABASE_URL < backups/pre-migration.sql
   ```

3. **Revertir Código**
   ```bash
   git revert [commit-hash]
   pnpm install
   pnpm build
   pm2 restart pos-system
   ```

4. **Regenerar Prisma Client**
   ```bash
   git checkout prisma/schema.prisma
   npx prisma generate
   ```

5. **Validar Rollback**
   ```bash
   pnpm tsx scripts/validate-rollback.ts
   ```

6. **Desactivar Mantenimiento**
   ```bash
   sed -i '/MAINTENANCE_MODE/d' .env.local
   ```

### Rollback Decision Tree

```
¿La migración de schema completó?
├─ NO → Restaurar backup completo (5 min)
└─ SÍ → ¿La migración de usuarios completó?
    ├─ NO → Re-ejecutar migración de usuarios (10 min)
    └─ SÍ → ¿Hay errores en producción?
        ├─ CRÍTICOS → Rollback completo (15 min)
        └─ MENORES → Hotfix (30 min)
```

---

## 🧪 TESTING Y VALIDACIÓN

### Testing Pre-Migración (Staging)

#### 1. Setup de Staging
```bash
# Clonar DB de producción a staging
pnpm tsx scripts/clone-db-to-staging.ts

# Ejecutar migración en staging
NODE_ENV=staging npx prisma migrate deploy
NODE_ENV=staging pnpm tsx scripts/migrate-users.ts
```

#### 2. Test Cases Críticos

**TC-1: Usuario Existente Puede Resetear Password**
```bash
curl -X POST https://staging.app.com/api/auth/forgot-password \
  -d '{"email":"test@example.com"}'

# Verificar:
✅ Email recibido
✅ Token generado en DB
✅ Link funcional
✅ Password actualizada exitosamente
✅ Login funciona con nueva password
```

**TC-2: Usuario con Sesión Activa de Clerk**
```bash
# Simular usuario con sesión de Clerk activa
# antes de migración

# Verificar:
✅ Sesión de Clerk invalidada
✅ Redirect a /auth/login
✅ Mensaje explicativo mostrado
✅ Email de reset enviado automáticamente
```

**TC-3: Multi-Tenant Isolation**
```bash
# Usuario de Org A intenta acceder a recursos de Org B

# Verificar:
✅ Autenticación funciona
✅ organizationId preservado
✅ No puede acceder a recursos de otra org
✅ Auditoría registra intento
```

**TC-4: Soft Delete Usuarios**
```bash
# Usuario con isDeleted=true

# Verificar:
✅ No puede hacer login
✅ Email puede ser reutilizado después
✅ Relaciones preservadas (sales, movements)
```

#### 3. Performance Testing
```bash
# Load test con 100 usuarios concurrentes
pnpm tsx scripts/load-test-auth.ts --users 100 --duration 60s

# Métricas esperadas:
- Tiempo de login: < 500ms (p95)
- Tiempo de reset password: < 300ms (p95)
- Throughput: > 50 req/s
- Error rate: < 0.1%
```

### Validación Post-Migración (Producción)

#### 1. Smoke Tests
```bash
pnpm tsx scripts/smoke-test-production.ts

# Verifica:
✅ App accesible
✅ Endpoint de health check responde
✅ Login page carga correctamente
✅ Reset password page funcional
✅ API endpoints responden
```

#### 2. Validación de Datos
```bash
pnpm tsx scripts/validate-migration.ts

# Verifica:
✅ Conteo de usuarios igual pre/post migración
✅ Todos los emails únicos
✅ Todos los usuarios tienen password reset token
✅ Columna clerkId eliminada
✅ Nuevas tablas existen (sessions, password_resets, etc.)
✅ Índices creados
✅ Constraints aplicados
```

#### 3. Monitoring en Tiempo Real

**Métricas a monitorear (primeras 24h):**
- ✅ Rate de password resets exitosos
- ✅ Rate de login errors
- ✅ Usuarios que establecieron password
- ✅ Emails enviados vs. bounces
- ⚠️ Errores en logs (< 0.1%)
- ⚠️ Latencia de endpoints (< 500ms)

**Dashboard de monitoreo:**
```bash
# Ejecutar dashboard en tiempo real
pnpm tsx scripts/migration-dashboard.ts

# Output:
┌─────────────────────────────────────────┐
│  MIGRATION MONITORING DASHBOARD         │
├─────────────────────────────────────────┤
│  Total Users:           1,245           │
│  Passwords Set:         892 (71.6%)     │
│  Pending Reset:         353 (28.4%)     │
│  Login Attempts:        2,341           │
│  Login Success Rate:    94.3%           │
│  Avg Login Time:        287ms           │
│  Errors (last hour):    3               │
└─────────────────────────────────────────┘
```

---

## 📧 COMUNICACIÓN A USUARIOS

### Email 1: Pre-Migración (T-72h)
```
Asunto: 🔐 Actualización Importante del Sistema - [FECHA]

Estimado [Nombre],

Te informamos que el [FECHA] a las [HORA] realizaremos una
actualización importante de nuestro sistema de autenticación.

QUÉ VA A CAMBIAR:
• Sistema de login más seguro y rápido
• Deberás establecer una nueva contraseña
• Recibirás un email con instrucciones

QUÉ DEBES HACER:
1. Revisa tu email el día [FECHA]
2. Haz click en el link de "Establecer Contraseña"
3. Crea una contraseña segura (mínimo 8 caracteres)
4. ¡Listo! Ya puedes usar el sistema normalmente

VENTANA DE MANTENIMIENTO:
• Inicio: [FECHA] [HORA]
• Duración: 30 minutos aproximadamente
• El sistema no estará disponible durante este tiempo

Si tienes preguntas, estamos aquí para ayudarte.

Saludos,
Equipo de [EMPRESA]
```

### Email 2: Password Reset (T+0h, después de migración)
```
Asunto: 🔑 Establece tu Nueva Contraseña - Acción Requerida

Hola [Nombre],

Hemos actualizado nuestro sistema de autenticación. Para continuar
usando la plataforma, necesitas establecer una nueva contraseña.

[Botón: ESTABLECER CONTRASEÑA]
Link: https://app.com/auth/reset-password?token=[TOKEN]

INSTRUCCIONES:
1. Haz click en el botón de arriba
2. Crea una contraseña segura:
   • Mínimo 8 caracteres
   • Al menos 1 mayúscula
   • Al menos 1 número
   • Al menos 1 carácter especial
3. Confirma tu contraseña
4. ¡Listo! Inicia sesión con tu nueva contraseña

⏰ IMPORTANTE: Este link expira en 7 días.

¿Necesitas ayuda? Contacta a soporte@empresa.com

Saludos,
Equipo de [EMPRESA]
```

### Email 3: Recordatorio (T+72h para usuarios pendientes)
```
Asunto: ⚠️ Recordatorio: Establece tu Contraseña - Expira en 4 días

Hola [Nombre],

Notamos que aún no has establecido tu nueva contraseña.

Tu link de reset expira en 4 días. Después necesitarás solicitar
uno nuevo.

[Botón: ESTABLECER CONTRASEÑA AHORA]
Link: https://app.com/auth/reset-password?token=[TOKEN]

¿Link expirado o no recibiste el email?
https://app.com/auth/forgot-password

¿Necesitas ayuda?
soporte@empresa.com | Tel: [TELÉFONO]

Saludos,
Equipo de [EMPRESA]
```

---

## ✅ CHECKLIST DE EJECUCIÓN COMPLETA

### Semana Antes
- [ ] Revisión del plan con equipo de desarrollo
- [ ] Revisión del plan con equipo de soporte
- [ ] Aprobación de stakeholders
- [ ] Código de migración en repositorio y revisado
- [ ] Scripts de backup/rollback probados
- [ ] Documentación completa y revisada

### 72 Horas Antes
- [ ] Email de notificación enviado a usuarios
- [ ] Post en redes sociales/blog (si aplica)
- [ ] Soporte preparado con FAQs
- [ ] Backup de producción ejecutado
- [ ] Auditoría de usuarios ejecutada

### 24 Horas Antes
- [ ] Migración probada exitosamente en staging
- [ ] Todos los test cases pasando
- [ ] Performance tests ejecutados
- [ ] Plan de comunicación confirmado
- [ ] Equipo en standby confirmado

### Día de Migración (Inicio)
- [ ] Modo mantenimiento activado
- [ ] Página de mantenimiento visible
- [ ] Notificación en app (si aplica)
- [ ] Backup final ejecutado
- [ ] Backup validado y descargado

### Durante Migración
- [ ] Prisma migrate deploy ejecutado
- [ ] Schema actualizado verificado
- [ ] Scripts de migración de usuarios ejecutado
- [ ] Logs monitoreados en tiempo real
- [ ] Validaciones post-migración ejecutadas
- [ ] Todas las validaciones pasando

### Post-Migración (Deploy)
- [ ] Código nuevo desplegado
- [ ] Prisma client regenerado
- [ ] Smoke tests ejecutados
- [ ] Modo mantenimiento desactivado
- [ ] Primer usuario de prueba logueado exitosamente

### Monitoreo (Primeras 4 horas)
- [ ] Dashboard de monitoreo activo
- [ ] Logs siendo revisados cada 15 min
- [ ] Emails de reset siendo enviados
- [ ] Usuarios estableciendo passwords
- [ ] No hay errores críticos
- [ ] Performance dentro de rangos normales

### Día Siguiente
- [ ] Email de recordatorio preparado
- [ ] Reporte de migración generado
- [ ] Métricas documentadas
- [ ] Issues identificados y priorizados
- [ ] Backup archivado

### Semana Después
- [ ] Mayoría de usuarios migraron (>95%)
- [ ] Email final a usuarios pendientes
- [ ] Soporte de Clerk cancelado (si aplica)
- [ ] Post-mortem meeting
- [ ] Documentación actualizada con lecciones aprendidas

---

## 🎯 MÉTRICAS DE ÉXITO

### Criterios de Éxito
- ✅ **Uptime**: > 99.9% durante migración
- ✅ **Data Loss**: 0% de pérdida de datos
- ✅ **User Migration Rate**: > 95% en 7 días
- ✅ **Error Rate**: < 0.1% post-migración
- ✅ **Performance**: No degradación (< 10% latencia)
- ✅ **Support Tickets**: < 50 tickets relacionados a migración

### KPIs a Trackear
```typescript
interface MigrationMetrics {
  totalUsers: number
  passwordsSet: number
  passwordsSetRate: number
  loginAttempts: number
  loginSuccessRate: number
  avgLoginTime: number
  emailsSent: number
  emailBounceRate: number
  supportTickets: number
  criticalErrors: number
}
```

---

## 📝 NOTAS FINALES

### Lecciones Aprendidas (Template)
```markdown
## Post-Mortem: Migración Auth [FECHA]

### Lo que salió bien
- [Item 1]
- [Item 2]

### Lo que salió mal
- [Item 1]
- [Item 2]

### Mejoras para próxima migración
- [Item 1]
- [Item 2]

### Métricas finales
- Usuarios migrados: XXX (XX%)
- Downtime real: XX minutos
- Issues críticos: XX
- Support tickets: XX
```

### Contactos Clave
```yaml
Lead Developer: [Nombre] - [Email] - [Tel]
DBA: [Nombre] - [Email] - [Tel]
DevOps: [Nombre] - [Email] - [Tel]
Support Lead: [Nombre] - [Email] - [Tel]
Stakeholder: [Nombre] - [Email] - [Tel]
```

### Enlaces Útiles
- Repo: https://github.com/tu-org/pos-system
- Staging: https://staging.app.com
- Production: https://app.com
- Monitoring: https://monitoring.app.com
- Documentation: https://docs.app.com

---

**Última actualización:** 2025-01-10
**Versión:** 1.0
**Autor:** Database Architect Team
