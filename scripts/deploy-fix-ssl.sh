#!/bin/bash

###############################################################################
# DEPLOYMENT SCRIPT - Fix SSL Database Connection
###############################################################################
# Este script actualiza la aplicación en producción con el fix de SSL
#
# Uso:
#   chmod +x scripts/deploy-fix-ssl.sh
#   ./scripts/deploy-fix-ssl.sh
###############################################################################

set -e  # Exit on error

echo "🚀 Iniciando deployment del fix SSL..."
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Variables
APP_NAME="pos-system-client"
APP_DIR="/home/ubuntu/pos-system-client"  # Ajustar según tu ruta

###############################################################################
# 1. VERIFICAR QUE ESTAMOS EN EL DIRECTORIO CORRECTO
###############################################################################
echo -e "${YELLOW}[1/7]${NC} Verificando directorio..."
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: No se encuentra package.json${NC}"
    echo "Por favor ejecuta este script desde la raíz del proyecto"
    exit 1
fi
echo -e "${GREEN}✓${NC} Directorio correcto"
echo ""

###############################################################################
# 2. INSTALAR DEPENDENCIAS
###############################################################################
echo -e "${YELLOW}[2/7]${NC} Instalando dependencias..."
pnpm install
echo -e "${GREEN}✓${NC} Dependencias instaladas"
echo ""

###############################################################################
# 3. GENERAR PRISMA CLIENT
###############################################################################
echo -e "${YELLOW}[3/7]${NC} Generando Prisma client..."
npx prisma generate
echo -e "${GREEN}✓${NC} Prisma client generado"
echo ""

###############################################################################
# 4. BUILD DE PRODUCCIÓN
###############################################################################
echo -e "${YELLOW}[4/7]${NC} Construyendo aplicación..."
pnpm build
echo -e "${GREEN}✓${NC} Build completado"
echo ""

###############################################################################
# 5. VERIFICAR VARIABLES DE ENTORNO
###############################################################################
echo -e "${YELLOW}[5/7]${NC} Verificando variables de entorno..."
echo ""
echo "Por favor verifica que el archivo .env tenga:"
echo "  DATABASE_URL=\"postgresql://user:pass@localhost:5432/db?sslmode=disable\""
echo "  DIRECT_URL=\"postgresql://user:pass@localhost:5432/db?sslmode=disable\""
echo "  JWT_SECRET=\"tu_secret\""
echo "  HTTPS_ENABLED=\"true\""
echo ""
read -p "¿Las variables de entorno están configuradas correctamente? (y/n): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo -e "${RED}❌ Deployment cancelado${NC}"
    echo "Por favor configura las variables de entorno en .env antes de continuar"
    exit 1
fi
echo -e "${GREEN}✓${NC} Variables de entorno verificadas"
echo ""

###############################################################################
# 6. COPIAR ARCHIVOS AL SERVIDOR (si es necesario)
###############################################################################
echo -e "${YELLOW}[6/7]${NC} ¿Deseas copiar archivos al servidor?"
echo "Si ya estás en el servidor, selecciona 'n'"
read -p "¿Copiar archivos? (y/n): " copy_files

if [ "$copy_files" = "y" ] || [ "$copy_files" = "Y" ]; then
    read -p "Ingresa el host del servidor (ej: user@ip): " server_host

    echo "Copiando archivos al servidor..."

    # Archivos a copiar
    rsync -avz --progress \
        --exclude 'node_modules' \
        --exclude '.next' \
        --exclude '.git' \
        --exclude 'docs' \
        --exclude 'scripts' \
        ./ $server_host:$APP_DIR/

    echo -e "${GREEN}✓${NC} Archivos copiados"

    # Ejecutar comandos en el servidor
    echo "Ejecutando comandos en el servidor..."
    ssh $server_host << 'ENDSSH'
        cd /home/ubuntu/pos-system-client

        # Instalar dependencias
        pnpm install

        # Generar Prisma client
        npx prisma generate

        # Build
        pnpm build

        # Reiniciar PM2
        pm2 restart all --update-env

        # Ver logs
        pm2 logs --lines 20
ENDSSH

    echo -e "${GREEN}✓${NC} Deployment remoto completado"
else
    echo -e "${GREEN}✓${NC} Saltando copia de archivos"
fi
echo ""

###############################################################################
# 7. REINICIAR PM2 (si estamos en el servidor)
###############################################################################
if [ "$copy_files" != "y" ] && [ "$copy_files" != "Y" ]; then
    echo -e "${YELLOW}[7/7]${NC} Reiniciando PM2..."

    # Verificar si PM2 está instalado
    if ! command -v pm2 &> /dev/null; then
        echo -e "${RED}❌ Error: PM2 no está instalado${NC}"
        exit 1
    fi

    # Reiniciar aplicación
    pm2 restart all --update-env

    echo -e "${GREEN}✓${NC} PM2 reiniciado"
    echo ""

    # Mostrar logs
    echo -e "${YELLOW}📋 Logs de la aplicación:${NC}"
    pm2 logs --lines 30
fi

###############################################################################
# FINALIZADO
###############################################################################
echo ""
echo -e "${GREEN}✅ DEPLOYMENT COMPLETADO${NC}"
echo ""
echo "Próximos pasos:"
echo "1. Verifica que la aplicación esté corriendo: pm2 status"
echo "2. Revisa los logs: pm2 logs"
echo "3. Prueba el login desde el navegador"
echo "4. Si hay errores, busca 'Original error:' en los logs"
echo ""
