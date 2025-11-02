#!/bin/bash

echo "🚀 Iniciando despliegue..."

# Actualizar código
echo "📥 Descargando cambios..."
git pull origin release

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
