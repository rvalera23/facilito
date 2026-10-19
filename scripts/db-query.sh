#!/bin/bash
# ============================================================
# FACILITO — db-query.sh
# Ejecuta una query SQL y muestra el resultado.
#
# Uso:  /opt/facilito/scripts/db-query.sh "SELECT ..."
#       (alias: q "SELECT ...")
#
# Ejemplos:
#   q "SELECT COUNT(*) FROM users;"
#   q "SELECT slug, name FROM tenants LIMIT 5;"
#   q "\dt"    # lista de tablas (comillas simples si hay espacios)
# ============================================================

set +e

RED='\033[1;31m'; BLU='\033[1;34m'; DIM='\033[2m'; NC='\033[0m'

QUERY="$*"

if [ -z "$QUERY" ]; then
  echo ""
  echo -e "${RED}Uso:${NC} /opt/facilito/scripts/db-query.sh \"<SQL>\""
  echo ""
  echo -e "${DIM}Ejemplos:${NC}"
  echo -e "${DIM}  q \"SELECT COUNT(*) FROM users;\"${NC}"
  echo -e "${DIM}  q \"SELECT slug, name FROM tenants LIMIT 5;\"${NC}"
  echo ""
  exit 1
fi

echo ""
echo -e "${BLU}▶ $QUERY${NC}"
echo ""

docker exec -i facilito_postgres psql -U facilito_admin -d facilito_db -c "$QUERY"
