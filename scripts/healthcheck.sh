#!/bin/bash
# ============================================================
# FACILITO — healthcheck.sh
# Test rápido de todo: HTTPS, backend, frontend, DB.
#
# Uso:  /opt/facilito/scripts/healthcheck.sh
#       (alias: hc)
#
# Es una versión compacta de diagnose.sh: solo OK/FAIL, sin
# detalles. Útil para monitoreo o cuando querés un vistazo rápido.
# ============================================================

set +e

GRN='\033[1;32m'; RED='\033[1;31m'; BLU='\033[1;34m'; NC='\033[0m'

echo ""
echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLU}  FACILITO — Healthcheck${NC}"
echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo ""

FAIL=0

# HTTPS
CODE=$(curl -k -s -o /dev/null -w "%{http_code}" --max-time 5 https://localhost/ 2>/dev/null)
if [ "$CODE" = "200" ] || [ "$CODE" = "307" ] || [ "$CODE" = "308" ]; then
  echo -e "  ${GRN}✔${NC} nginx HTTPS ($CODE)"
else
  echo -e "  ${RED}✘${NC} nginx HTTPS ($CODE)"; FAIL=1
fi

# Backend
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3000/ 2>/dev/null)
if [ "$CODE" != "000" ]; then
  echo -e "  ${GRN}✔${NC} backend ($CODE)"
else
  echo -e "  ${RED}✘${NC} backend"; FAIL=1
fi

# Frontend
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:3001/ 2>/dev/null)
if [ "$CODE" != "000" ]; then
  echo -e "  ${GRN}✔${NC} frontend ($CODE)"
else
  echo -e "  ${RED}✘${NC} frontend"; FAIL=1
fi

# Postgres
PG_RES=$(docker exec -i facilito_postgres psql -U facilito_admin -d facilito_db -tAc "SELECT 1;" 2>/dev/null)
if [ "$PG_RES" = "1" ]; then
  echo -e "  ${GRN}✔${NC} postgres"
else
  echo -e "  ${RED}✘${NC} postgres"; FAIL=1
fi

echo ""
if [ "$FAIL" = "0" ]; then
  echo -e "${GRN}  Todo OK${NC}"
  exit 0
else
  echo -e "${RED}  Hay fallas. Corré: diag${NC}"
  exit 1
fi
