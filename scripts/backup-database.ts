/**
 * ============================================
 * SCRIPT DE BACKUP DE BASE DE DATOS
 * ============================================
 *
 * Crea un backup completo de la base de datos PostgreSQL
 * Usa pg_dump para exportar toda la estructura y datos
 *
 * Uso:
 *   pnpm tsx scripts/backup-database.ts [options]
 *
 * Opciones:
 *   --suffix=text      Sufijo para el nombre del archivo (default: timestamp)
 *   --output-dir=path  Directorio de salida (default: ./backups)
 *   --schema-only      Solo backup del schema, sin datos
 *   --data-only        Solo backup de datos, sin schema
 *   --compress         Comprimir backup con gzip
 *
 * Ejemplos:
 *   pnpm tsx scripts/backup-database.ts
 *   pnpm tsx scripts/backup-database.ts --suffix=pre-migration
 *   pnpm tsx scripts/backup-database.ts --compress
 *
 * ============================================
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@/generated/prisma';

const execAsync = promisify(exec);

// Configuración
const config = {
  suffix: process.argv.find(arg => arg.startsWith('--suffix='))?.split('=')[1],
  outputDir: process.argv.find(arg => arg.startsWith('--output-dir='))?.split('=')[1] || './backups',
  schemaOnly: process.argv.includes('--schema-only'),
  dataOnly: process.argv.includes('--data-only'),
  compress: process.argv.includes('--compress'),
  databaseUrl: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
};

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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ============================================
// FUNCIÓN PRINCIPAL DE BACKUP
// ============================================

async function backupDatabase() {
  log('\n' + '='.repeat(60), colors.bright);
  log('  BACKUP DE BASE DE DATOS', colors.bright);
  log('='.repeat(60) + '\n', colors.bright);

  try {
    // 1. Validar configuración
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL o DIRECT_URL no está definido en .env');
    }

    // Parsear URL de base de datos
    const dbUrl = new URL(config.databaseUrl);
    const dbConfig = {
      host: dbUrl.hostname,
      port: dbUrl.port || '5432',
      database: dbUrl.pathname.slice(1).split('?')[0],
      username: dbUrl.username,
      password: dbUrl.password,
    };

    log('📊 Configuración de base de datos:', colors.blue);
    log(`   Host:     ${dbConfig.host}`, colors.reset);
    log(`   Port:     ${dbConfig.port}`, colors.reset);
    log(`   Database: ${dbConfig.database}`, colors.reset);
    log(`   Username: ${dbConfig.username}\n`, colors.reset);

    // 2. Crear directorio de backups si no existe
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
      log(`📁 Directorio de backups creado: ${config.outputDir}`, colors.green);
    }

    // 3. Generar nombre de archivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const suffix = config.suffix || timestamp;
    const extension = config.compress ? '.sql.gz' : '.sql';
    const filename = `pos-system-backup-${suffix}${extension}`;
    const filepath = path.join(config.outputDir, filename);

    log(`📝 Archivo de backup: ${filename}\n`, colors.cyan);

    // 4. Construir comando pg_dump
    let pgDumpCmd = `PGPASSWORD="${dbConfig.password}" pg_dump`;
    pgDumpCmd += ` -h ${dbConfig.host}`;
    pgDumpCmd += ` -p ${dbConfig.port}`;
    pgDumpCmd += ` -U ${dbConfig.username}`;
    pgDumpCmd += ` -d ${dbConfig.database}`;
    pgDumpCmd += ` --no-owner --no-acl`;

    if (config.schemaOnly) {
      pgDumpCmd += ` --schema-only`;
      log('⚙️  Modo: Solo schema (sin datos)', colors.yellow);
    } else if (config.dataOnly) {
      pgDumpCmd += ` --data-only`;
      log('⚙️  Modo: Solo datos (sin schema)', colors.yellow);
    } else {
      log('⚙️  Modo: Schema + Datos (completo)', colors.green);
    }

    if (config.compress) {
      pgDumpCmd += ` | gzip`;
      log('⚙️  Compresión: Habilitada (gzip)\n', colors.green);
    }

    pgDumpCmd += ` > "${filepath}"`;

    // 5. Obtener estadísticas antes del backup
    const prisma = new PrismaClient();
    const stats = {
      users: await prisma.user.count(),
      organizations: await prisma.organization.count(),
      sales: await prisma.sale.count(),
      products: await prisma.product.count(),
    };
    await prisma.$disconnect();

    log('📊 Estadísticas de base de datos:', colors.blue);
    log(`   Usuarios:       ${stats.users}`, colors.reset);
    log(`   Organizaciones: ${stats.organizations}`, colors.reset);
    log(`   Ventas:         ${stats.sales}`, colors.reset);
    log(`   Productos:      ${stats.products}\n`, colors.reset);

    // 6. Ejecutar backup
    log('🔄 Ejecutando backup...', colors.blue);
    const startTime = Date.now();

    await execAsync(pgDumpCmd);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`✅ Backup completado en ${duration}s\n`, colors.green);

    // 7. Verificar archivo creado
    if (!fs.existsSync(filepath)) {
      throw new Error('El archivo de backup no fue creado');
    }

    const fileStats = fs.statSync(filepath);
    const fileSize = formatBytes(fileStats.size);

    log('📦 Información del backup:', colors.blue);
    log(`   Archivo:  ${filename}`, colors.reset);
    log(`   Ruta:     ${filepath}`, colors.reset);
    log(`   Tamaño:   ${fileSize}`, colors.reset);
    log(`   Fecha:    ${fileStats.mtime.toLocaleString()}\n`, colors.reset);

    // 8. Crear archivo de metadatos
    const metadataFilename = filename.replace(extension, '.json');
    const metadataPath = path.join(config.outputDir, metadataFilename);

    const metadata = {
      filename,
      filepath,
      timestamp: new Date().toISOString(),
      database: dbConfig.database,
      host: dbConfig.host,
      size: fileStats.size,
      sizeFormatted: fileSize,
      schemaOnly: config.schemaOnly,
      dataOnly: config.dataOnly,
      compressed: config.compress,
      statistics: stats,
      durationSeconds: parseFloat(duration),
    };

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    log(`📋 Metadatos guardados: ${metadataFilename}\n`, colors.green);

    // 9. Listar backups existentes
    const backupFiles = fs.readdirSync(config.outputDir)
      .filter(f => f.endsWith('.sql') || f.endsWith('.sql.gz'))
      .sort()
      .reverse();

    if (backupFiles.length > 1) {
      log('📚 Backups existentes:', colors.blue);
      backupFiles.slice(0, 5).forEach(file => {
        const stat = fs.statSync(path.join(config.outputDir, file));
        const size = formatBytes(stat.size);
        const isCurrent = file === filename ? ' ← ACTUAL' : '';
        log(`   ${file} (${size})${isCurrent}`, colors.reset);
      });

      if (backupFiles.length > 5) {
        log(`   ... y ${backupFiles.length - 5} más`, colors.reset);
      }
      log('', colors.reset);
    }

    // 10. Recomendaciones
    log('💡 Recomendaciones:', colors.cyan);
    log(`   1. Verificar el backup: psql < ${filepath}`, colors.reset);
    log(`   2. Guardar en lugar seguro (cloud storage)`, colors.reset);
    log(`   3. Probar restauración en staging`, colors.reset);
    log(`   4. Mantener múltiples backups (rotación)\n`, colors.reset);

    // 11. Comando de restauración
    log('🔄 Para restaurar este backup:', colors.yellow);
    if (config.compress) {
      log(`   gunzip -c ${filepath} | psql -h ${dbConfig.host} -U ${dbConfig.username} -d ${dbConfig.database}\n`, colors.cyan);
    } else {
      log(`   psql -h ${dbConfig.host} -U ${dbConfig.username} -d ${dbConfig.database} < ${filepath}\n`, colors.cyan);
    }

    log('✅ Backup completado exitosamente\n', colors.green);

    return {
      success: true,
      filepath,
      size: fileSize,
      metadata,
    };
  } catch (error) {
    log(`\n❌ Error creando backup: ${error}`, colors.red);
    if (error instanceof Error && error.message.includes('pg_dump')) {
      log('\n💡 Asegúrate de tener PostgreSQL client tools instalado:', colors.yellow);
      log('   - Ubuntu/Debian: sudo apt-get install postgresql-client', colors.reset);
      log('   - macOS: brew install postgresql', colors.reset);
      log('   - Windows: Descargar desde postgresql.org\n', colors.reset);
    }
    throw error;
  }
}

// ============================================
// FUNCIÓN DE LIMPIEZA DE BACKUPS ANTIGUOS
// ============================================

async function cleanupOldBackups(keepLast = 10) {
  log('\n🧹 Limpiando backups antiguos...', colors.blue);

  try {
    const backupFiles = fs.readdirSync(config.outputDir)
      .filter(f => f.startsWith('pos-system-backup-') && (f.endsWith('.sql') || f.endsWith('.sql.gz')))
      .map(f => ({
        name: f,
        path: path.join(config.outputDir, f),
        mtime: fs.statSync(path.join(config.outputDir, f)).mtime,
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    if (backupFiles.length <= keepLast) {
      log(`   ℹ️  Solo hay ${backupFiles.length} backups, no se elimina ninguno\n`, colors.yellow);
      return;
    }

    const toDelete = backupFiles.slice(keepLast);
    log(`   🗑️  Eliminando ${toDelete.length} backups antiguos:`, colors.yellow);

    for (const file of toDelete) {
      fs.unlinkSync(file.path);
      log(`      - ${file.name}`, colors.reset);

      // Eliminar archivo de metadatos asociado
      const metadataPath = file.path.replace(/\.sql(\.gz)?$/, '.json');
      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }
    }

    log(`\n   ✅ ${toDelete.length} backups eliminados, ${keepLast} conservados\n`, colors.green);
  } catch (error) {
    log(`   ⚠️  Error en limpieza: ${error}\n`, colors.red);
  }
}

// ============================================
// EJECUTAR SCRIPT
// ============================================

async function main() {
  try {
    const result = await backupDatabase();

    // Limpiar backups antiguos (mantener últimos 10)
    if (process.argv.includes('--cleanup')) {
      await cleanupOldBackups(10);
    }

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

export { backupDatabase, cleanupOldBackups };
