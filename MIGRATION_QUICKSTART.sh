#!/bin/bash

# ============================================
# MIGRACIÓN DE AUTENTICACIÓN - QUICK START
# ============================================
#
# Este script automatiza el proceso completo de migración
# de Clerk a autenticación manual.
#
# Uso:
#   chmod +x MIGRATION_QUICKSTART.sh
#   ./MIGRATION_QUICKSTART.sh
#
# ============================================

set -e  # Exit on error

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Funciones de logging
log_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

log_success() {
    echo -e "${GREEN}✅${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠️ ${NC}$1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

log_step() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

# Función para confirmar acción
confirm() {
    read -p "$(echo -e ${YELLOW}$1${NC} [y/N]: )" -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "Operación cancelada por el usuario"
        exit 1
    fi
}

# ============================================
# PASO 1: VALIDACIONES PREVIAS
# ============================================

log_step "PASO 1: VALIDACIONES PREVIAS"

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    log_error "Error: Debes ejecutar este script desde la raíz del proyecto"
    exit 1
fi

log_success "Directorio correcto"

# Verificar que existe .env
if [ ! -f ".env" ]; then
    log_error "Error: Archivo .env no encontrado"
    exit 1
fi

log_success "Archivo .env encontrado"

# Verificar variables de entorno
if [ -z "$DATABASE_URL" ]; then
    log_error "Error: DATABASE_URL no está definido en .env"
    exit 1
fi

log_success "Variables de entorno correctas"

# Verificar que PostgreSQL client está instalado
if ! command -v psql &> /dev/null; then
    log_error "Error: PostgreSQL client (psql) no está instalado"
    log_warning "Instala con: sudo apt-get install postgresql-client (Ubuntu/Debian)"
    log_warning "           o: brew install postgresql (macOS)"
    exit 1
fi

log_success "PostgreSQL client instalado"

# Verificar que pnpm está instalado
if ! command -v pnpm &> /dev/null; then
    log_error "Error: pnpm no está instalado"
    log_warning "Instala con: npm install -g pnpm"
    exit 1
fi

log_success "pnpm instalado"

# ============================================
# PASO 2: BACKUP PRE-MIGRACIÓN
# ============================================

log_step "PASO 2: BACKUP DE BASE DE DATOS"

confirm "¿Deseas crear un backup de la base de datos antes de continuar?"

log_info "Creando backup..."
pnpm tsx scripts/backup-database.ts --suffix=pre-migration --compress

if [ $? -eq 0 ]; then
    log_success "Backup creado exitosamente"
    log_info "Ubicación: backups/pos-system-backup-pre-migration.sql.gz"
else
    log_error "Error creando backup"
    exit 1
fi

# ============================================
# PASO 3: MODO MANTENIMIENTO (OPCIONAL)
# ============================================

log_step "PASO 3: MODO MANTENIMIENTO"

confirm "¿Deseas activar el modo mantenimiento?"

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "MAINTENANCE_MODE=true" >> .env.local
    log_success "Modo mantenimiento activado"
    log_warning "Recuerda desactivarlo después de la migración"
fi

# ============================================
# PASO 4: MIGRACIÓN DE SCHEMA
# ============================================

log_step "PASO 4: MIGRACIÓN DE SCHEMA"

log_warning "⚠️  ATENCIÓN: Este paso modificará la estructura de la base de datos"
log_info "Se ejecutará: prisma/migrations/manual/migrate_to_manual_auth.sql"
confirm "¿Continuar con la migración de schema?"

log_info "Ejecutando migración de schema..."
psql $DATABASE_URL < prisma/migrations/manual/migrate_to_manual_auth.sql

if [ $? -eq 0 ]; then
    log_success "Schema migrado exitosamente"
else
    log_error "Error en migración de schema"
    log_warning "Puedes hacer rollback con: psql \$DATABASE_URL < prisma/migrations/manual/rollback_manual_auth.sql"
    exit 1
fi

# ============================================
# PASO 5: REGENERAR PRISMA CLIENT
# ============================================

log_step "PASO 5: REGENERAR PRISMA CLIENT"

log_info "Regenerando Prisma client..."
npx prisma generate

if [ $? -eq 0 ]; then
    log_success "Prisma client regenerado"
else
    log_error "Error regenerando Prisma client"
    exit 1
fi

# ============================================
# PASO 6: MIGRACIÓN DE USUARIOS (DRY-RUN)
# ============================================

log_step "PASO 6: MIGRACIÓN DE USUARIOS (DRY-RUN)"

log_info "Ejecutando dry-run de migración de usuarios..."
pnpm tsx scripts/migrate-users.ts --dry-run

if [ $? -eq 0 ]; then
    log_success "Dry-run completado"
    confirm "¿Los resultados del dry-run son correctos? ¿Continuar con migración real?"
else
    log_error "Error en dry-run"
    exit 1
fi

# ============================================
# PASO 7: MIGRACIÓN DE USUARIOS (REAL)
# ============================================

log_step "PASO 7: MIGRACIÓN DE USUARIOS"

log_warning "⚠️  Este paso generará tokens de password reset para TODOS los usuarios"
confirm "¿Continuar con la migración de usuarios?"

log_info "Ejecutando migración de usuarios..."
pnpm tsx scripts/migrate-users.ts

if [ $? -eq 0 ]; then
    log_success "Usuarios migrados exitosamente"
else
    log_error "Error en migración de usuarios"
    exit 1
fi

# ============================================
# PASO 8: VALIDACIÓN DE MIGRACIÓN
# ============================================

log_step "PASO 8: VALIDACIÓN DE MIGRACIÓN"

log_info "Validando migración..."
pnpm tsx scripts/validate-migration.ts

if [ $? -eq 0 ]; then
    log_success "Validación exitosa - Migración completada correctamente ✨"
else
    log_error "Validación falló - Revisar logs"
    log_warning "Considera hacer rollback si hay errores críticos"
    exit 1
fi

# ============================================
# PASO 9: DESACTIVAR MODO MANTENIMIENTO
# ============================================

log_step "PASO 9: DESACTIVAR MODO MANTENIMIENTO"

if grep -q "MAINTENANCE_MODE=true" .env.local 2>/dev/null; then
    confirm "¿Deseas desactivar el modo mantenimiento?"

    sed -i.bak '/MAINTENANCE_MODE/d' .env.local
    log_success "Modo mantenimiento desactivado"
fi

# ============================================
# PASO 10: REPORTE FINAL
# ============================================

log_step "MIGRACIÓN COMPLETADA EXITOSAMENTE 🎉"

echo ""
log_success "La migración se completó sin errores"
echo ""
log_info "Próximos pasos:"
echo "  1. Verificar que la aplicación funciona correctamente"
echo "  2. Monitorear logs por las próximas 24 horas"
echo "  3. Verificar que usuarios reciben emails de password reset"
echo "  4. Confirmar que usuarios pueden hacer login"
echo ""
log_info "Comandos útiles:"
echo "  - Ver logs:           pm2 logs pos-system"
echo "  - Monitoreo:          pnpm tsx scripts/migration-dashboard.ts"
echo "  - Rollback (si necesario): ./MIGRATION_ROLLBACK.sh"
echo ""
log_info "Backups creados:"
ls -lh backups/ | grep "pre-migration"
echo ""
log_warning "IMPORTANTE: Guarda los backups en un lugar seguro"
echo ""

# Crear archivo de resumen
cat > migration-result.txt <<EOF
========================================
MIGRACIÓN DE AUTENTICACIÓN - RESULTADO
========================================

Fecha: $(date)
Estado: EXITOSO ✅

Pasos completados:
✅ Validaciones previas
✅ Backup de base de datos
✅ Migración de schema
✅ Regeneración de Prisma client
✅ Migración de usuarios
✅ Validación de migración

Backups:
$(ls -lh backups/ | grep "pre-migration")

Próximos pasos:
- Monitorear aplicación por 24h
- Verificar emails enviados
- Confirmar logins exitosos
- Documentar lecciones aprendidas

Para rollback (si necesario):
./MIGRATION_ROLLBACK.sh

========================================
EOF

log_success "Resumen guardado en: migration-result.txt"

exit 0
