#!/bin/bash

###############################################################################
# QUICK RESTART - Reinicio rápido de PM2 con nuevas variables de entorno
###############################################################################
# Este script solo reinicia PM2 para aplicar cambios de .env
# Usar después de modificar DATABASE_URL en .env
#
# Uso:
#   chmod +x scripts/quick-restart-pm2.sh
#   ./scripts/quick-restart-pm2.sh
###############################################################################

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔄 Reinicio rápido de PM2...${NC}"
echo ""

# Verificar si PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ Error: PM2 no está instalado${NC}"
    exit 1
fi

# Mostrar configuración actual
echo -e "${YELLOW}📋 Estado actual de PM2:${NC}"
pm2 status
echo ""

# Verificar variables de entorno
echo -e "${YELLOW}🔍 Verificando variables de entorno críticas...${NC}"
if grep -q "sslmode" .env; then
    echo -e "${GREEN}✓${NC} DATABASE_URL contiene configuración SSL"
else
    echo -e "${YELLOW}⚠${NC}  Advertencia: DATABASE_URL no tiene parámetro sslmode"
    echo "    Asegúrate de agregar ?sslmode=disable o ?sslmode=prefer"
fi

if grep -q "JWT_SECRET" .env; then
    echo -e "${GREEN}✓${NC} JWT_SECRET configurado"
else
    echo -e "${YELLOW}⚠${NC}  Advertencia: JWT_SECRET no encontrado en .env"
fi

if grep -q "HTTPS_ENABLED" .env; then
    echo -e "${GREEN}✓${NC} HTTPS_ENABLED configurado"
else
    echo -e "${YELLOW}⚠${NC}  Advertencia: HTTPS_ENABLED no encontrado en .env"
fi
echo ""

# Confirmar reinicio
read -p "¿Deseas reiniciar PM2 con las nuevas variables? (y/n): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Reinicio cancelado"
    exit 0
fi

# Reiniciar PM2 con actualización de variables
echo -e "${YELLOW}🔄 Reiniciando PM2...${NC}"
pm2 restart all --update-env

echo -e "${GREEN}✅ PM2 reiniciado correctamente${NC}"
echo ""

# Mostrar logs
echo -e "${YELLOW}📋 Últimos logs:${NC}"
pm2 logs --lines 30 --nostream

echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Reinicio completado${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""
echo "Comandos útiles:"
echo "  pm2 status          - Ver estado de aplicaciones"
echo "  pm2 logs            - Ver logs en tiempo real"
echo "  pm2 logs --err      - Ver solo errores"
echo "  pm2 logs --lines 50 - Ver últimas 50 líneas"
echo ""
