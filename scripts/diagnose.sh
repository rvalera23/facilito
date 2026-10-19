#!/bin/bash
# ============================================================
# FACILITO — diagnose.sh
# Diagnóstico rápido del estado de todos los servicios.
#
# Uso:  /opt/facilito/scripts/diagnose.sh
#       (o el alias `diag` si lo tenés en .bashrc)
#
# Chequea:
#   1. systemd: facilito-frontend, facilito-backend, nginx
#   2. Puertos 3000, 3001, 443 escuchando
#   3. HTTPS desde afuera (curl -k)
#   4. Backend HTTP interno
#   5. Frontend HTTP interno
#   6. Postgres (docker exec)
#   7. Últimos 5 errores del frontend (si hay)
# ============================================================

set +e  # no abortar en errores, queremos ver todo

# ----- Colores -----
YEL='\033[1;33m'
GRN='\033[1;32m'
RED='\033[1;31m'
BLU='\033[1;34m'
DIM='\033[2m'
NC='\033[0m'

ok()   { echo -e "  ${GRN}✔${NC} $1"; }
warn() { echo -e "  ${YEL}⚠${NC} $1"; }
err()  { echo -e "  ${RED}✘${NC} $1"; }
info() { echo -e "  ${DIM}$1${NC}"; }

echo ""
echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLU}  FACILITO — Diagnóstico de servicios${NC}"
echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo ""

# ----- 1. systemd -----
echo -e "${YEL}[1/7]${NC} systemd"
if systemctl is-active --quiet facilito-frontend.service; then
  ok "facilito-frontend.service activo"
else
  err "facilito-frontend.service NO activo"
  info "journalctl -u facilito-frontend.service -n 20 --no-pager"
fi
if systemctl is-active --quiet facilito-backend.service; then
  ok "facilito-backend.service activo"
else
  err "facilito-backend.service NO activo"
  info "journalctl -u facilito-backend.service -n 20 --no-pager"
fi
if systemctl is-active --quiet nginx; then
  ok "nginx activo"
else
  err "nginx NO activo"
fi
echo ""

# ----- 2. Puertos -----
echo -e "${YEL}[2/7]${NC} Puertos escuchando"
if ss -tlnp 2>/dev/null | grep -q ':3000 '; then
  ok "puerto 3000 (backend) escuchando"
else
  err "puerto 3000 NO escucha"
fi
if ss -tlnp 2>/dev/null | grep -q ':3001 '; then
  ok "puerto 3001 (frontend) escuchando"
else
  err "puerto 3001 NO escucha"
fi
if ss -tlnp 2>/dev/null | grep -q ':443 '; then
  ok "puerto 443 (nginx HTTPS) escuchando"
else
  err "puerto 443 NO escucha"
fi
echo ""

# ----- 3. HTTPS desde afuera -----
echo -e "${YEL}[3/7]${NC} HTTPS (nginx)"
HTTP_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" --max-time 5 https://localhost/ 2>/dev/null)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ] || [ "$HTTP_CODE" = "308" ]; then
  ok "HTTPS responde ($HTTP_CODE)"
else
  err "HTTPS devolvió $HTTP_CODE (o timeout)"
fi
echo ""

# ----- 4. Backend interno -----
echo -e "${YEL}[4/7]${NC} Backend HTTP interno"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3000/ 2>/dev/null)
if [ "$HTTP_CODE" != "000" ]; then
  ok "backend responde ($HTTP_CODE)"
else
  err "backend NO responde"
  info "journalctl -u facilito-backend.service -n 20 --no-pager"
fi
echo ""

# ----- 5. Frontend interno -----
echo -e "${YEL}[5/7]${NC} Frontend HTTP interno"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3001/ 2>/dev/null)
if [ "$HTTP_CODE" != "000" ]; then
  ok "frontend responde ($HTTP_CODE)"
else
  err "frontend NO responde"
  info "journalctl -u facilito-frontend.service -n 20 --no-pager"
fi
echo ""

# ----- 6. Postgres -----
echo -e "${YEL}[6/7]${NC} Postgres"
PG_RES=$(docker exec -i facilito_postgres psql -U facilito_admin -d facilito_db -tAc "SELECT 1;" 2>/dev/null)
if [ "$PG_RES" = "1" ]; then
  ok "Postgres responde"
else
  err "Postgres NO responde"
  info "docker ps | grep postgres"
fi
echo ""

# ----- 7. Errores recientes del frontend -----
echo -e "${YEL}[7/7]${NC} Errores recientes del frontend"
if [ -f /var/log/facilito-frontend.error.log ]; then
  ERR_COUNT=$(wc -l < /var/log/facilito-frontend.error.log 2>/dev/null || echo 0)
  if [ "$ERR_COUNT" -gt 0 ]; then
    warn "$ERR_COUNT líneas en facilito-frontend.error.log"
    info "tail -20 /var/log/facilito-frontend.error.log"
  else
    ok "sin errores recientes"
  fi
else
  ok "log de errores no existe (bien)"
fi
echo ""

echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLU}  Diagnóstico completo${NC}"
echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${DIM}Comandos útiles:${NC}"
echo -e "${DIM}  /opt/facilito/scripts/restart-frontend.sh   (alias: rf)${NC}"
echo -e "${DIM}  /opt/facilito/scripts/restart-backend.sh    (alias: rb)${NC}"
echo -e "${DIM}  /opt/facilito/scripts/logs.sh frontend      (alias: logs frontend)${NC}"
echo -e "${DIM}  /opt/facilito/scripts/logs.sh backend       (alias: logs backend)${NC}"
echo ""
