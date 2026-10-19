#!/bin/bash
# ============================================================
# FACILITO — fix-double-api.sh
# Corrige URLs con /api/api/ duplicado en tenants.
#
# Uso:  /opt/facilito/scripts/fix-double-api.sh
#       (alias: fixapi)
#
# Revisa tenants.logo_url y tenants.banner_url. Si encuentran
# /api/api/, lo reemplazan por /api/.
# ============================================================

set +e

YEL='\033[1;33m'; GRN='\033[1;32m'; RED='\033[1;31m'; BLU='\033[1;34m'; DIM='\033[2m'; NC='\033[0m'
ok()   { echo -e "  ${GRN}✔${NC} $1"; }
err()  { echo -e "  ${RED}✘${NC} $1"; }
info() { echo -e "  ${DIM}$1${NC}"; }

echo ""
echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLU}  FACILITO — Corregir /api/api/ en tenants${NC}"
echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo ""

# ----- 1. Diagnóstico -----
echo -e "${YEL}[1/2]${NC} Buscando tenants con /api/api/"
docker exec -i facilito_postgres psql -U facilito_admin -d facilito_db -c "
SELECT slug,
       CASE WHEN logo_url   LIKE '%/api/api/%' THEN 'SÍ' ELSE 'no' END AS logo_dup,
       CASE WHEN banner_url LIKE '%/api/api/%' THEN 'SÍ' ELSE 'no' END AS banner_dup
FROM tenants
WHERE logo_url LIKE '%/api/api/%' OR banner_url LIKE '%/api/api/%';"

COUNT=$(docker exec -i facilito_postgres psql -U facilito_admin -d facilito_db -tAc \
  "SELECT COUNT(*) FROM tenants WHERE logo_url LIKE '%/api/api/%' OR banner_url LIKE '%/api/api/%';")

if [ "$COUNT" = "0" ] || [ -z "$COUNT" ]; then
  ok "no hay tenants con /api/api/ (nada que corregir)"
  echo ""
  exit 0
fi
echo ""
info "$COUNT tenant(s) para corregir"
echo ""

# ----- 2. Fix -----
echo -e "${YEL}[2/2]${NC} Corrigiendo"
docker exec -i facilito_postgres psql -U facilito_admin -d facilito_db -c "
UPDATE tenants
SET logo_url = REPLACE(logo_url, '/api/api/', '/api/')
WHERE logo_url LIKE '%/api/api/%';

UPDATE tenants
SET banner_url = REPLACE(banner_url, '/api/api/', '/api/')
WHERE banner_url LIKE '%/api/api/%';"

echo ""
ok "corrección aplicada"
echo ""

# ----- 3. Verificación -----
echo -e "${YEL}▶ Verificando${NC}"
COUNT2=$(docker exec -i facilito_postgres psql -U facilito_admin -d facilito_db -tAc \
  "SELECT COUNT(*) FROM tenants WHERE logo_url LIKE '%/api/api/%' OR banner_url LIKE '%/api/api/%';")

if [ "$COUNT2" = "0" ]; then
  ok "ya no quedan tenants con /api/api/"
else
  err "quedan $COUNT2 tenant(s) con /api/api/"
fi
echo ""
