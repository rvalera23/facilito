#!/bin/bash
# ============================================================
# FACILITO — disable-2fa.sh
# Desactiva 2FA de un usuario (resetea totpEnabled y totpSecret).
#
# Uso:  /opt/facilito/scripts/disable-2fa.sh <email>
#       (alias: no2fa <email>)
#
# ⚠️ Usar solo cuando el usuario perdió el dispositivo 2FA
#    y no tiene backup codes.
# ============================================================

set +e

RED='\033[1;31m'; GRN='\033[1;32m'; YEL='\033[1;33m'; BLU='\033[1;34m'; DIM='\033[2m'; NC='\033[0m'
ok()   { echo -e "  ${GRN}✔${NC} $1"; }
err()  { echo -e "  ${RED}✘${NC} $1"; }
info() { echo -e "  ${DIM}$1${NC}"; }

EMAIL="$1"

if [ -z "$EMAIL" ]; then
  echo ""
  echo -e "${RED}Uso:${NC} /opt/facilito/scripts/disable-2fa.sh <email>"
  echo ""
  exit 1
fi

echo ""
echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLU}  FACILITO — Desactivar 2FA${NC}"
echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo ""
info "email: $EMAIL"
echo ""

# Mostrar estado actual
echo -e "${YEL}▶ Estado actual${NC}"
docker exec -i facilito_postgres psql -U facilito_admin -d facilito_db -c \
  "SELECT email, \"totpEnabled\" FROM users WHERE email = '$EMAIL';"

echo ""
echo -e "${YEL}▶ Desactivando 2FA${NC}"
docker exec -i facilito_postgres psql -U facilito_admin -d facilito_db -c \
  "UPDATE users SET \"totpEnabled\" = false, \"totpSecret\" = NULL WHERE email = '$EMAIL';"

RES=$(docker exec -i facilito_postgres psql -U facilito_admin -d facilito_db -tAc \
  "SELECT COUNT(*) FROM users WHERE email = '$EMAIL' AND \"totpEnabled\" = false;")

if [ "$RES" = "1" ]; then
  ok "2FA desactivado"
else
  err "no se pudo desactivar (¿existe el email?)"
  exit 1
fi
echo ""
