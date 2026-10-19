#!/bin/bash
# ============================================================
# FACILITO — backup-db.sh
# Backup de la base de datos con timestamp + verificación.
#
# Uso:  /opt/facilito/scripts/backup-db.sh
#       (alias: bkdb)
#
# El backup queda en /opt/facilito/backups/db_YYYYMMDD_HHMMSS.sql
# ============================================================

set +e

YEL='\033[1;33m'; GRN='\033[1;32m'; RED='\033[1;31m'; BLU='\033[1;34m'; DIM='\033[2m'; NC='\033[0m'
ok()   { echo -e "  ${GRN}✔${NC} $1"; }
err()  { echo -e "  ${RED}✘${NC} $1"; }
info() { echo -e "  ${DIM}$1${NC}"; }

echo ""
echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLU}  FACILITO — Backup de la base de datos${NC}"
echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo ""

# ----- 1. Crear directorio -----
echo -e "${YEL}[1/4]${NC} Creando directorio de backups"
mkdir -p /opt/facilito/backups
ok "/opt/facilito/backups listo"
echo ""

# ----- 2. Verificar Postgres -----
echo -e "${YEL}[2/4]${NC} Verificando Postgres"
PG_RES=$(docker exec -i facilito_postgres psql -U facilito_admin -d facilito_db -tAc "SELECT 1;" 2>/dev/null)
if [ "$PG_RES" != "1" ]; then
  err "Postgres NO responde"
  info "docker ps | grep postgres"
  exit 1
fi
ok "Postgres responde"
echo ""

# ----- 3. Hacer el dump -----
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILE="/opt/facilito/backups/db_${TIMESTAMP}.sql"

echo -e "${YEL}[3/4]${NC} Haciendo dump"
info "archivo: $FILE"
docker exec facilito_postgres pg_dump -U facilito_admin facilito_db > "$FILE"

if [ $? -ne 0 ]; then
  err "pg_dump falló"
  exit 1
fi
if [ ! -s "$FILE" ]; then
  err "archivo vacío, algo falló"
  exit 1
fi
ok "dump creado"
echo ""

# ----- 4. Verificar tamaño -----
echo -e "${YEL}[4/4]${NC} Verificando tamaño"
SIZE=$(du -h "$FILE" | cut -f1)
LINES=$(wc -l < "$FILE")
ok "tamaño: $SIZE, líneas: $LINES"

echo ""
echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLU}  Backup OK${NC}"
echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${DIM}Archivo: $FILE${NC}"
echo -e "${DIM}Restaurar: docker exec -i facilito_postgres psql -U facilito_admin facilito_db < $FILE${NC}"
echo ""
