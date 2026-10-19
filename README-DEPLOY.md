# Deploy — Facilito

## Requisitos
- Node.js 20+
- PostgreSQL
- Redis

## Configuración
1. Copiar `.env.local` del frontend y editar `NEXT_PUBLIC_API_URL`.
2. Copiar `.env` del backend y editar `SERVER_IP`, `API_URL`, `CORS_ORIGINS`.

## Build
cd apps/backend && npm run build
cd apps/frontend && npm run build

## Servicios
systemctl restart facilito-backend.service
systemctl restart facilito-frontend.service
