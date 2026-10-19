#!/bin/bash

# Colores para que se lea mejor
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # Sin color

echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}   INICIANDO TÚNEL PÚBLICO PARA LA DEMO (Cloudflare) ${NC}"
echo -e "${CYAN}====================================================${NC}"
echo -e "${YELLOW}El enlace aparecerá en unos segundos...${NC}"
echo -e "Para cerrar la demo, presioná ${YELLOW}Ctrl + C${NC}"
echo -e ""

# Ejecuta Cloudflare Tunnel desde la ruta donde lo descargaste
# Apunta al puerto 443 con el flag para ignorar el certificado local
/opt/facilito/cloudflared tunnel --url https://localhost:443 --no-tls-verify
