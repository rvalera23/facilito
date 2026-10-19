#!/bin/bash
# ============================================================
# FACILITO — restart-backend.sh
# Reinicia el backend con healthcheck. NO rebuild.
#
# Uso:  /opt/facilito/scripts/restart-backend.sh
#       (alias: rb)
# ============================================================

set +e

YEL='\033[1;33m'; GRN='\033[1;32m'; RED='\033[1;31m'; BLU='\033[1;34m'; DIM='\033[2m'; NC='\033[0m'
ok()   { echo -e "  ${GRN}✔${NC} $1"; }
err()  { echo -e "  ${RED}✘${NC} $1"; }
info() { echo -e "  ${DIM}$1${NC}"; }

echo ""
echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLU}  FACILITO — Reiniciar backend${NC}"
echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YEL}[1/3]${NC} systemctl restart facilito-backend.service"
systemctl restart facilito-backend.service
if [ $? -eq 0 ]; then ok "reinicio enviado"; else err "falló el restart"; exit 1; fi
echo ""

echo -e "${YEL}[2/3]${NC} Esperando que el puerto 3000 escuche (max 8s)"
SUCCESS=0
for i in $(seq 1 8); do
  sleep 1
  if ss -tlnp 2>/dev/null | grep -q ':3000 '; then
    ok "puerto 3000 escuchando (${i}s)"
    SUCCESS=1
    break
  fi
  info "intento $i/8..."
done
if [ "$SUCCESS" -ne 1 ]; then
  err "puerto 3000 NO escuchó después de 8s"
  info "journalctl -u facilito-backend.service -n 20 --no-pager"
  exit 1
fi
echo ""

echo -e "${YEL}[3/3]${NC} Healthcheck HTTP"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3000/ 2>/dev/null)
if [ "$HTTP_CODE" != "000" ]; then
  ok "backend responde ($HTTP_CODE)"
else
  err "backend NO responde"
  info "journalctl -u facilito-backend.service -n 20 --no-pager"
  exit 1
fi
echo ""

echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLU}  Backend reiniciado OK${NC}"
echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo ""
