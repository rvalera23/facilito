# ============================================================
# 🔥 Regenera el cert con TODAS las IPs comunes
# Ejecutar UNA VEZ. Después el cert sirve para todas esas IPs.
# ============================================================

cd /etc/nginx/certs

# Backup
cp facilito.pem "facilito.pem.bak-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
cp facilito-key.pem "facilito-key.pem.bak-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true

# Lista de IPs comunes que podés usar en demos
mkcert -cert-file facilito.pem -key-file facilito-key.pem \
  172.16.1.16 \
  172.16.16.122 \
  172.16.16.250 \
  172.16.35.142 \
  10.0.0.5 \
  10.10.20.30 \
  192.168.0.10 \
  192.168.1.100 \
  localhost \
  127.0.0.1 \
  ::1

echo "✅ Certificado regenerado con múltiples IPs"
openssl x509 -in facilito.pem -noout -text | grep -A1 "Subject Alternative Name" | tail -1

systemctl reload nginx
systemctl restart facilito-frontend.service

echo "🎉 Listo. Ahora el cert sirve para cualquiera de esas IPs."
