/**
 * ============================================
 * SCRIPT DE VALIDACIÓN DE MIGRACIÓN
 * ============================================
 *
 * Valida que la migración de autenticación se completó exitosamente
 * Verifica schema, datos, índices y constraints
 *
 * Uso:
 *   pnpm tsx scripts/validate-migration.ts
 *
 * ============================================
 */

import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

interface ValidationResult {
  check: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: ValidationResult[] = [];

function addResult(check: string, passed: boolean, message: string, details?: any) {
  results.push({ check, passed, message, details });
  const icon = passed ? '✅' : '❌';
  const color = passed ? colors.green : colors.red;
  log(`${icon} ${check}: ${message}`, color);
  if (details && !passed) {
    log(`   Detalles: ${JSON.stringify(details)}`, colors.yellow);
  }
}

// ============================================
// VALIDACIONES
// ============================================

async function validateTables() {
  log('\n📋 Validando tablas...', colors.blue);

  const requiredTables = ['sessions', 'password_resets', 'email_verifications', 'audit_logs'];

  for (const table of requiredTables) {
    try {
      const result = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = ${table}
        ) as exists
      ` as any[];

      const exists = result[0]?.exists;
      addResult(
        `Tabla ${table}`,
        exists,
        exists ? 'Existe' : 'No existe'
      );
    } catch (error) {
      addResult(`Tabla ${table}`, false, `Error: ${error}`);
    }
  }
}

async function validateUserFields() {
  log('\n👤 Validando campos de User...', colors.blue);

  const requiredFields = [
    { name: 'password', type: 'text' },
    { name: 'lastLoginAt', type: 'timestamp without time zone' },
    { name: 'passwordChangedAt', type: 'timestamp without time zone' },
    { name: 'loginAttempts', type: 'integer' },
    { name: 'lockedUntil', type: 'timestamp without time zone' },
  ];

  for (const field of requiredFields) {
    try {
      const result = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = ${field.name}
        ) as exists
      ` as any[];

      const exists = result[0]?.exists;
      addResult(
        `Campo users.${field.name}`,
        exists,
        exists ? 'Existe' : 'No existe'
      );
    } catch (error) {
      addResult(`Campo users.${field.name}`, false, `Error: ${error}`);
    }
  }

  // Verificar que clerkId no existe
  try {
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'clerkId'
      ) as exists
    ` as any[];

    const exists = result[0]?.exists;
    addResult(
      'Campo users.clerkId eliminado',
      !exists,
      !exists ? 'Correctamente eliminado' : 'Aún existe'
    );
  } catch (error) {
    addResult('Campo users.clerkId eliminado', false, `Error: ${error}`);
  }
}

async function validateIndexes() {
  log('\n🔍 Validando índices...', colors.blue);

  const requiredIndexes = [
    { table: 'users', name: 'unique_email_per_deletion' },
    { table: 'users', name: 'unique_username_per_deletion' },
    { table: 'sessions', name: 'sessions_userId_isActive_idx' },
    { table: 'sessions', name: 'sessions_token_idx' },
    { table: 'password_resets', name: 'password_resets_token_idx' },
    { table: 'email_verifications', name: 'email_verifications_token_idx' },
    { table: 'audit_logs', name: 'audit_logs_userId_idx' },
  ];

  for (const index of requiredIndexes) {
    try {
      const result = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE tablename = ${index.table} AND indexname = ${index.name}
        ) as exists
      ` as any[];

      const exists = result[0]?.exists;
      addResult(
        `Índice ${index.name}`,
        exists,
        exists ? 'Existe' : 'No existe'
      );
    } catch (error) {
      addResult(`Índice ${index.name}`, false, `Error: ${error}`);
    }
  }
}

async function validateData() {
  log('\n📊 Validando datos...', colors.blue);

  // Todos los usuarios deben tener password
  try {
    const usersWithoutPassword = await prisma.user.count({
      where: {
        password: '',
      },
    });

    addResult(
      'Usuarios con password',
      usersWithoutPassword === 0,
      usersWithoutPassword === 0
        ? 'Todos los usuarios tienen password'
        : `${usersWithoutPassword} usuarios sin password`,
      { count: usersWithoutPassword }
    );
  } catch (error) {
    addResult('Usuarios con password', false, `Error: ${error}`);
  }

  // No debe haber emails duplicados (usuarios activos)
  try {
    const duplicateEmails = await prisma.$queryRaw`
      SELECT email, COUNT(*) as count
      FROM users
      WHERE "isDeleted" = false
      GROUP BY email
      HAVING COUNT(*) > 1
    ` as any[];

    addResult(
      'Emails únicos',
      duplicateEmails.length === 0,
      duplicateEmails.length === 0
        ? 'No hay emails duplicados'
        : `${duplicateEmails.length} emails duplicados encontrados`,
      { duplicates: duplicateEmails }
    );
  } catch (error) {
    addResult('Emails únicos', false, `Error: ${error}`);
  }

  // Contar usuarios activos con password reset token
  try {
    const activeUsers = await prisma.user.count({
      where: {
        isDeleted: false,
        isActive: true,
      },
    });

    const usersWithTokens = await prisma.passwordReset.count({
      where: {
        used: false,
        expiresAt: { gte: new Date() },
        user: {
          isDeleted: false,
          isActive: true,
        },
      },
    });

    const percentage = activeUsers > 0 ? (usersWithTokens / activeUsers * 100).toFixed(1) : '0';

    addResult(
      'Tokens de password reset',
      usersWithTokens > 0,
      `${usersWithTokens}/${activeUsers} usuarios tienen token (${percentage}%)`,
      { activeUsers, usersWithTokens, percentage }
    );
  } catch (error) {
    addResult('Tokens de password reset', false, `Error: ${error}`);
  }
}

async function validateRelations() {
  log('\n🔗 Validando relaciones...', colors.blue);

  // Verificar foreign keys
  const foreignKeys = [
    { table: 'sessions', column: 'userId', references: 'users' },
    { table: 'password_resets', column: 'userId', references: 'users' },
    { table: 'email_verifications', column: 'userId', references: 'users' },
    { table: 'audit_logs', column: 'userId', references: 'users' },
  ];

  for (const fk of foreignKeys) {
    try {
      const result = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_name = ${fk.table}
            AND kcu.column_name = ${fk.column}
            AND tc.constraint_type = 'FOREIGN KEY'
        ) as exists
      ` as any[];

      const exists = result[0]?.exists;
      addResult(
        `FK ${fk.table}.${fk.column}`,
        exists,
        exists ? `Referencia a ${fk.references}` : 'No existe'
      );
    } catch (error) {
      addResult(`FK ${fk.table}.${fk.column}`, false, `Error: ${error}`);
    }
  }
}

async function validateEnums() {
  log('\n🎯 Validando enums...', colors.blue);

  try {
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM pg_type
        WHERE typname = 'AuditAction'
      ) as exists
    ` as any[];

    const exists = result[0]?.exists;
    addResult(
      'Enum AuditAction',
      exists,
      exists ? 'Existe' : 'No existe'
    );

    if (exists) {
      const values = await prisma.$queryRaw`
        SELECT enumlabel
        FROM pg_enum
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AuditAction')
        ORDER BY enumsortorder
      ` as any[];

      const expectedValues = [
        'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_RESET_REQUESTED',
        'PASSWORD_RESET_COMPLETED', 'EMAIL_VERIFIED', 'ACCOUNT_LOCKED',
        'ACCOUNT_UNLOCKED', 'CREATE', 'READ', 'UPDATE', 'DELETE', 'RESTORE',
        'ROLE_CHANGED', 'ORGANIZATION_CHANGED', 'STORE_CHANGED', 'SESSION_REVOKED'
      ];

      const actualValues = values.map((v: any) => v.enumlabel);
      const allValuesPresent = expectedValues.every(v => actualValues.includes(v));

      addResult(
        'Valores AuditAction',
        allValuesPresent,
        allValuesPresent
          ? `${actualValues.length} valores presentes`
          : 'Faltan valores',
        { expected: expectedValues.length, actual: actualValues.length }
      );
    }
  } catch (error) {
    addResult('Enum AuditAction', false, `Error: ${error}`);
  }
}

async function getStatistics() {
  log('\n📈 Estadísticas generales...', colors.blue);

  try {
    const stats = {
      totalUsers: await prisma.user.count(),
      activeUsers: await prisma.user.count({ where: { isDeleted: false, isActive: true } }),
      sessions: await prisma.session.count(),
      activeSessions: await prisma.session.count({ where: { isActive: true } }),
      passwordResets: await prisma.passwordReset.count(),
      pendingResets: await prisma.passwordReset.count({ where: { used: false } }),
      emailVerifications: await prisma.emailVerification.count(),
      auditLogs: await prisma.auditLog.count(),
    };

    log(`   Total usuarios:        ${stats.totalUsers}`, colors.reset);
    log(`   Usuarios activos:      ${stats.activeUsers}`, colors.reset);
    log(`   Sesiones:              ${stats.sessions} (${stats.activeSessions} activas)`, colors.reset);
    log(`   Password resets:       ${stats.passwordResets} (${stats.pendingResets} pendientes)`, colors.reset);
    log(`   Email verifications:   ${stats.emailVerifications}`, colors.reset);
    log(`   Audit logs:            ${stats.auditLogs}`, colors.reset);

    return stats;
  } catch (error) {
    log(`   Error obteniendo estadísticas: ${error}`, colors.red);
    return null;
  }
}

// ============================================
// EJECUTAR VALIDACIONES
// ============================================

async function main() {
  log('\n' + '='.repeat(60), colors.bright);
  log('  VALIDACIÓN DE MIGRACIÓN DE AUTENTICACIÓN', colors.bright);
  log('='.repeat(60) + '\n', colors.bright);

  try {
    await validateTables();
    await validateUserFields();
    await validateIndexes();
    await validateData();
    await validateRelations();
    await validateEnums();
    const stats = await getStatistics();

    // Reporte final
    log('\n' + '='.repeat(60), colors.bright);
    log('  REPORTE FINAL', colors.bright);
    log('='.repeat(60) + '\n', colors.bright);

    const totalChecks = results.length;
    const passedChecks = results.filter(r => r.passed).length;
    const failedChecks = totalChecks - passedChecks;
    const successRate = ((passedChecks / totalChecks) * 100).toFixed(1);

    log(`📊 Resultados:`, colors.blue);
    log(`   Total validaciones:  ${totalChecks}`, colors.reset);
    log(`   Pasadas:            ${passedChecks} ✅`, colors.green);
    log(`   Fallidas:           ${failedChecks} ❌`, failedChecks > 0 ? colors.red : colors.green);
    log(`   Tasa de éxito:      ${successRate}%\n`, failedChecks === 0 ? colors.green : colors.yellow);

    if (failedChecks > 0) {
      log('❌ Validaciones fallidas:', colors.red);
      results.filter(r => !r.passed).forEach(r => {
        log(`   - ${r.check}: ${r.message}`, colors.red);
      });
      log('\n⚠️  La migración tiene problemas que deben resolverse', colors.yellow);
      process.exit(1);
    } else {
      log('✅ Todas las validaciones pasaron exitosamente', colors.green);
      log('🎉 La migración se completó correctamente\n', colors.green);

      if (stats) {
        log('💡 Próximos pasos:', colors.cyan);
        log('   1. Monitorear logs de la aplicación', colors.reset);
        log('   2. Verificar que usuarios pueden hacer login', colors.reset);
        log('   3. Confirmar que emails de password reset se envían', colors.reset);
        log('   4. Revisar métricas de autenticación\n', colors.reset);
      }
      process.exit(0);
    }
  } catch (error) {
    log(`\n💥 Error fatal: ${error}`, colors.red);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si es el módulo principal
if (require.main === module) {
  main();
}

export { main as validateMigration };
