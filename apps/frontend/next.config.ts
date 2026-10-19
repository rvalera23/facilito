import type { NextConfig } from 'next';

// ============================================================
// 🔥 PARSEAR EL HOSTNAME DEL BACKEND DESDE LA ENV
// ============================================================
// El hostname se usa para remotePatterns (imágenes) y allowedDevOrigins.
// Derivarlo de NEXT_PUBLIC_API_URL permite mover el deploy a otra red
// sin tocar este archivo.
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
let apiHostname = 'localhost';
try {
  apiHostname = new URL(apiUrl).hostname;
} catch {
  // apiUrl es una ruta relativa (ej: '/api'), no tiene hostname.
  // En ese caso el frontend es same-origin y no hace falta derivar
  // el hostname. No es un error, así que no se loguea.
}

// ============================================================
// 🔥 CONFIGURACIÓN PRINCIPAL DE NEXT.JS
// ============================================================
const nextConfig: NextConfig = {
  // ============================================================
  // 📌 CONFIGURACIÓN DE DESARROLLO
  // ============================================================
  
  // Permite orígenes de desarrollo específicos (para evitar CORS en local)
  // 🔥 Derivado de NEXT_PUBLIC_API_URL
  allowedDevOrigins: [apiHostname],
  
  // Ignora errores de TypeScript en build (útil para desarrollo rápido)
  typescript: {
    ignoreBuildErrors: true,
  },

  // ============================================================
  // 🖼️ OPTIMIZACIÓN DE IMÁGENES - ¡CORREGIDA!
  // ============================================================
  images: {
    // 📌 CALIDADES PERMITIDAS
    // Define todas las calidades que usas en quality={X}
    qualities: [50, 55, 60, 65, 70, 75, 85],
    
    // 📌 FORMATOS MODERNOS
    // AVIF es ~30% más ligero que WebP
    formats: ['image/avif', 'image/webp'],
    
    // 📌 PERMITIR IP LOCAL
    dangerouslyAllowLocalIP: true,
    
    // 📌 PATRONES REMOTOS PERMITIDOS
    // 🔥 Aceptamos CUALQUIER hostname para que mover el servidor a otra
    // red/IP no rompa la optimización de imágenes. Las URLs del frontend
    // son relativas (/api/uploads/...), así que el hostname real es
    // siempre el mismo origen del navegador.
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http',  hostname: '**' },
    ],
    
    // 📌 CACHÉ DE IMÁGENES - 7 días
    minimumCacheTTL: 604800,
    
    // 📌 TAMAÑOS DE DISPOSITIVO
    // - 640: Móviles pequeños
    // - 750: Móviles grandes
    // - 828: Tablets
    // - 1080: Laptops HD
    // - 1200: Escritorios estándar
    // - 1920: Escritorios grandes (necesario para banners nítidos)
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    
    // 📌 TAMAÑOS PARA ÍCONOS Y THUMBNAILS
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // ============================================================
  // 📦 HEADERS DE CACHÉ - ¡CORREGIDO!
  // ============================================================
  async headers() {
    return [
           {
        // 📌 IMÁGENES SUBIDAS - CACHÉ CONDICIONAL
        // 🔥 Las URLs reales de imágenes son /api/uploads/... porque nginx
        // mapea /api/ al backend, y el backend sirve /uploads/.
        // El header debe matchear el path que ve el navegador.
        source: '/api/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            // ✅ En desarrollo: NO cachear (para ver cambios inmediatos)
            // ✅ En producción: cachear 1 año
            value: process.env.NODE_ENV === 'production'
              ? 'public, max-age=31536000, immutable'
              : 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        // 📌 API - NO CACHEAR (datos dinámicos)
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ];
  },

  // ============================================================
  // 🗜️ COMPRESIÓN - REDUCE TAMAÑO DE ARCHIVOS
  // ============================================================
  compress: true,

  // ============================================================
  // 🧪 CONFIGURACIÓN EXPERIMENTAL
  // ============================================================
  experimental: {
    // ✅ Optimización de CSS (elimina CSS no usado)
    // optimizeCss: true,   // 🔥 DESHABILITADO — causa bug de chunks
    
    // ✅ Optimización de paquetes (carga solo lo usado)
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'date-fns',
    ],
  },

  // ============================================================
  // ⚡ TURBOPACK - CONFIGURACIÓN EN NEXT.JS 16
  // ============================================================
  turbopack: {
    resolveAlias: {},
    resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.mjs'],
    rules: {},
  },

  // ============================================================
  // 🔒 SEGURIDAD Y RENDIMIENTO
  // ============================================================
  
  // 📌 REMOVER HEADER "X-Powered-By"
  poweredByHeader: false,
  
  // 📌 MODO ESTRICTO DE REACT
  reactStrictMode: true,

  // ============================================================
  // 🔀 PROXY API → BACKEND
  // ============================================================
  // El frontend usa NEXT_PUBLIC_API_URL=/api (rutas relativas).
  // apiFetch('/delivery/...') genera '/api/delivery/...'.
  // En prod, nginx/Apache rutea /api/* → backend (sin /api).
  // En dev no existe nginx, así que Next hace el proxy.
  // El destination NO incluye /api porque el backend no tiene
  // global prefix.
  async rewrites() {
    const backend =
      process.env.BACKEND_INTERNAL_URL || 'http://localhost:3000';
    return [
      {
        source: '/api/:path*',
        destination: `${backend}/:path*`,
      },
    ];
  },
};

export default nextConfig;