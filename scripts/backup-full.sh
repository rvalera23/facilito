#!/bin/bash
# ============================================================
# FACILITO — backup-full.sh
# Backup completo: DB + código + config nginx.
#
# Uso:  /opt/facilito/scripts/backup-full.sh
#       (alias: bkfull)
#
# Deja en /opt/facilito/backups/:
#   db_YYYYMMDD_HHMMSS.sql
#   apps_YYYYMMDD_HHMMSS.tar.gz
#   nginx_YYYYMMDD_HHMMSS/
# ============================================================

set +e

YEL='\033[1;33m'; GRN='\033[1;32m'; RED='\033[1;31m'; BLU='\033[1;34m'; DIM='\033[2m'; NC='\033[0m'
ok()   { echo -e "  ${GRN}✔${NC} $1"; }
err()  { echo -e "  ${RED}✘${NC} $1"; }
info() { echo -e "  ${DIM}$1${NC}"; }

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BK_DIR="/opt/facilito/backups"

echo ""
echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLU}  FACILITO — Backup completo${NC}"
echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo ""

mkdir -p "$BK_DIR"

# ----- 1. DB -----
echo -e "${YEL}[1/3]${NC} Base de datos"
DB_FILE="$BK_DIR/db_${TIMESTAMP}.sql"
docker exec facilito_postgres pg_dump -U facilito_admin facilito_db > "$DB_FILE"
if [ $? -ne 0 ] || [ ! -s "$DB_FILE" ]; then
  err "falló el dump de la DB"
  exit 1
fi
ok "DB: $DB_FILE ($(du -h "$DB_FILE" | cut -f1))"
echo ""

# ----- 2. Código -----
echo -e "${YEL}[2/3]${NC} Código de apps/"
APPS_FILE="$BK_DIR/apps_${TIMESTAMP}.tar.gz"
info "comprimiendo /opt/facilito/apps (esto puede tardar)..."
tar -czf "$APPS_FILE" \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='dist' \
  --exclude='.turbo' \
  /opt/facilito/apps 2>/dev/null
if [ $? -ne 0 ] || [ ! -s "$APPS_FILE" ]; then
  err "falló el tar del código"
  exit 1
fi
ok "Código: $APPS_FILE ($(du -h "$APPS_FILE" | cut -f1))"
echo ""

# ----- 3. nginx -----
echo -e "${YEL}[3/3]${NC} Config nginx"
NGINX_DIR="$BK_DIR/nginx_${TIMESTAMP}"
mkdir -p "$NGINX_DIR"
cp -r /etc/nginx/sites-available "$NGINX_DIR/" 2>/dev/null
cp -r /etc/nginx/sites-enabled "$NGINX_DIR/" 2>/dev/null
ok "nginx: $NGINX_DIR"
echo ""

echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLU}  Backup completo OK${NC}"
echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${DIM}Archivos en $BK_DIR con timestamp $TIMESTAMP${NC}"
echo ""
