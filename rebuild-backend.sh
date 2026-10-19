#!/bin/bash
# ============================================================
# FACILITO - Rebuild Backend (NestJS)
# ============================================================
# Para el servicio, limpia build viejo, recompila con Nest,
# verifica que el dist/main.js exista y arranca el servicio.
#
# Uso:   /opt/facilito/rebuild-backend.sh
# Log:   /tmp/rebuild-backend.log
# ============================================================

set -o pipefail

# ---------- Config ----------
BACKEND_DIR="/opt/facilito/apps/backend"
SERVICE="facilito-backend.service"
PORT=3000
LOG="/tmp/rebuild-backend.log"
PKG_MANAGER="pnpm"   # cambiá a "npm" si usás npm

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $*" | tee -a "$LOG"; }
ok()   { echo -e "${GREEN}✅ $*${NC}" | tee -a "$LOG"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}" | tee -a "$LOG"; }
err()  { echo -e "${RED}❌ $*${NC}" | tee -a "$LOG"; }

# Reinicia el log
echo "===== REBUILD BACKEND $(date) =====" > "$LOG"

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║        FACILITO - REBUILD BACKEND (NestJS)           ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ---------- 0. Sanity checks ----------
if [ ! -d "$BACKEND_DIR" ]; then
  err "No existe $BACKEND_DIR"
  exit 1
fi

cd "$BACKEND_DIR" || exit 1

if [ ! -f "package.json" ]; then
  err "No hay package.json en $BACKEND_DIR"
  exit 1
fi

# ---------- 1. Parar servicio ----------
log "1/7 Parando $SERVICE..."
systemctl stop "$SERVICE" 2>/dev/null
sleep 1
ok "Servicio detenido."

# ---------- 2. Matar zombies en el puerto 3000 ----------
log "2/7 Limpiando procesos zombie en puerto $PORT..."
ZOMBIES=$(ss -tlnp 2>/dev/null | grep ":$PORT " | grep -oP 'pid=\K[0-9]+' | sort -u)
if [ -n "$ZOMBIES" ]; then
  for pid in $ZOMBIES; do
    warn "Matando PID $pid en puerto $PORT"
    kill -9 "$pid" 2>/dev/null
  done
  sleep 1
else
  ok "Puerto $PORT libre."
fi

# Doble check con pgrep (por si quedó algún node huérfano del backend)
pgrep -af "node.*dist/main" | awk '{print $1}' | while read -r pid; do
  warn "Matando node huérfano PID $pid"
  kill -9 "$pid" 2>/dev/null
done

# ---------- 3. Limpiar build viejo ----------
log "3/7 Borrando dist/ viejo..."
if [ -d "dist" ]; then
  rm -rf dist
  ok "dist/ eliminado."
else
  ok "No había dist/ previo."
fi

# ---------- 4. Rebuild ----------
log "4/7 Compilando con Nest ($PKG_MANAGER run build)..."
START=$(date +%s)

if ! $PKG_MANAGER run build >> "$LOG" 2>&1; then
  err "El build falló. Últimas líneas del log:"
  tail -40 "$LOG"
  exit 1
fi

END=$(date +%s)
DUR=$((END - START))
ok "Build OK en ${DUR}s."

# ---------- 5. Verificar artefacto ----------
log "5/7 Verificando dist/main.js..."
if [ ! -f "dist/main.js" ]; then
  err "No se generó dist/main.js. Algo falló silenciosamente."
  tail -40 "$LOG"
  exit 1
fi
ok "dist/main.js presente ($(du -h dist/main.js | cut -f1))."

# ---------- 6. Arrancar servicio ----------
log "6/7 Arrancando $SERVICE..."
systemctl start "$SERVICE"
sleep 3

if ! systemctl is-active --quiet "$SERVICE"; then
  err "El servicio NO quedó activo. Logs:"
  journalctl -u "$SERVICE" -n 30 --no-pager
  exit 1
fi
ok "Servicio activo."

# ---------- 7. Healthcheck ----------
log "7/7 Healthcheck en http://localhost:$PORT/ ..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:$PORT/" || echo "000")

if [ "$HTTP_CODE" = "000" ]; then
  warn "No respondió en 5s. Puede estar inicializando. Revisá:"
  echo "   journalctl -u $SERVICE -n 30 --no-pager"
elif [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 500 ]; then
  ok "Backend responde HTTP $HTTP_CODE."
else
  warn "Backend responde HTTP $HTTP_CODE (revisar logs)."
fi

# ---------- Resumen ----------
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗"
echo -e "║              ✅ REBUILD BACKEND COMPLETO             ║"
echo -e "╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Servicio:   $(systemctl is-active $SERVICE)"
echo "  Puerto:     $(ss -tlnp 2>/dev/null | grep ":$PORT " | head -1 | awk '{print $4}')"
echo "  dist/main:  $(ls -la dist/main.js 2>/dev/null | awk '{print $5" bytes  "$6" "$7" "$8}')"
echo "  Log:        $LOG"
echo ""
echo -e "${YELLOW}  Comandos útiles:${NC}"
echo "    systemctl status $SERVICE --no-pager | head -6"
echo "    journalctl -u $SERVICE -n 30 --no-pager"
echo "    curl -I http://localhost:$PORT/"
echo ""
