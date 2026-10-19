#!/bin/bash
# ============================================================
# 🔥 Script de cambio de IP para Facilito
# Uso: ./cambiar-ip.sh NUEVA_IP
# Ejemplo: ./cambiar-ip.sh 172.16.35.142
# ============================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ------------------------------------------------------------
# Validaciones
# ------------------------------------------------------------
if [ -z "$1" ]; then
  echo -e "${RED}❌ Error: Falta la IP nueva${NC}"
  echo "Uso: $0 NUEVA_IP"
  echo "Ejemplo: $0 172.16.35.142"
  exit 1
fi

NUEVA_IP="$1"

# Validar formato de IP
if ! [[ "$NUEVA_IP" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
  echo -e "${RED}❌ Error: IP inválida: $NUEVA_IP${NC}"
  echo "Debe ser formato IPv4: 172.16.35.142"
  exit 1
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔄 Cambio de IP de Facilito → $NUEVA_IP${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# ------------------------------------------------------------
# 1. Regenerar certificado SSL con la nueva IP
# ------------------------------------------------------------
echo -e "${YELLOW}[1/4] Regenerando certificado SSL...${NC}"
cd /etc/nginx/certs

# Backup del cert actual
cp facilito.pem "facilito.pem.bak-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
cp facilito-key.pem "facilito-key.pem.bak-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true

# Regenerar con la nueva IP + localhost
mkcert -cert-file facilito.pem -key-file facilito-key.pem \
  "$NUEVA_IP" \
  localhost \
  127.0.0.1 \
  ::1

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Error al regenerar el certificado${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Certificado regenerado con SAN: $NUEVA_IP${NC}"
echo ""

# ------------------------------------------------------------
# 2. Verificar que nginx acepta cualquier IP
# ------------------------------------------------------------
echo -e "${YELLOW}[2/4] Verificando configuración de nginx...${NC}"

if ! grep -q "server_name _;" /etc/nginx/sites-available/facilito; then
  echo -e "${YELLOW}⚠️  nginx no tiene 'server_name _'. Lo agrego...${NC}"
  # Reemplazar cualquier server_name con IP por "_"
  sed -i "s/server_name .*;/server_name _;/g" /etc/nginx/sites-available/facilito
fi

# Recargar nginx
if nginx -t 2>&1 | grep -q "syntax is ok"; then
  systemctl reload nginx
  echo -e "${GREEN}✅ nginx recargado${NC}"
else
  echo -e "${RED}❌ Error en la configuración de nginx. Corré 'nginx -t' para más detalle.${NC}"
  exit 1
fi
echo ""

# ------------------------------------------------------------
# 3. Verificar .env.local (solo si no está bien)
# ------------------------------------------------------------
echo -e "${YELLOW}[3/4] Verificando .env.local...${NC}"

ENV_FILE="/opt/facilito/apps/frontend/.env.local"
EXPECTED="NEXT_PUBLIC_API_URL=/api"

if [ ! -f "$ENV_FILE" ]; then
  echo -e "${YELLOW}⚠️  No existe $ENV_FILE. Lo creo...${NC}"
  echo "$EXPECTED" > "$ENV_FILE"
else
  if grep -q "^NEXT_PUBLIC_API_URL=/api$" "$ENV_FILE"; then
    echo -e "${GREEN}✅ .env.local ya tiene NEXT_PUBLIC_API_URL=/api${NC}"
  else
    echo -e "${YELLOW}⚠️  Corrigiendo NEXT_PUBLIC_API_URL en .env.local...${NC}"
    sed -i "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=/api|" "$ENV_FILE"
    if ! grep -q "^NEXT_PUBLIC_API_URL=" "$ENV_FILE"; then
      echo "$EXPECTED" >> "$ENV_FILE"
    fi
    echo -e "${GREEN}✅ .env.local corregido${NC}"
  fi
fi
echo ""

# ------------------------------------------------------------
# 4. Reiniciar frontend para que confíe en el nuevo cert
# ------------------------------------------------------------
echo -e "${YELLOW}[4/4] Reiniciando frontend...${NC}"

# Parar servicio
systemctl stop facilito-frontend.service 2>/dev/null || true

# Matar procesos zombie por si acaso
pkill -9 -f "next-server" 2>/dev/null || true
pkill -9 -f "next start" 2>/dev/null || true
sleep 2

# Arrancar limpio
systemctl start facilito-frontend.service
sleep 3

if systemctl is-active --quiet facilito-frontend.service; then
  echo -e "${GREEN}✅ Frontend corriendo${NC}"
else
  echo -e "${RED}❌ El frontend no arrancó. Revisá: journalctl -u facilito-frontend.service -n 30${NC}"
  exit 1
fi
echo ""

# ------------------------------------------------------------
# Resumen final
# ------------------------------------------------------------
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Listo. Cambio de IP completado.${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo "IP nueva: $NUEVA_IP"
echo ""
echo "Verificaciones:"
echo "  - Certificado SSL:"
openssl x509 -in /etc/nginx/certs/facilito.pem -noout -text | grep -A1 "Subject Alternative Name" | tail -1
echo ""
echo "  - Frontend escuchando en 3001:"
ss -tlnp | grep 3001 || echo "    ⚠️  Nada escuchando en 3001"
echo ""
echo "  - Test HTTPS:"
curl -kI "https://$NUEVA_IP/" 2>&1 | head -1 || echo "    ⚠️  No responde"
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo "Abrí el navegador en: https://$NUEVA_IP/"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
