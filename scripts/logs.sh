#!/bin/bash
# ============================================================
# FACILITO — logs.sh
# Muestra los últimos logs del frontend o del backend.
#
# Uso:  /opt/facilito/scripts/logs.sh frontend
#       /opt/facilito/scripts/logs.sh backend
#       /opt/facilito/scripts/logs.sh frontend 100   # 100 líneas
#
#       (alias: logs frontend / logs backend)
# ============================================================

set +e

YEL='\033[1;33m'; GRN='\033[1;32m'; RED='\033[1;31m'; BLU='\033[1;34m'; DIM='\033[2m'; NC='\033[0m'

TARGET="${1:-}"
LINES="${2:-30}"

if [ -z "$TARGET" ]; then
  echo ""
  echo -e "${RED}Uso:${NC} /opt/facilito/scripts/logs.sh <frontend|backend> [líneas]"
  echo ""
  echo -e "${DIM}Ejemplos:${NC}"
  echo -e "${DIM}  logs frontend${NC}"
  echo -e "${DIM}  logs backend 50${NC}"
  echo ""
  exit 1
fi

echo ""
echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLU}  FACILITO — Logs de $TARGET (últimas $LINES líneas)${NC}"
echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo ""

case "$TARGET" in
  frontend|fe|f)
    echo -e "${YEL}▶ journalctl -u facilito-frontend.service -n $LINES${NC}"
    echo ""
    journalctl -u facilito-frontend.service -n "$LINES" --no-pager
    echo ""
    echo -e "${YEL}▶ tail -$LINES /var/log/facilito-frontend.error.log${NC}"
    echo ""
    tail -"$LINES" /var/log/facilito-frontend.error.log 2>/dev/null || echo "(archivo no existe)"
    ;;
  backend|be|b)
    echo -e "${YEL}▶ journalctl -u facilito-backend.service -n $LINES${NC}"
    echo ""
    journalctl -u facilito-backend.service -n "$LINES" --no-pager
    ;;
  *)
    echo -e "${RED}Target inválido: '$TARGET'${NC}"
    echo -e "${DIM}Usá: frontend | backend${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${BLU}═══════════════════════════════════════════════════════════${NC}"
echo ""
