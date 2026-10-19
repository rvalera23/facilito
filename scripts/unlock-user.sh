#!/bin/bash
# ============================================================
# FACILITO — unlock-user.sh
# Desbloquea un usuario (resetea intentos fallidos y lockedUntil).
#
# Uso:  /opt/facilito/scripts/unlock-user.sh <email>
#       (alias: unlock <email>)
# ============================================================

set +e

RED='\033[1;31m'; GRN='\033[1;32m'; YEL='\033[1;33m'; BLU='\033[1;34m'; DIM='\033[2m'; NC='\033[0m'
ok()   { echo -e "  ${GRN}✔${NC} $1"; }
err()  { echo -e "  ${RED}✘${NC} $1"; }
info() { echo -e "  ${DIM}$1${NC}"; }

EMAIL="$1"

if [ -z "$EMAIL" ]; then
  echo ""
  echo -e "${RED}Uso:${NC} /opt/facilito/scripts/unlock-user.sh <email>"
  echo ""
  exit 1
fi

echo ""
echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLU}  FACILITO — Desbloquear usuario${NC}"
echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo ""
info "email: $EMAIL"
echo ""

# Mostrar estado actual
echo -e "${YEL}▶ Estado actual${NC}"
docker exec -i facilito_postgres psql -U facilito_admin -d facilito_db -c \
  "SELECT email, \"failedLoginAttempts\", \"lockedUntil\" FROM users WHERE email = '$EMAIL';"

echo ""
echo -e "${YEL}▶ Reseteando${NC}"
docker exec -i facilito_postgres psql -U facilito_admin -d facilito_db -c \
  "UPDATE users SET \"failedLoginAttempts\" = 0, \"lockedUntil\" = NULL WHERE email = '$EMAIL';"

RES=$(docker exec -i facilito_postgres psql -U facilito_admin -d facilito_db -tAc \
  "SELECT COUNT(*) FROM users WHERE email = '$EMAIL' AND \"failedLoginAttempts\" = 0 AND \"lockedUntil\" IS NULL;")

if [ "$RES" = "1" ]; then
  ok "usuario desbloqueado"
else
  err "no se pudo desbloquear (¿existe el email?)"
  exit 1
fi
echo ""
