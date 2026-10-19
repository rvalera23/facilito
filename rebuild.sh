#!/bin/bash
# ============================================================
# 🔥 Rebuild completo del frontend
# Uso: /opt/facilito/rebuild.sh
# ============================================================

#set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVICE="facilito-frontend.service"
PORT=3001
FRONTEND_DIR="/opt/facilito/apps/frontend"
LOG="/tmp/rebuild.log"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔄 Rebuild completo del frontend${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# 0. Sanity check
if [ ! -d "$FRONTEND_DIR" ]; then
  echo -e "${RED}❌ No existe $FRONTEND_DIR${NC}"
  exit 1
fi

cd "$FRONTEND_DIR" || exit 1

# 1. Parar servicio
echo -e "${YELLOW}[1/5] Parando servicio...${NC}"
systemctl stop "$SERVICE" 2>/dev/null || true
sleep 2

# 2. Verificar que nada escucha en 3001
if ss -tlnp 2>/dev/null | grep -q ":$PORT"; then
  echo -e "${YELLOW}[2/5] Matando proceso zombie en $PORT...${NC}"
  fuser -k $PORT/tcp 2>/dev/null || true
  sleep 2
else
  echo -e "${GREEN}[2/5] Puerto $PORT libre${NC}"
fi

# 3. Borrar .next y rebuild
echo -e "${YELLOW}[3/5] Borrando .next y rebuild...${NC}"
rm -rf .next

npm run build > "$LOG" 2>&1
BUILD_EXIT=$?

if [ $BUILD_EXIT -ne 0 ]; then
  echo -e "${RED}❌ Build falló (exit $BUILD_EXIT). Revisá $LOG${NC}"
  tail -30 "$LOG"
  exit 1
fi

if [ ! -f ".next/BUILD_ID" ]; then
  echo -e "${RED}❌ Build terminó pero no generó .next/BUILD_ID${NC}"
  tail -30 "$LOG"
  exit 1
fi

echo -e "${GREEN}✅ Build OK${NC}"

# 4. Arrancar servicio
echo -e "${YELLOW}[4/5] Arrancando servicio...${NC}"
systemctl start "$SERVICE"
sleep 4

# 5. Verificación final
if systemctl is-active --quiet "$SERVICE"; then
  echo -e "${GREEN}✅ Servicio corriendo${NC}"

  # Healthcheck con reintentos (Next tarda en levantar)
  echo -e "${YELLOW}[5/5] Esperando a que responda en :$PORT...${NC}"
  HTTP_CODE="000"
  for i in 1 2 3 4 5 6 7 8; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "http://localhost:$PORT/" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" != "000" ]; then
      break
    fi
    sleep 1
  done

  if [ "$HTTP_CODE" = "000" ]; then
    echo -e "${YELLOW}⚠️  No respondió tras 8s (puede estar inicializando lento)${NC}"
  else
    echo -e "${GREEN}✅ Responde HTTP $HTTP_CODE${NC}"
  fi

  echo ""
  echo "Puerto $PORT escuchando en:"
  ss -tlnp 2>/dev/null | grep ":$PORT" | awk '{print "  → "$4}' | head -2
  echo ""
  echo "Chunks que sirve:"
  curl -s "http://localhost:$PORT/" | grep -o '/_next/static/chunks/[^"]*\.js' | head -2
  echo ""
  echo "Chunks en disco:"
  ls .next/static/chunks/ 2>/dev/null | head -2 | sed 's/^/  → /'
  echo ""
  echo "Build ID:"
  echo "  → $(cat .next/BUILD_ID 2>/dev/null)"
  echo ""

  # ─────────────── COMANDOS ÚTILES ───────────────
  echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  📋 COMANDOS ÚTILES${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "  ${YELLOW}Estado del servicio:${NC}"
  echo -e "    systemctl status $SERVICE --no-pager | head -6"
  echo ""
  echo -e "  ${YELLOW}Logs en vivo:${NC}"
  echo -e "    journalctl -u $SERVICE -f"
  echo ""
  echo -e "  ${YELLOW}Últimas 30 líneas de log:${NC}"
  echo -e "    journalctl -u $SERVICE -n 30 --no-pager"
  echo ""
  echo -e "  ${YELLOW}Log de errores:${NC}"
  echo -e "    tail -50 /var/log/facilito-frontend.error.log"
  echo ""
  echo -e "  ${YELLOW}Probar el frontend:${NC}"
  echo -e "    curl -I http://localhost:$PORT/"
  echo ""
  echo -e "  ${YELLOW}Ver puerto ocupado:${NC}"
  echo -e "    ss -tlnp | grep $PORT"
  echo ""
  echo -e "  ${YELLOW}Log del build:${NC}"
  echo -e "    cat $LOG"
  echo ""
  echo -e "${GREEN}🎉 Rebuild frontend completo. Recargá el navegador con Ctrl+Shift+R${NC}"
  echo ""
else
  echo -e "${RED}❌ Servicio no arrancó${NC}"
  journalctl -u "$SERVICE" -n 30 --no-pager
  exit 1
fi
