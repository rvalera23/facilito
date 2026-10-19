#!/bin/bash
# ============================================================
# FACILITO — db.sh
# Abre psql interactivo a la DB de Facilito.
#
# Uso:  /opt/facilito/scripts/db.sh
#       (alias: db)
#
# Para salir: \q
# ============================================================

echo ""
echo -e "\033[1;34m═══════════════════════════════════════════════════════════\033[0m"
echo -e "\033[1;34m  FACILITO — psql interactivo (facilito_db)\033[0m"
echo -e "\033[1;34m═══════════════════════════════════════════════════════════\033[0m"
echo -e "  \033[2mEscribí \\q para salir.\033[0m"
echo -e "  \033[2mComandos útiles: \\dt (tablas), \\d tabla (estructura)\033[0m"
echo ""

docker exec -it facilito_postgres psql -U facilito_admin -d facilito_db
