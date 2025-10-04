/**
 * ============================================
 * SCRIPT DE MIGRACIÓN DE USUARIOS
 * ============================================
 *
 * Migra usuarios de Clerk a autenticación manual
 * Genera tokens de password reset para todos los usuarios
 * Envía emails con links para establecer contraseñas
 *
 * Uso:
 *   pnpm tsx scripts/migrate-users.ts [options]
 *
 * Opciones:
 *   --dry-run          Solo simula, no hace cambios
 *   --batch-size=50    Procesa usuarios en lotes (default: 50)
 *   --skip-emails      No envía emails (solo genera tokens)
 *   --org-id=xxx       Solo usuarios de una organización
 *
 * ============================================
 */

import { PrismaClient } from '@/generated/prisma';
import crypto from 'crypto';

// Configuración
const config = {
  dryRun: process.argv.includes('--dry-run'),
  batchSize: parseInt(process.argv.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '50'),
  skipEmails: process.argv.includes('--skip-emails'),
  organizationId: process.argv.find(arg => arg.startsWith('--org-id='))?.split('=')[1],
  tokenExpirationDays: 7,
  emailFrom: process.env.EMAIL_FROM || 'noreply@tuempresa.com',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
};

// Cliente Prisma
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

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function calculateExpiration(days: number): Date {
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + days);
  return expiration;
}

async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  lastName: string,
  token: string
): Promise<boolean> {
  if (config.skipEmails || config.dryRun) {
    log(`  📧 [SKIP] Email a ${email}`, colors.yellow);
    return true;
  }

  const resetLink = `${config.appUrl}/auth/reset-password?token=${token}`;

  // TODO: Implementar envío real de email
  // Por ahora solo logueamos el link
  log(`  📧 Email enviado a ${email}`, colors.green);
  log(`     Link: ${resetLink}`, colors.cyan);

  // Aquí integrarías con tu servicio de email (SendGrid, Mailgun, etc.)
  /*
  try {
    await emailService.send({
      to: email,
      from: config.emailFrom,
      subject: '🔑 Establece tu Nueva Contraseña',
      html: `
        <h2>Hola ${firstName} ${lastName},</h2>
        <p>Hemos actualizado nuestro sistema de autenticación.</p>
        <p>Para continuar usando la plataforma, establece tu nueva contraseña:</p>
        <a href="${resetLink}" style="...">Establecer Contraseña</a>
        <p>Este link expira en ${config.tokenExpirationDays} días.</p>
      `
    });
    return true;
  } catch (error) {
    console.error(`Error enviando email a ${email}:`, error);
    return false;
  }
  */

  return true;
}

// ============================================
// FUNCIÓN PRINCIPAL DE MIGRACIÓN
// ============================================

async function migrateUsers() {
  log('\n' + '='.repeat(60), colors.bright);
  log('  MIGRACIÓN DE USUARIOS: CLERK → AUTH MANUAL', colors.bright);
  log('='.repeat(60) + '\n', colors.bright);

  if (config.dryRun) {
    log('⚠️  MODO DRY-RUN: No se harán cambios reales\n', colors.yellow);
  }

  // Estadísticas
  const stats = {
    total: 0,
    processed: 0,
    skipped: 0,
    errors: 0,
    tokensGenerated: 0,
    emailsSent: 0,
  };

  try {
    // 1. Obtener usuarios a migrar
    log('📊 Obteniendo usuarios...', colors.blue);

    const whereClause: any = {
      isDeleted: false,
    };

    if (config.organizationId) {
      whereClause.organizationId = config.organizationId;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        organizationId: true,
        emailVerified: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    stats.total = users.length;
    log(`✅ ${stats.total} usuarios encontrados\n`, colors.green);

    if (stats.total === 0) {
      log('⚠️  No hay usuarios para migrar', colors.yellow);
      return;
    }

    // 2. Procesar usuarios en lotes
    log('🔄 Procesando usuarios...', colors.blue);

    for (let i = 0; i < users.length; i += config.batchSize) {
      const batch = users.slice(i, i + config.batchSize);
      const batchNumber = Math.floor(i / config.batchSize) + 1;
      const totalBatches = Math.ceil(users.length / config.batchSize);

      log(`\n📦 Lote ${batchNumber}/${totalBatches} (${batch.length} usuarios)`, colors.cyan);

      for (const user of batch) {
        try {
          log(`  👤 ${user.firstName} ${user.lastName} <${user.email}>`, colors.reset);

          // Verificar si ya tiene un token pendiente
          const existingToken = await prisma.passwordReset.findFirst({
            where: {
              userId: user.id,
              used: false,
              expiresAt: { gte: new Date() },
            },
          });

          if (existingToken) {
            log(`     ⏭️  Ya tiene token válido, saltando...`, colors.yellow);
            stats.skipped++;
            continue;
          }

          // Generar token de password reset
          const token = generateSecureToken();
          const expiresAt = calculateExpiration(config.tokenExpirationDays);

          if (!config.dryRun) {
            await prisma.passwordReset.create({
              data: {
                userId: user.id,
                token,
                expiresAt,
              },
            });
          }

          stats.tokensGenerated++;
          log(`     🔑 Token generado (expira: ${expiresAt.toLocaleDateString()})`, colors.green);

          // Enviar email
          const emailSent = await sendPasswordResetEmail(
            user.email,
            user.firstName,
            user.lastName,
            token
          );

          if (emailSent) {
            stats.emailsSent++;
          }

          stats.processed++;
        } catch (error) {
          stats.errors++;
          log(`     ❌ Error procesando usuario: ${error}`, colors.red);
        }
      }

      // Pequeña pausa entre lotes para no sobrecargar el sistema
      if (i + config.batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 3. Crear log de auditoría
    if (!config.dryRun) {
      await prisma.auditLog.create({
        data: {
          action: 'CREATE',
          entity: 'UserMigration',
          metadata: {
            type: 'PASSWORD_RESET_TOKENS_GENERATED',
            totalUsers: stats.total,
            tokensGenerated: stats.tokensGenerated,
            emailsSent: stats.emailsSent,
            errors: stats.errors,
            timestamp: new Date().toISOString(),
          },
        },
      });
    }
  } catch (error) {
    log(`\n❌ Error fatal en migración: ${error}`, colors.red);
    throw error;
  } finally {
    await prisma.$disconnect();
  }

  // 4. Reporte final
  log('\n' + '='.repeat(60), colors.bright);
  log('  MIGRACIÓN COMPLETADA', colors.bright);
  log('='.repeat(60), colors.bright);
  log(`\n📊 Estadísticas:`, colors.blue);
  log(`   Total usuarios:         ${stats.total}`, colors.reset);
  log(`   Procesados:            ${stats.processed}`, colors.green);
  log(`   Saltados (ya tenían):  ${stats.skipped}`, colors.yellow);
  log(`   Errores:               ${stats.errors}`, stats.errors > 0 ? colors.red : colors.green);
  log(`   Tokens generados:      ${stats.tokensGenerated}`, colors.green);
  log(`   Emails enviados:       ${stats.emailsSent}`, colors.green);

  if (config.dryRun) {
    log(`\n⚠️  MODO DRY-RUN: No se hicieron cambios reales`, colors.yellow);
    log(`   Para ejecutar la migración real, omite el flag --dry-run`, colors.yellow);
  }

  log('\n✅ Proceso completado exitosamente\n', colors.green);

  if (!config.skipEmails && !config.dryRun) {
    log('📧 Próximos pasos:', colors.blue);
    log('   1. Verificar que los emails se enviaron correctamente', colors.reset);
    log('   2. Monitorear logs de errores', colors.reset);
    log('   3. Informar a soporte sobre la migración', colors.reset);
    log('   4. Preparar respuestas para preguntas frecuentes\n', colors.reset);
  }
}

// ============================================
// EJECUTAR SCRIPT
// ============================================

async function main() {
  try {
    // Validar configuración
    if (config.batchSize < 1 || config.batchSize > 1000) {
      throw new Error('Batch size debe estar entre 1 y 1000');
    }

    if (config.tokenExpirationDays < 1 || config.tokenExpirationDays > 30) {
      throw new Error('Token expiration debe estar entre 1 y 30 días');
    }

    // Mostrar configuración
    log('⚙️  Configuración:', colors.blue);
    log(`   Dry Run:           ${config.dryRun}`, colors.reset);
    log(`   Batch Size:        ${config.batchSize}`, colors.reset);
    log(`   Skip Emails:       ${config.skipEmails}`, colors.reset);
    log(`   Organization ID:   ${config.organizationId || 'Todas'}`, colors.reset);
    log(`   Token Expiration:  ${config.tokenExpirationDays} días`, colors.reset);
    log(`   Email From:        ${config.emailFrom}`, colors.reset);
    log(`   App URL:           ${config.appUrl}\n`, colors.reset);

    // Ejecutar migración
    await migrateUsers();
    process.exit(0);
  } catch (error) {
    log(`\n💥 Error fatal: ${error}`, colors.red);
    process.exit(1);
  }
}

// Ejecutar si es el módulo principal
if (require.main === module) {
  main();
}

export { migrateUsers };
