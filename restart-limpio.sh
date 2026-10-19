#!/bin/bash
# ============================================================
# 🔥 Reinicio LIMPIO del frontend (mata zombies primero)
# Uso: /opt/facilito/restart-limpio.sh
# ============================================================

echo "🛑 Parando servicio..."
systemctl stop facilito-frontend.service 2>/dev/null || true

echo "🧹 Matando procesos Next.js zombie..."
pkill -9 -f "next-server" 2>/dev/null || true
pkill -9 -f "next start" 2>/dev/null || true
pkill -9 -f "pnpm start" 2>/dev/null || true
sleep 2

echo "✅ Verificando que nada escucha en 3001..."
if ss -tlnp 2>/dev/null | grep -q ":3001"; then
  echo "⚠️  Todavía algo escucha en 3001. Matando..."
  fuser -k 3001/tcp 2>/dev/null || true
  sleep 2
fi

echo "🚀 Arrancando frontend limpio..."
systemctl start facilito-frontend.service
sleep 4

if systemctl is-active --quiet facilito-frontend.service; then
  echo "✅ Frontend corriendo"
  echo ""
  echo "Chunks que sirve el frontend:"
  curl -s http://localhost:3001/ | grep -o '/_next/static/chunks/[^"]*\.js' | head -3
  echo ""
  echo "Chunks en disco:"
  ls /opt/facilito/apps/frontend/.next/static/chunks/ | head -3
  echo ""
  echo "🎉 Listo. Recargá el navegador con Ctrl+Shift+R"
else
  echo "❌ El frontend no arrancó. Revisá:"
  journalctl -u facilito-frontend.service -n 30 --no-pager
  exit 1
fi
